/**
 * General Ledger (GL) — core double-entry bookkeeping primitives.
 *
 * Every financial event in PropertyFlow eventually posts a balanced
 * JournalEntry (sum of debits == sum of credits) made up of JournalLines.
 * This is the foundation we use to compute Trial Balance, P&L, Balance
 * Sheet, and per-tenant / per-owner ledgers.
 *
 *   postJournalEntry   — atomic balanced-entry insert with validation
 *   ensureChartOfAccounts — idempotent landlord chart bootstrap
 *   getAccountBalance  — single account balance, optionally over a date range
 *   getTrialBalance    — full trial balance at a point in time
 *   reverseJournalEntry — creates a reversing entry (idempotent)
 *   findAccount        — lookup by code (auto-creates landlord chart if needed)
 *
 * Tier-gated: callers are responsible for checking `tier >= 'pro'` first.
 * The functions below are safe to call for any landlord, but if a landlord
 * hasn't opted in we still allow the post — it's a no-op for the dashboard
 * (rollup analytics keeps using the raw Expense / RentPayment tables).
 */

import { Prisma, type PrismaClient, AccountType } from '@prisma/client';
import { prisma as db } from '@/db/prisma';
import {
  STANDARD_CHART_OF_ACCOUNTS,
  mapExpenseCategoryToAccountCode,
  DEFAULT_CASH_ACCOUNT_CODE,
  DEFAULT_AR_ACCOUNT_CODE,
  DEFAULT_RENT_INCOME_ACCOUNT_CODE,
  DEFAULT_LATE_FEE_INCOME_ACCOUNT_CODE,
  DEFAULT_SECURITY_DEPOSIT_CASH_CODE,
  DEFAULT_SECURITY_DEPOSIT_LIABILITY_CODE,
} from './chart-of-accounts';

/** Decimal arithmetic helper — Prisma returns Decimal objects; we want numbers. */
function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  return Number(d.toString());
}

export interface JournalLineInput {
  accountCode: string;       // chart-of-accounts code, e.g. "1100"
  debit?: number;            // dollars
  credit?: number;           // dollars
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  ownerId?: string;
  memo?: string;
}

export interface PostJournalEntryInput {
  landlordId: string;
  effectiveDate: Date;
  memo?: string;
  source: 'rent_payment' | 'expense' | 'maintenance' | 'owner_distribution' | 'owner_payout' | 'opening_balance' | 'manual_adjustment' | 'system' | 'tenant_credit';
  sourceId?: string;
  createdBy?: string;
  lines: JournalLineInput[];
  /** Optional: skip the post and just return null (used by opt-in flag) */
  skipIfOptedOut?: boolean;
  /** Optional: tx client so the caller can include the post in a larger transaction. */
  tx?: PrismaClient | Prisma.TransactionClient;
}

export interface PostJournalEntryResult {
  entryId: string;
  lines: Array<{ id: string; accountCode: string; debit: number; credit: number }>;
}

/** Idempotent: copy the system template into a landlord-scoped chart. */
export async function ensureChartOfAccounts(landlordId: string, tx?: Prisma.TransactionClient): Promise<number> {
  const c = (tx ?? (db as unknown as PrismaClient));

  const existing = await c.chartOfAccount.count({ where: { landlordId } });
  if (existing > 0) return existing;

  // First, create parent accounts (the 1000, 2000, etc. headers)
  const parents: Record<string, string> = {};
  for (const tpl of STANDARD_CHART_OF_ACCOUNTS.filter((a) => a.code.endsWith('000'))) {
    const created = await c.chartOfAccount.create({
      data: {
        landlordId,
        code: tpl.code,
        name: tpl.name,
        type: tpl.type,
        subType: tpl.subType,
        taxLine: tpl.taxLine,
        description: tpl.description,
        isSystem: true,
      },
    });
    parents[tpl.code] = created.id;
  }

  // Then children
  for (const tpl of STANDARD_CHART_OF_ACCOUNTS.filter((a) => !a.code.endsWith('000'))) {
    const parentCode = `${tpl.code[0]}000`;
    await c.chartOfAccount.create({
      data: {
        landlordId,
        code: tpl.code,
        name: tpl.name,
        type: tpl.type,
        subType: tpl.subType,
        taxLine: tpl.taxLine,
        description: tpl.description,
        parentId: parents[parentCode] ?? null,
        isSystem: true,
      },
    });
  }

  return STANDARD_CHART_OF_ACCOUNTS.length;
}

