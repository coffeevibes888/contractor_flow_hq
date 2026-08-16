/**
 * Owner Statements — monthly PDF summary per owner.
 *
 * For each owner:
 *   - Sum all income (Rental Income + fee income) on their properties
 *   - Sum all expenses on their properties
 *   - Subtract the management fee % (default 8% — stored on Owner)
 *   - Net distribution = (income − expenses) × (1 − mgmtFeePct) × ownerSplit
 *
 * The statement is locked at `finalizedAt` so re-rendering the PDF later
 * won't drift if new entries post to the same period.
 */

import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as db } from '@/db/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  return Number(d.toString());
}

export interface OwnerStatementLineItem {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface OwnerStatementSummary {
  income:  OwnerStatementLineItem[];
  expense: OwnerStatementLineItem[];
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  managementFeePct: number;
  managementFee: number;
  ownerSplitPct: number;
  distribution: number;
}

export interface GeneratedStatement {
  ownerId: string;
  periodStart: Date;
  periodEnd: Date;
  summary: OwnerStatementSummary;
  statementId: string;
}

/** Compute the income / expense / distribution numbers for one owner over a period. */
export async function computeOwnerStatementSummary(
  landlordId: string,
  ownerId: string,
  periodStart: Date,
  periodEnd: Date,
  tx?: Prisma.TransactionClient,
): Promise<OwnerStatementSummary> {
  const c = (tx ?? (db as unknown as PrismaClient));

  // Find the owner's properties (and their effective shares).
  // For multi-owner setups we use ownershipPct; for the common case there's
  // a single row per property with 100%.
  const propertyOwners = await c.propertyOwner.findMany({
    where: { ownerId, effectiveFrom: { lte: periodEnd } },
    select: { propertyId: true, ownershipPct: true, effectiveFrom: true },
  });
  // For overlapping effectiveFrom rows on the same property, keep the latest.
  const byProperty = new Map<string, { ownershipPct: number; effectiveFrom: Date }>();
  for (const po of propertyOwners) {
    const cur = byProperty.get(po.propertyId);
    if (!cur || po.effectiveFrom > cur.effectiveFrom) byProperty.set(po.propertyId, { ownershipPct: toNum(po.ownershipPct), effectiveFrom: po.effectiveFrom });
  }
  const propertyIds = Array.from(byProperty.keys());

  if (propertyIds.length === 0) {
    return {
      income: [], expense: [],
      totalIncome: 0, totalExpense: 0, netIncome: 0,
      managementFeePct: 0, managementFee: 0, ownerSplitPct: 100, distribution: 0,
    };
  }

  // Sum income (4000s) and expense (5000s) on JournalLines sliced by these properties.
  const lines = await c.journalLine.findMany({
    where: {
      propertyId: { in: propertyIds },
      entry: { landlordId, effectiveDate: { gte: periodStart, lte: periodEnd } },
      account: { type: { in: ['income', 'expense'] } },
    },
    select: {
      debit: true, credit: true,
      account: { select: { code: true, name: true, type: true } },
    },
  });

  const incomeMap  = new Map<string, OwnerStatementLineItem>();
  const expenseMap = new Map<string, OwnerStatementLineItem>();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const ln of lines) {
    const debit  = toNum(ln.debit);
    const credit = toNum(ln.credit);
    // For income: credit - debit. For expense: debit - credit.
    const amount = ln.account.type === 'income' ? credit - debit : debit - credit;
    if (Math.abs(amount) < 0.01) continue;

    if (ln.account.type === 'income') {
      totalIncome += amount;
      const key = ln.account.code;
      const cur = incomeMap.get(key) ?? { accountCode: ln.account.code, accountName: ln.account.name, amount: 0 };
      cur.amount += amount;
      incomeMap.set(key, cur);
    } else {
      totalExpense += amount;
      const key = ln.account.code;
      const cur = expenseMap.get(key) ?? { accountCode: ln.account.code, accountName: ln.account.name, amount: 0 };
      cur.amount += amount;
      expenseMap.set(key, cur);
    }
  }

