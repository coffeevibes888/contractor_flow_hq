/**
 * Trial Balance report.
 *
 * At any point in time, the sum of all debit-normal balances should
 * equal the sum of all credit-normal balances. If they don't, the GL
 * is broken (something posted unbalanced).
 */

import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as db } from '@/db/prisma';
import { getTrialBalance, type TrialBalanceRow } from '../gl';

type Client = PrismaClient | Prisma.TransactionClient;

export interface TrialBalanceReport {
  asOf: Date;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  difference: number;
  generatedAt: Date;
}

export async function trialBalance(
  landlordId: string,
  asOf: Date = new Date(),
  tx?: Prisma.TransactionClient,
): Promise<TrialBalanceReport> {
  const c = (tx ?? (db as unknown as PrismaClient));
  const result = await getTrialBalance(landlordId, asOf, tx);
  return {
    asOf,
    rows: result.rows,
    totalDebit: result.totalDebit,
    totalCredit: result.totalCredit,
    balanced: result.balanced,
    difference: Number((result.totalDebit - result.totalCredit).toFixed(2)),
    generatedAt: new Date(),
  };
}