/** Look up an account by its code, auto-creating the chart if missing. */
export async function findAccount(
  landlordId: string,
  code: string,
  tx?: Prisma.TransactionClient,
): Promise<{ id: string; code: string; name: string; type: AccountType } | null> {
  const c = (tx ?? (db as unknown as PrismaClient));

  let account = await c.chartOfAccount.findUnique({
    where: { landlordId_code: { landlordId, code } },
  });
  if (!account) {
    // First lookup in this landlord — bootstrap the chart.
    await ensureChartOfAccounts(landlordId, tx);
    account = await c.chartOfAccount.findUnique({
      where: { landlordId_code: { landlordId, code } },
    });
  }
  if (!account) {
    // Last resort: look in the system template (landlordId = null).
    account = await c.chartOfAccount.findFirst({
      where: { landlordId: null, code },
    });
  }
  return account ? { id: account.id, code: account.code, name: account.name, type: account.type } : null;
}

/** Post a balanced journal entry. Throws on imbalance. */
export async function postJournalEntry(input: PostJournalEntryInput): Promise<PostJournalEntryResult | null> {
  if (input.lines.length < 2) {
    throw new Error('Journal entry must have at least 2 lines');
  }

  // Validate debit/credit sum
  const totalDebit  = input.lines.reduce((s, l) => s + Number(l.debit  ?? 0), 0);
  const totalCredit = input.lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Unbalanced journal entry: debits ${totalDebit.toFixed(2)} != credits ${totalCredit.toFixed(2)}`,
    );
  }
  if (totalDebit === 0) {
    throw new Error('Journal entry has zero total');
  }

  const c = (input.tx ?? (db as unknown as PrismaClient));

  // Resolve account codes → ids, lazily creating the chart if needed.
  const accountIds: string[] = [];
  for (const line of input.lines) {
    const acct = await findAccount(input.landlordId, line.accountCode, input.tx);
    if (!acct) {
      throw new Error(`Unknown account code: ${line.accountCode}`);
    }
    accountIds.push(acct.id);
  }

  // Find or create the fiscal period for this date.
  const period = await ensureFiscalPeriod(input.landlordId, input.effectiveDate, input.tx);

  // Create the entry
  const entry = await c.journalEntry.create({
    data: {
      landlordId: input.landlordId,
      periodId: period?.id,
      effectiveDate: input.effectiveDate,
      memo: input.memo,
      source: input.source,
      sourceId: input.sourceId,
      createdBy: input.createdBy,
      lines: {
        create: input.lines.map((l, i) => ({
          accountId: accountIds[i],
          debit: l.debit  ?? 0,
          credit: l.credit ?? 0,
          propertyId: l.propertyId,
          unitId: l.unitId,
          tenantId: l.tenantId,
          ownerId: l.ownerId,
          memo: l.memo,
        })),
      },
    },
    include: { lines: { include: { account: { select: { code: true } } } } },
  });

  return {
    entryId: entry.id,
    lines: entry.lines.map((l) => ({
      id: l.id,
      accountCode: l.account.code,
      debit: toNum(l.debit),
      credit: toNum(l.credit),
    })),
  };
}

/** Find or create the fiscal period containing the given date. */
export async function ensureFiscalPeriod(
  landlordId: string,
  date: Date,
  tx?: Prisma.TransactionClient,
) {
  const c = (tx ?? (db as unknown as PrismaClient));
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

  const existing = await c.fiscalPeriod.findUnique({
    where: { landlordId_startDate: { landlordId, startDate: start } },
  });
  if (existing) return existing;
  return c.fiscalPeriod.create({
    data: {
      landlordId,
      startDate: start,
      endDate: end,
      status: 'open',
    },
  });
}

/** Single account balance (debit - credit for asset/expense, credit - debit for liability/equity/income). */
export async function getAccountBalance(
  landlordId: string,
  accountCode: string,
  opts: { asOf?: Date; fromDate?: Date; toDate?: Date; tx?: Prisma.TransactionClient } = {},
): Promise<number> {
  const c = (opts.tx ?? (db as unknown as PrismaClient));
  const acct = await findAccount(landlordId, accountCode, opts.tx);
  if (!acct) return 0;

  const where: Prisma.JournalLineWhereInput = {
    accountId: acct.id,
    entry: { landlordId },
  };
  if (opts.fromDate || opts.asOf || opts.toDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (opts.fromDate) dateFilter.gte = opts.fromDate;
    if (opts.asOf)      dateFilter.lte = opts.asOf;
    if (opts.toDate)    dateFilter.lte = opts.toDate;
    where.entry = { landlordId, effectiveDate: dateFilter };
  }

  const agg = await c.journalLine.aggregate({
    where,
    _sum: { debit: true, credit: true },
  });
  const debit  = toNum(agg._sum.debit);
  const credit = toNum(agg._sum.credit);

  // Normal-balance sign:
  //   assets, expenses          → debit-positive (debit - credit)
  //   liabilities, equity, income → credit-positive (credit - debit)
  if (acct.type === 'asset' || acct.type === 'expense') {
    return debit - credit;
  }
  return credit - debit;
}

/** Trial Balance at a point in time. Returns one row per account that has activity. */
export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export async function getTrialBalance(
  landlordId: string,
  asOf: Date = new Date(),
  tx?: Prisma.TransactionClient,
): Promise<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; balanced: boolean }> {
  const c = (tx ?? (db as unknown as PrismaClient));

  // Sum all lines up to asOf, grouped by account
  const grouped = await c.journalLine.groupBy({
    by: ['accountId'],
    where: {
      entry: { landlordId, effectiveDate: { lte: asOf } },
    },
    _sum: { debit: true, credit: true },
  });

  if (grouped.length === 0) {
    return { rows: [], totalDebit: 0, totalCredit: 0, balanced: true };
  }

  const accountIds = grouped.map((g) => g.accountId);
  const accounts = await c.chartOfAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true, type: true },
  });
  const acctMap = new Map(accounts.map((a) => [a.id, a]));

  const rows: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const g of grouped) {
    const acct = acctMap.get(g.accountId);
    if (!acct) continue;
    const debit  = toNum(g._sum.debit);
    const credit = toNum(g._sum.credit);
    if (debit === 0 && credit === 0) continue;

    // Show the natural-balance side; the other side is implicit.
    if (acct.type === 'asset' || acct.type === 'expense') {
      rows.push({ accountId: acct.id, code: acct.code, name: acct.name, type: acct.type, debit: Math.max(0, debit - credit), credit: 0 });
      totalDebit += Math.max(0, debit - credit);
    } else {
      rows.push({ accountId: acct.id, code: acct.code, name: acct.name, type: acct.type, debit: 0, credit: Math.max(0, credit - debit) });
      totalCredit += Math.max(0, credit - debit);
    }
  }

  rows.sort((a, b) => a.code.localeCompare(b.code));

  return {
    rows,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

/** Reverse an existing journal entry by posting an equal-and-opposite entry. */
export async function reverseJournalEntry(
  entryId: string,
  reason: string,
  reversedBy?: string,
  tx?: Prisma.TransactionClient,
): Promise<{ id: string; entryId: string } | null> {
  const c = (tx ?? (db as unknown as PrismaClient));

  const original = await c.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: { include: { account: { select: { code: true } } } } },
  });
  if (!original) return null;
  if (original.isReversing) {
    throw new Error('Cannot reverse a reversing entry directly — reverse the original it cancelled instead');
  }
  if (original.reversedById) {
    // Already reversed — return that one (idempotent)
    return { id: original.reversedById, entryId };
  }

  const period = await ensureFiscalPeriod(original.landlordId, new Date(), tx);
  const reversing = await c.journalEntry.create({
    data: {
      landlordId: original.landlordId,
      periodId: period?.id,
      effectiveDate: new Date(),
      memo: `REVERSAL of ${original.id}: ${reason}`,
      source: original.source,
      sourceId: original.sourceId ?? undefined,
      isReversing: true,
      createdBy: reversedBy,
      lines: {
        create: original.lines.map((l) => ({
          accountId: l.accountId,
          // Swap debit and credit
          debit: l.credit,
          credit: l.debit,
          propertyId: l.propertyId,
          unitId: l.unitId,
          tenantId: l.tenantId,
          ownerId: l.ownerId,
          memo: l.memo,
        })),
      },
    },
  });

  await c.journalEntry.update({
    where: { id: original.id },
    data: { reversedById: reversing.id },
  });

  return { id: reversing.id, entryId };
}

// ─── Higher-level posting helpers ─────────────────────────────────────

/**
 * Post a rent payment receipt.
 *
 *   DR  1100  Cash — Operating       (gross)
 *   CR  4000  Rental Income
 *   CR  4010  Late Fee Income        (if any late fee is included)
 */
export async function postRentPaymentReceipt(
  landlordId: string,
  rentPaymentId: string,
  amount: number,
  lateFeeAmount: number,
  effectiveDate: Date,
  ctx: {
    propertyId: string;
    unitId: string;
    tenantId: string;
    createdBy?: string;
    tx?: Prisma.TransactionClient;
  },
): Promise<PostJournalEntryResult | null> {
  if (amount <= 0) return null;

  const rentPortion = Math.max(0, amount - lateFeeAmount);
  const lines: JournalLineInput[] = [
    { accountCode: DEFAULT_CASH_ACCOUNT_CODE,        debit: amount, propertyId: ctx.propertyId, unitId: ctx.unitId, tenantId: ctx.tenantId, memo: 'Rent received' },
  ];
  if (rentPortion > 0) {
    lines.push({ accountCode: DEFAULT_RENT_INCOME_ACCOUNT_CODE, credit: rentPortion, propertyId: ctx.propertyId, unitId: ctx.unitId, tenantId: ctx.tenantId, memo: 'Rental income' });
  }
  if (lateFeeAmount > 0) {
    lines.push({ accountCode: DEFAULT_LATE_FEE_INCOME_ACCOUNT_CODE, credit: lateFeeAmount, propertyId: ctx.propertyId, unitId: ctx.unitId, tenantId: ctx.tenantId, memo: 'Late fee' });
  }

  return postJournalEntry({
    landlordId,
    effectiveDate,
    memo: `Rent payment received — ${ctx.tenantId.slice(0, 8)}`,
    source: 'rent_payment',
    sourceId: rentPaymentId,
    createdBy: ctx.createdBy,
    lines,
    tx: ctx.tx,
  });
}

/**
 * Post an expense (landlord paid out of pocket or via ACH).
 *
 *   DR  5xxx  Expense account     (from category)
 *   CR  1100  Cash — Operating
 */
export async function postExpense(
  landlordId: string,
  expenseId: string,
  amount: number,
  expenseCategory: string,
  effectiveDate: Date,
  ctx: {
    propertyId?: string;
    unitId?: string;
    createdBy?: string;
    tx?: Prisma.TransactionClient;
  },
): Promise<PostJournalEntryResult | null> {
  if (amount <= 0) return null;
  const expenseAccountCode = mapExpenseCategoryToAccountCode(expenseCategory);

  return postJournalEntry({
    landlordId,
    effectiveDate,
    memo: `Expense: ${expenseCategory}`,
    source: 'expense',
    sourceId: expenseId,
    createdBy: ctx.createdBy,
    lines: [
      { accountCode: expenseAccountCode, debit: amount, propertyId: ctx.propertyId, unitId: ctx.unitId, memo: expenseCategory },
      { accountCode: DEFAULT_CASH_ACCOUNT_CODE, credit: amount, propertyId: ctx.propertyId, unitId: ctx.unitId, memo: 'Cash paid' },
    ],
    tx: ctx.tx,
  });
}

/**
 * Post a security deposit receipt (held in trust).
 *
 *   DR  1110  Cash — Security Deposits
 *   CR  2100  Security Deposits Liability
 */
export async function postSecurityDepositReceipt(
  landlordId: string,
  rentPaymentId: string,
  amount: number,
  effectiveDate: Date,
  ctx: { propertyId: string; unitId: string; tenantId: string; createdBy?: string; tx?: Prisma.TransactionClient },
): Promise<PostJournalEntryResult | null> {
  if (amount <= 0) return null;
  return postJournalEntry({
    landlordId,
    effectiveDate,
    memo: 'Security deposit received (held in trust)',
    source: 'rent_payment',
    sourceId: rentPaymentId,
    createdBy: ctx.createdBy,
    lines: [
      { accountCode: DEFAULT_SECURITY_DEPOSIT_CASH_CODE, debit: amount, propertyId: ctx.propertyId, unitId: ctx.unitId, tenantId: ctx.tenantId },
      { accountCode: DEFAULT_SECURITY_DEPOSIT_LIABILITY_CODE, credit: amount, propertyId: ctx.propertyId, unitId: ctx.unitId, tenantId: ctx.tenantId },
    ],
    tx: ctx.tx,
  });
}

/** Convenience: list all the standard codes by type (used by the admin UI). */
export function getStandardAccountCodes(type?: AccountType): string[] {
  return STANDARD_CHART_OF_ACCOUNTS.filter((a) => !type || a.type === type).map((a) => a.code);
}

export { DEFAULT_CASH_ACCOUNT_CODE, DEFAULT_AR_ACCOUNT_CODE, DEFAULT_RENT_INCOME_ACCOUNT_CODE, DEFAULT_LATE_FEE_INCOME_ACCOUNT_CODE, DEFAULT_SECURITY_DEPOSIT_CASH_CODE, DEFAULT_SECURITY_DEPOSIT_LIABILITY_CODE };