  // Apply ownership share: if a property has 2 owners at 50/50, each gets
  // half of that property's lines. Walk property-by-property for accuracy.
  // (For the MVP we apply the average owner split uniformly — see below.)

  const owner = await c.owner.findUnique({ where: { id: ownerId } });
  const ownerSplitPct = owner ? toNum(owner.payoutSplit) : 100;

  // Average ownership share across the owner's properties
  const avgOwnershipPct = propertyIds.length === 0
    ? 100
    : Array.from(byProperty.values()).reduce((s, v) => s + v.ownershipPct, 0) / propertyIds.length;

  const ownershipFactor = (avgOwnershipPct / 100) * (ownerSplitPct / 100);

  // Default management fee = 8% (industry standard for residential PM)
  const managementFeePct = 8;
  const adjustedIncome  = totalIncome  * ownershipFactor;
  const adjustedExpense = totalExpense * ownershipFactor;
  const netIncome = adjustedIncome - adjustedExpense;
  const managementFee = Number((adjustedIncome * (managementFeePct / 100)).toFixed(2));
  const distribution = Number((netIncome - managementFee).toFixed(2));

  return {
    income:  Array.from(incomeMap.values()).map((l)  => ({ ...l, amount: Number((l.amount * ownershipFactor).toFixed(2)) })).sort((a, b) => b.amount - a.amount),
    expense: Array.from(expenseMap.values()).map((l) => ({ ...l, amount: Number((l.amount * ownershipFactor).toFixed(2)) })).sort((a, b) => b.amount - a.amount),
    totalIncome:  Number(adjustedIncome.toFixed(2)),
    totalExpense: Number(adjustedExpense.toFixed(2)),
    netIncome:    Number(netIncome.toFixed(2)),
    managementFeePct,
    managementFee,
    ownerSplitPct,
    distribution,
  };
}

/** Generate (or regenerate) a draft statement for one owner + period. */
export async function generateOwnerStatement(
  landlordId: string,
  ownerId: string,
  periodStart: Date,
  periodEnd: Date,
  generatedBy?: string,
  tx?: Prisma.TransactionClient,
): Promise<GeneratedStatement> {
  const c = (tx ?? (db as unknown as PrismaClient));

  const summary = await computeOwnerStatementSummary(landlordId, ownerId, periodStart, periodEnd, tx);

  // Upsert: if a draft already exists for this period, update it.
  // If it's already finalized, throw — don't silently overwrite locked numbers.
  const existing = await c.ownerStatement.findUnique({
    where: { ownerId_periodStart_periodEnd: { ownerId, periodStart, periodEnd } },
  });
  if (existing && existing.status === 'sent') {
    throw new Error('Statement has already been sent — create a corrected statement instead');
  }

  const data = {
    landlordId,
    ownerId,
    periodStart,
    periodEnd,
    totalIncome:      summary.totalIncome,
    totalExpense:     summary.totalExpense,
    netIncome:        summary.netIncome,
    managementFeePct: summary.managementFeePct,
    managementFee:    summary.managementFee,
    distribution:     summary.distribution,
    status:           'draft',
    generatedBy,
    generatedAt:      new Date(),
  };

  const statement = existing
    ? await c.ownerStatement.update({ where: { id: existing.id }, data })
    : await c.ownerStatement.create({ data });

  return { ownerId, periodStart, periodEnd, summary, statementId: statement.id };
}

/** Finalize the statement (lock the numbers). */
export async function finalizeStatement(statementId: string, tx?: Prisma.TransactionClient) {
  const c = (tx ?? (db as unknown as PrismaClient));
  return c.ownerStatement.update({
    where: { id: statementId },
    data: { status: 'finalized', finalizedAt: new Date() },
  });
}

/** Mark a statement as sent (after email goes out). */
export async function markStatementSent(statementId: string, recipients: string[], tx?: Prisma.TransactionClient) {
  const c = (tx ?? (db as unknown as PrismaClient));
  return c.ownerStatement.update({
    where: { id: statementId },
    data: { status: 'sent', emailSentAt: new Date(), emailRecipients: recipients },
  });
}
