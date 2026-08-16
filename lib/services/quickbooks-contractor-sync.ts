/**
 * QuickBooks Contractor Sync Service
 *
 * Pushes contractor financial data to QuickBooks Online:
 *   - ContractorInvoices  → QB Invoices  (line items, customer, due date)
 *   - ContractorExpenses  → QB Purchases (categorised by type)
 *
 * Token management uses ContractorQBConnection (separate from the PM-side
 * QuickBooksConnection so each contractor has their own QB company).
 *
 * QB REST API v3 docs:
 *   https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities
 */

import { prisma } from '@/db/prisma';
import { decryptField, encryptField } from '@/lib/encrypt';
import OAuthClient from 'intuit-oauth';

// ─── Shared QB base URL ───────────────────────────────────────────────────────

function qbBase(): string {
  const env = (process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox').toLowerCase();
  return env === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

// ─── Token management ─────────────────────────────────────────────────────────

export async function getContractorQBToken(
  contractorId: string,
): Promise<{ accessToken: string; realmId: string }> {
  const conn = await prisma.contractorQBConnection.findUnique({
    where: { contractorId },
  });

  if (!conn?.realmId || !conn.accessTokenEncrypted || !conn.refreshTokenEncrypted) {
    throw new Error('QuickBooks not connected for this contractor');
  }

  const accessToken = await decryptField(conn.accessTokenEncrypted);
  const refreshToken = await decryptField(conn.refreshTokenEncrypted);

  const isExpired = conn.accessTokenExpiresAt
    ? conn.accessTokenExpiresAt.getTime() <= Date.now() + 60_000
    : true;

  if (!isExpired) return { accessToken, realmId: conn.realmId };

  // Refresh the token
  const oauthClient = new OAuthClient({
    clientId: process.env.QUICKBOOKS_CLIENT_ID!,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
    environment: (process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox') as any,
    redirectUri:
      process.env.QUICKBOOKS_CONTRACTOR_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/contractor/quickbooks/callback`,
  });

  oauthClient.setToken({ access_token: accessToken, refresh_token: refreshToken } as any);
  const refreshed = await oauthClient.refresh();
  const json = refreshed.getJson();

  const newAccess = json.access_token as string;
  const newRefresh = json.refresh_token as string;
  const newExpiresAt = new Date(Date.now() + (json.expires_in as number) * 1000);

  await prisma.contractorQBConnection.update({
    where: { contractorId },
    data: {
      accessTokenEncrypted: await encryptField(newAccess),
      refreshTokenEncrypted: await encryptField(newRefresh),
      accessTokenExpiresAt: newExpiresAt,
    },
  });

  return { accessToken: newAccess, realmId: conn.realmId };
}

// ─── QB API helper ────────────────────────────────────────────────────────────

async function qbPost(
  contractorId: string,
  path: string,
  body: object,
): Promise<any> {
  const { accessToken, realmId } = await getContractorQBToken(contractorId);
  const url = `${qbBase()}/v3/company/${encodeURIComponent(realmId)}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function qbQuery(
  contractorId: string,
  query: string,
): Promise<any> {
  const { accessToken, realmId } = await getContractorQBToken(contractorId);
  const url = `${qbBase()}/v3/company/${encodeURIComponent(realmId)}/query?query=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB query failed → ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Find or create QB Customer ───────────────────────────────────────────────

async function findOrCreateQBCustomer(
  contractorId: string,
  customer: { name: string; email: string | null; phone: string | null },
): Promise<string> {
  // Search by display name
  const safeName = customer.name.replace(/'/g, "\\'");
  const searchData = await qbQuery(
    contractorId,
    `SELECT * FROM Customer WHERE DisplayName = '${safeName}'`,
  );
  const existing = searchData?.QueryResponse?.Customer?.[0];
  if (existing) return existing.Id;

  // Create
  const data = await qbPost(contractorId, '/customer', {
    DisplayName: customer.name,
    ...(customer.email ? { PrimaryEmailAddr: { Address: customer.email } } : {}),
    ...(customer.phone ? { PrimaryPhone: { FreeFormNumber: customer.phone } } : {}),
  });
  return data?.Customer?.Id;
}

// ─── Expense category → QB account mapping ───────────────────────────────────

const EXPENSE_ACCOUNT_MAP: Record<string, { value: string; name: string }> = {
  materials:     { value: '64', name: 'Job Materials' },
  tools:         { value: '65', name: 'Tools & Equipment' },
  fuel:          { value: '66', name: 'Fuel' },
  permits:       { value: '67', name: 'Permits & Licenses' },
  subcontractor: { value: '68', name: 'Subcontractors' },
  labor:         { value: '60', name: 'Labor' },
  other:         { value: '13', name: 'Other Business Expenses' },
};

function expenseAccount(category: string) {
  const key = category.toLowerCase();
  return EXPENSE_ACCOUNT_MAP[key] ?? EXPENSE_ACCOUNT_MAP.other;
}

// ─── Sync single invoice ──────────────────────────────────────────────────────

export async function syncContractorInvoiceToQB(
  contractorId: string,
  invoiceId: string,
): Promise<{ success: boolean; qbInvoiceId?: string; error?: string }> {
  try {
    const invoice = await prisma.contractorInvoice.findFirst({
      where: { id: invoiceId, contractorId },
    });

    if (!invoice) return { success: false, error: 'Invoice not found' };
    if (invoice.qbInvoiceId) return { success: true, qbInvoiceId: invoice.qbInvoiceId };

    const customer = await prisma.contractorCustomer.findUnique({
      where: { id: invoice.customerId },
      select: { name: true, email: true, phone: true },
    });

    const qbCustomerId = await findOrCreateQBCustomer(contractorId, {
      name: customer?.name ?? 'Unknown Customer',
      email: customer?.email ?? null,
      phone: customer?.phone ?? null,
    });

    const lineItems = (invoice.lineItems as any[]).map((li: any, i: number) => ({
      Id: String(i + 1),
      LineNum: i + 1,
      Description: li.description,
      Amount: Number(li.quantity) * Number(li.unitPrice),
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        Qty: Number(li.quantity),
        UnitPrice: Number(li.unitPrice),
      },
    }));

    const data = await qbPost(contractorId, '/invoice', {
      Line: lineItems,
      CustomerRef: { value: qbCustomerId },
      DueDate: new Date(invoice.dueDate).toISOString().slice(0, 10),
      DocNumber: invoice.invoiceNumber,
      ...(invoice.notes ? { CustomerMemo: { value: invoice.notes } } : {}),
    });

    const qbInvoiceId = data?.Invoice?.Id;
    if (!qbInvoiceId) return { success: false, error: 'QB did not return an invoice ID' };

    await prisma.contractorInvoice.update({
      where: { id: invoiceId },
      data: { qbInvoiceId },
    });

    return { success: true, qbInvoiceId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Sync single expense ──────────────────────────────────────────────────────

export async function syncContractorExpenseToQB(
  contractorId: string,
  expenseId: string,
): Promise<{ success: boolean; qbPurchaseId?: string; error?: string }> {
  try {
    const expense = await prisma.contractorExpense.findFirst({
      where: { id: expenseId, contractorId },
    });

    if (!expense) return { success: false, error: 'Expense not found' };
    if (expense.qbPurchaseId) return { success: true, qbPurchaseId: expense.qbPurchaseId };

    const account = expenseAccount(expense.category);

    const data = await qbPost(contractorId, '/purchase', {
      PaymentType: 'Cash',
      AccountRef: { value: '1', name: 'Checking' },
      Line: [{
        Amount: Number(expense.amount),
        DetailType: 'AccountBasedExpenseLineDetail',
        AccountBasedExpenseLineDetail: { AccountRef: account },
        Description: expense.description || expense.category,
      }],
      TxnDate: new Date(expense.expenseDate).toISOString().slice(0, 10),
      ...(expense.vendor ? { EntityRef: { name: expense.vendor } } : {}),
    });

    const qbPurchaseId = data?.Purchase?.Id;
    if (!qbPurchaseId) return { success: false, error: 'QB did not return a purchase ID' };

    await prisma.contractorExpense.update({
      where: { id: expenseId },
      data: { qbPurchaseId },
    });

    return { success: true, qbPurchaseId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Full sync ────────────────────────────────────────────────────────────────

export async function runFullContractorQBSync(contractorId: string): Promise<{
  invoicesSynced: number;
  invoicesFailed: number;
  expensesSynced: number;
  expensesFailed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let invoicesSynced = 0, invoicesFailed = 0;
  let expensesSynced = 0, expensesFailed = 0;

  // Unsynced invoices (sent, viewed, partial, paid)
  const invoices = await prisma.contractorInvoice.findMany({
    where: {
      contractorId,
      status: { in: ['sent', 'viewed', 'partial', 'paid'] },
      qbInvoiceId: null,
    },
    select: { id: true, invoiceNumber: true },
    take: 100,
  });

  for (const inv of invoices) {
    const r = await syncContractorInvoiceToQB(contractorId, inv.id);
    if (r.success) invoicesSynced++;
    else { invoicesFailed++; errors.push(`Invoice ${inv.invoiceNumber}: ${r.error}`); }
  }

  // Unsynced expenses (approved or pending — not rejected)
  const expenses = await prisma.contractorExpense.findMany({
    where: {
      contractorId,
      qbPurchaseId: null,
      status: { not: 'rejected' },
    },
    select: { id: true, description: true },
    take: 100,
  });

  for (const exp of expenses) {
    const r = await syncContractorExpenseToQB(contractorId, exp.id);
    if (r.success) expensesSynced++;
    else { expensesFailed++; errors.push(`Expense "${exp.description}": ${r.error}`); }
  }

  // Stamp last sync time
  await prisma.contractorQBConnection.update({
    where: { contractorId },
    data: { lastSyncAt: new Date() },
  });

  return { invoicesSynced, invoicesFailed, expensesSynced, expensesFailed, errors };
}
