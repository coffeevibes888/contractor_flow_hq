/**
 * Balance Sheet report.
 *
 *   Assets                       =  Liabilities + Equity
 *
 * Cumulative (no date range). Everything up to `asOf`.
 */

import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as db } from '@/db/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export interface BalanceSheetSection {
  label: string;
  type: 'asset' | 'liability' | 'equity';
  lines: Array<{ accountId: string; code: string; name: string; balance: number }>;
  subtotal: number;
}

export interface BalanceSheetReport {
  asOf: Date;
  assets:      BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity:      BalanceSheetSection;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
  generatedAt: Date;
}

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  return Number(d.toString());
}

export async function balanceSheet(
  landlordId: string,
  asOf: Date = new Date(),
  tx?: Prisma.TransactionClient,
): Promise<BalanceSheetReport> {
  const c = (tx ?? (db as unknown as PrismaClient));

  const grouped = await c.journalLine.groupBy({
    by: ['accountId'],
    where: {
      entry: { landlordId, effectiveDate: { lte: asOf } },
      account: { type: { in: ['asset', 'liability', 'equity'] } },
    },
    _sum: { debit: true, credit: true },
  });

  const empty: BalanceSheetReport = {
    asOf,
    assets:      { label: 'Assets',      type: 'asset',     lines: [], subtotal: 0 },
    liabilities: { label: 'Liabilities', type: 'liability', lines: [], subtotal: 0 },
    equity:      { label: 'Equity',      type: 'equity',    lines: [], subtotal: 0 },
    totalAssets: 0, totalLiabilitiesAndEquity: 0, balanced: true, generatedAt: new Date(),
  };
  if (grouped.length === 0) return empty;

  const accountIds = grouped.map((g) => g.accountId);
  const accounts = await c.chartOfAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true, type: true },
  });
  const acctMap = new Map(accounts.map((a) => [a.id, a]));

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const g of grouped) {
    const acct = acctMap.get(g.accountId);
    if (!acct) continue;
    const debit  = toNum(g._sum.debit);
    const credit = toNum(g._sum.credit);

    // Normal-balance sign
    const balance = (acct.type === 'asset') ? debit - credit : credit - debit;
    if (Math.abs(balance) < 0.01) continue;

    const line = { accountId: acct.id, code: acct.code, name: acct.name, balance: Number(balance.toFixed(2)) };
    if (acct.type === 'asset') {
      empty.assets.lines.push(line);
      totalAssets += balance;
    } else if (acct.type === 'liability') {
      empty.liabilities.lines.push(line);
      totalLiabilities += balance;
    } else {
      empty.equity.lines.push(line);
      totalEquity += balance;
    }
  }

  empty.assets.lines.sort((a, b) => a.code.localeCompare(b.code));
  empty.liabilities.lines.sort((a, b) => a.code.localeCompare(b.code));
  empty.equity.lines.sort((a, b) => a.code.localeCompare(b.code));

  empty.assets.subtotal      = Number(totalAssets.toFixed(2));
  empty.liabilities.subtotal = Number(totalLiabilities.toFixed(2));
  empty.equity.subtotal      = Number(totalEquity.toFixed(2));
  empty.totalAssets          = Number(totalAssets.toFixed(2));
  empty.totalLiabilitiesAndEquity = Number((totalLiabilities + totalEquity).toFixed(2));
  empty.balanced = Math.abs(empty.totalAssets - empty.totalLiabilitiesAndEquity) < 0.01;

  return empty;
}
