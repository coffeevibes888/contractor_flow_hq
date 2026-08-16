/**
 * QuickBooks Property Manager Sync Service
 *
 * Pushes PM financial data to QuickBooks Online:
 *   - Rent payments  → QB Sales Receipts  (tenant as customer, property as class)
 *   - PM Expenses    → QB Purchases       (categorised by type)
 *   - Tenant invoices → QB Invoices       (custom charges, violations, repairs)
 *
 * Uses the existing QuickBooksConnection model (landlord-scoped) and the
 * getQuickBooksAccessToken() helper from quickbooks-service.ts which handles
 * token refresh automatically.
 *
 * QB REST API v3 docs:
 *   https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities
 */

import { prisma } from '@/db/prisma';
import { getQuickBooksAccessToken } from './quickbooks-service';

// ─── Shared QB base URL ───────────────────────────────────────────────────────

function qbBase(): string {
  const env = (process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox').toLowerCase();
  return env === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

// ─── QB API helpers ───────────────────────────────────────────────────────────

async function qbPost(landlordId: string, path: string, body: object): Promise<any> {
  const { accessToken, realmId } = await getQuickBooksAccessToken(landlordId);
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

async function qbQuery(landlordId: string, query: string): Promise<any> {
  const { accessToken, realmId } = await getQuickBooksAccessToken(landlordId);
  const url = `${qbBase()}/v3/company/${encodeURIComponent(realmId)}/query?query=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB query → ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Find or create QB Customer (tenant) ─────────────────────────────────────

async function findOrCreateQBCustomer(
  landlordId: string,
  customer: { name: string; email: string | null },
): Promise<string> {
  const safeName = customer.name.replace(/'/g, "\\'");
  const searchData = await qbQuery(
    landlordId,
    `SELECT * FROM Customer WHERE DisplayName = '${safeName}'`,
  );
  const existing = searchData?.QueryResponse?.Customer?.[0];
  if (existing) return existing.Id;

  const data = await qbPost(landlordId, '/customer', {
    DisplayName: customer.name,
    ...(customer.email ? { PrimaryEmailAddr: { Address: customer.email } } : {}),
  });
  return data?.Customer?.Id;
}

// ─── Expense category → QB account mapping ───────────────────────────────────

const PM_EXPENSE_ACCOUNT_MAP: Record<string, { value: string; name: string }> = {
  maintenance:   { value: '70', name: 'Repairs & Maintenance' },
  repairs:       { value: '70', name: 'Repairs & Maintenance' },
  utilities:     { value: '71', name: 'Utilities' },
  insurance:     { value: '72', name: 'Insurance' },
  taxes:         { value: '73', name: 'Property Taxes' },
  management:    { value: '74', name: 'Management Fees' },
  advertising:   { value: '75', name: 'Advertising' },
  legal:         { value: '76', name: 'Legal & Professional' },
  landscaping:   { value: '77', name: 'Landscaping' },
  cleaning:      { value: '78', name: 'Cleaning' },
  other:         { value: '13', name: 'Other Business Expenses' },
};

function pmExpenseAccount(category: string) {
  const key = category.toLowerCase();
  return PM_EXPENSE_ACCOUNT_MAP[key] ?? PM_EXPENSE_ACCOUNT_MAP.other;
}

// ─── Sync rent payment → QB Sales Receipt ────────────────────────────────────

export async function syncRentPaymentToQB(
  landlordId: string,
  rentPaymentId: string,
): Promise<{ success: boolean; qbPaymentId?: string; error?: string }> {
  try {
    const payment = await prisma.rentPayment.findUnique({
      where: { id: rentPaymentId },
      include: {
        tenant: { select: { name: true, email: true } },
        lease: {
          include: {
            unit: {
              include: {
                property: { select: { id: true, name: true, address: true } },
              },
            },
          },
        },
      },
    });

    if (!payment) return { success: false, error: 'Rent payment not found' };
    if (payment.status !== 'paid') return { success: false, error: 'Payment not yet paid' };
    if (payment.qbPaymentId) return { success: true, qbPaymentId: payment.qbPaymentId };

    const tenantName = payment.tenant?.name ?? 'Unknown Tenant';
    const tenantEmail = payment.tenant?.email ?? null;
    const propertyName = payment.lease?.unit?.property?.name ?? 'Property';
    const unitAddress = payment.lease?.unit?.property?.address ?? '';

    const qbCustomerId = await findOrCreateQBCustomer(landlordId, {
      name: tenantName,
      email: tenantEmail,
    });

    const paidDate = payment.paidAt
      ? new Date(payment.paidAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    // Use Sales Receipt (payment received immediately, no invoice needed)
    const data = await qbPost(landlordId, '/salesreceipt', {
      CustomerRef: { value: qbCustomerId },
      TxnDate: paidDate,
      PrivateNote: `Rent payment — ${propertyName}${unitAddress ? ` (${unitAddress})` : ''}`,
      Line: [{
        Amount: Number(payment.amount),
        DetailType: 'SalesItemLineDetail',
        Description: `Rent — ${propertyName} — ${new Date(payment.dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        SalesItemLineDetail: {
          Qty: 1,
          UnitPrice: Number(payment.amount),
        },
      }],
    });

    const qbPaymentId = data?.SalesReceipt?.Id;
    if (!qbPaymentId) return { success: false, error: 'QB did not return a receipt ID' };

    await prisma.rentPayment.update({
      where: { id: rentPaymentId },
      data: { qbPaymentId },
    });

    return { success: true, qbPaymentId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Sync PM expense → QB Purchase ───────────────────────────────────────────

export async function syncPMExpenseToQB(
  landlordId: string,
  expenseId: string,
): Promise<{ success: boolean; qbExpenseId?: string; error?: string }> {
  try {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, landlordId },
      include: {
        property: { select: { name: true } },
      },
    });

    if (!expense) return { success: false, error: 'Expense not found' };
    if (expense.qbExpenseId) return { success: true, qbExpenseId: expense.qbExpenseId };

    const account = pmExpenseAccount(expense.category);
    const description = [
      expense.description,
      expense.property?.name,
    ].filter(Boolean).join(' — ');

    const data = await qbPost(landlordId, '/purchase', {
      PaymentType: 'Cash',
      AccountRef: { value: '1', name: 'Checking' },
      TxnDate: new Date(expense.incurredAt).toISOString().slice(0, 10),
      Line: [{
        Amount: Number(expense.amount),
        DetailType: 'AccountBasedExpenseLineDetail',
        AccountBasedExpenseLineDetail: { AccountRef: account },
        Description: description || expense.category,
      }],
      ...(expense.vendor ? { EntityRef: { name: expense.vendor, type: 'Vendor' } } : {}),
    });

    const qbExpenseId = data?.Purchase?.Id;
    if (!qbExpenseId) return { success: false, error: 'QB did not return a purchase ID' };

    await prisma.expense.update({
      where: { id: expenseId },
      data: { qbExpenseId },
    });

    return { success: true, qbExpenseId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Full PM sync ─────────────────────────────────────────────────────────────

export async function runFullPMQBSync(landlordId: string): Promise<{
  rentPaymentsSynced: number;
  rentPaymentsFailed: number;
  expensesSynced: number;
  expensesFailed: number;
  errors: string[];
  syncedAt: string;
}> {
  const errors: string[] = [];
  let rentPaymentsSynced = 0, rentPaymentsFailed = 0;
  let expensesSynced = 0, expensesFailed = 0;

  // ── Rent payments (paid, not yet synced) ──────────────────────────────────
  const rentPayments = await prisma.rentPayment.findMany({
    where: {
      lease: { unit: { property: { landlordId } } },
      status: 'paid',
      qbPaymentId: null,
    },
    select: { id: true },
    take: 200,
    orderBy: { paidAt: 'desc' },
  });

  for (const rp of rentPayments) {
    const r = await syncRentPaymentToQB(landlordId, rp.id);
    if (r.success) rentPaymentsSynced++;
    else { rentPaymentsFailed++; errors.push(`Rent payment ${rp.id}: ${r.error}`); }
  }

  // ── PM Expenses (not yet synced) ──────────────────────────────────────────
  const expenses = await prisma.expense.findMany({
    where: { landlordId, qbExpenseId: null },
    select: { id: true, description: true },
    take: 200,
    orderBy: { incurredAt: 'desc' },
  });

  for (const exp of expenses) {
    const r = await syncPMExpenseToQB(landlordId, exp.id);
    if (r.success) expensesSynced++;
    else { expensesFailed++; errors.push(`Expense "${exp.description}": ${r.error}`); }
  }

  // ── Stamp last sync time ──────────────────────────────────────────────────
  const syncedAt = new Date().toISOString();
  await (prisma as any).quickBooksConnection.update({
    where: { landlordId },
    data: { lastSyncAt: new Date() },
  });

  return {
    rentPaymentsSynced,
    rentPaymentsFailed,
    expensesSynced,
    expensesFailed,
    errors,
    syncedAt,
  };
}

// ─── Get PM sync status ───────────────────────────────────────────────────────

export async function getPMQBSyncStatus(landlordId: string): Promise<{
  connected: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
  companyName: string | null;
  pendingSync: { rentPayments: number; expenses: number; total: number };
}> {
  const conn = await (prisma as any).quickBooksConnection.findUnique({
    where: { landlordId },
    select: { connectedAt: true, realmId: true, lastSyncAt: true, companyName: true },
  });

  const connected = Boolean(conn?.connectedAt && conn?.realmId);

  const [pendingRent, pendingExpenses] = connected
    ? await Promise.all([
        prisma.rentPayment.count({
          where: {
            lease: { unit: { property: { landlordId } } },
            status: 'paid',
            qbPaymentId: null,
          },
        }),
        prisma.expense.count({
          where: { landlordId, qbExpenseId: null },
        }),
      ])
    : [0, 0];

  return {
    connected,
    connectedAt: conn?.connectedAt?.toISOString() ?? null,
    lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
    companyName: conn?.companyName ?? null,
    pendingSync: {
      rentPayments: pendingRent,
      expenses: pendingExpenses,
      total: pendingRent + pendingExpenses,
    },
  };
}
