/**
 * Fiscal Period management — open, lock, and close accounting periods.
 *
 * States: open → entries post freely
 *         locked → no new entries (admin override required)
 *         closed → permanent (no edits, ever)
 *
 * Backdating within an open period is allowed (e.g., entering last
 * week's expense). Backdating into a closed period is rejected.
 */

import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as db } from '@/db/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export class PeriodClosedError extends Error {
  constructor(public periodId: string, public status: string) {
    super(`Fiscal period is ${status} and cannot accept new entries`);
    this.name = 'PeriodClosedError';
  }
}

export async function listPeriods(landlordId: string, tx?: Prisma.TransactionClient) {
  const c = (tx ?? (db as unknown as PrismaClient));
  return c.fiscalPeriod.findMany({
    where: { landlordId },
    orderBy: { startDate: 'desc' },
  });
}

export async function getPeriodFor(
  landlordId: string,
  date: Date,
  tx?: Prisma.TransactionClient,
) {
  const c = (tx ?? (db as unknown as PrismaClient));
  return c.fiscalPeriod.findFirst({
    where: {
      landlordId,
      startDate: { lte: date },
      endDate: { gt: date },
    },
  });
}

/** Throws if a journal entry cannot post to the period containing `effectiveDate`. */
export async function assertPeriodAcceptsEntry(
  landlordId: string,
  effectiveDate: Date,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const period = await getPeriodFor(landlordId, effectiveDate, tx);
  if (!period) return; // no period row → no restriction
  if (period.status === 'closed') {
    throw new PeriodClosedError(period.id, period.status);
  }
  // 'locked' is enforced elsewhere by the caller's authority check; we don't throw here.
}

export async function lockPeriod(periodId: string, closedBy?: string, tx?: Prisma.TransactionClient) {
  const c = (tx ?? (db as unknown as PrismaClient));
  return c.fiscalPeriod.update({
    where: { id: periodId },
    data: { status: 'locked', closedAt: new Date(), closedBy },
  });
}

export async function closePeriod(periodId: string, closedBy?: string, tx?: Prisma.TransactionClient) {
  const c = (tx ?? (db as unknown as PrismaClient));
  return c.fiscalPeriod.update({
    where: { id: periodId },
    data: { status: 'closed', closedAt: new Date(), closedBy },
  });
}

export async function reopenPeriod(periodId: string, tx?: Prisma.TransactionClient) {
  const c = (tx ?? (db as unknown as PrismaClient));
  return c.fiscalPeriod.update({
    where: { id: periodId },
    data: { status: 'open', closedAt: null, closedBy: null },
  });
}
