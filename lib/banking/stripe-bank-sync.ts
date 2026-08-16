/**
 * Bank reconciliation — recording + auto-matching helpers.
 *
 * Every Stripe money event (charge, payout, transfer) gets a row in
 * `BankTransaction` with a Stripe-object id as `externalId`. The unique
 * (landlordId, externalId) index means webhook retries are idempotent.
 *
 * On insert, we try a best-effort auto-match:
 *   1. The Stripe object's metadata often points at a domain row
 *      (ContractorPayment.treasuryTransferId, RentPayment.stripePaymentIntentId,
 *      OwnerDistribution.stripeTransferId). If we find a domain row AND it
 *      has a posted JournalEntry, we link them.
 *   2. Otherwise we look for an unmatched JournalEntry on the same
 *      effectiveDate with the same signed amount — manual match prompt is
 *      cheaper than guessing.
 *
 * This module is the only thing the webhook needs to import.
 */

import 'server-only';
import type { Prisma, BankTransactionSource, BankTransactionStatus } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '@/db/prisma';

/**
 * Extended-Prisma + Prisma.TransactionClient unions trigger "excessive
 * stack depth" TS errors when methods are called on a shared `tx` variable.
 * The cast pattern below collapses the union so method calls type-check.
 * Mirrors the pattern in `lib/accounting/gl.ts`.
 */
type Tx = Prisma.TransactionClient | undefined;
type Exec = PrismaClient;
const asExec = (tx: Tx): Exec =>
  (tx ? (tx as unknown as PrismaClient) : (db as unknown as PrismaClient));

export interface RecordBankTransactionInput {
  landlordId: string;
  financialAccountId?: string | null;
  stripeConnectedAccountId?: string | null;
  source: BankTransactionSource;
  externalId: string;
  stripeEventId?: string | null;
  amount: number; // dollars, signed
  currency?: string;
  description?: string | null;
  rawPayload?: Prisma.InputJsonValue | null;
  postedAt: Date;
}

/**
 * Idempotent insert. Returns the row (new or existing) and whether it was
 * just created. Auto-match runs only on the create path; on retry we leave
 * the existing status alone.
 */
export async function recordBankTransaction(
  input: RecordBankTransactionInput,
  tx?: Prisma.TransactionClient
): Promise<{ row: BankTransactionRow; created: boolean }> {
  const exec = asExec(tx);

  const existing = await exec.bankTransaction.findUnique({
    where: {
      landlordId_externalId: {
        landlordId: input.landlordId,
        externalId: input.externalId,
      },
    },
  });
  if (existing) {
    return { row: toRow(existing), created: false };
  }

  const created = await exec.bankTransaction.create({
    data: {
      landlordId: input.landlordId,
      financialAccountId: input.financialAccountId ?? null,
      stripeConnectedAccountId: input.stripeConnectedAccountId ?? null,
      source: input.source,
      externalId: input.externalId,
      stripeEventId: input.stripeEventId ?? null,
      amount: input.amount,
      currency: input.currency ?? 'usd',
      description: input.description ?? null,
      rawPayload: input.rawPayload ?? undefined,
      postedAt: input.postedAt,
    },
  });

  // Best-effort auto-match in the same transaction so a re-run doesn't
  // re-evaluate. Failures are logged; unmatched bank rows are a normal state.
  try {
    await tryAutoMatch(created.id, tx);
  } catch (err) {
    console.error('[banking] auto-match failed', created.id, err);
  }

  return { row: toRow(created), created: true };
}

/** Convenience: convert a freshly loaded row to the camelCase wire shape. */
export function toRow(r: {
  id: string;
  landlordId: string;
  financialAccountId: string | null;
  stripeConnectedAccountId: string | null;
  source: BankTransactionSource;
  externalId: string;
  stripeEventId: string | null;
  amount: Prisma.Decimal | number | string;
  currency: string;
  description: string | null;
  rawPayload: unknown;
  postedAt: Date;
  status: BankTransactionStatus;
  matchedJournalEntryId: string | null;
  matchedAt: Date | null;
  matchedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BankTransactionRow {
  return {
    id: r.id,
    landlordId: r.landlordId,
    financialAccountId: r.financialAccountId,
    stripeConnectedAccountId: r.stripeConnectedAccountId,
    source: r.source,
    externalId: r.externalId,
    stripeEventId: r.stripeEventId,
    amount: Number(r.amount),
    currency: r.currency,
    description: r.description,
    postedAt: r.postedAt,
    status: r.status,
    matchedJournalEntryId: r.matchedJournalEntryId,
    matchedAt: r.matchedAt,
    matchedBy: r.matchedBy,
    notes: r.notes,
  };
}

/** Public wire shape — what admin UI + API return. */
export interface BankTransactionRow {
  id: string;
  landlordId: string;
  financialAccountId: string | null;
  stripeConnectedAccountId: string | null;
  source: BankTransactionSource;
  externalId: string;
  stripeEventId: string | null;
  amount: number;
  currency: string;
  description: string | null;
  postedAt: Date;
  status: BankTransactionStatus;
  matchedJournalEntryId: string | null;
  matchedAt: Date | null;
  matchedBy: string | null;
  notes: string | null;
}

/**
 * Best-effort auto-match by (a) domain metadata pointer or (b) amount+date
 * against JournalEntry. We never overwrite a status set by the user
 * (matched / ignored / needs_review) — only the default 'unmatched' can
 * be flipped automatically.
 */
export async function tryAutoMatch(
  bankTransactionId: string,
  tx?: Prisma.TransactionClient
): Promise<{ matched: boolean; reason: string }> {
  const exec = asExec(tx);

  const bt = await exec.bankTransaction.findUnique({
    where: { id: bankTransactionId },
  });
  if (!bt) return { matched: false, reason: 'not_found' };
  if (bt.status !== 'unmatched') {
    return { matched: false, reason: `already_${bt.status}` };
  }

  // Strategy 1: the Stripe object's externalId maps to a known domain row
  // that already has a JournalEntry. We use the rawPayload metadata when
  // available; otherwise we fall through to Strategy 2.
  const payload = (bt.rawPayload as { metadata?: Record<string, string> } | null) ?? null;
  const meta = payload?.metadata ?? {};
  const externalId = bt.externalId;

  const journalEntryId = await findJournalEntryForDomain({
    source: bt.source,
    externalId,
    metadata: meta,
    tx,
  });

  if (journalEntryId) {
    await exec.bankTransaction.update({
      where: { id: bt.id },
      data: {
        status: 'matched',
        matchedJournalEntryId: journalEntryId,
        matchedAt: new Date(),
      },
    });
    return { matched: true, reason: 'metadata' };
  }

  // Strategy 2: same signed amount + same effectiveDate (within 3 days) on
  // a JournalEntry with no current bank match. If multiple candidates, flag
  // for manual review.
  const amount = Number(bt.amount);
  const lower = new Date(bt.postedAt.getTime() - 3 * 24 * 60 * 60 * 1000);
  const upper = new Date(bt.postedAt.getTime() + 3 * 24 * 60 * 60 * 1000);

  const candidates = await exec.journalEntry.findMany({
    where: {
      landlordId: bt.landlordId,
      effectiveDate: { gte: lower, lte: upper },
      bankTransaction: null,
      lines: {
        some: {
          OR: [
            { debit: amount },
            { credit: amount },
          ],
        },
      },
    },
    select: {
      id: true,
      effectiveDate: true,
      memo: true,
      source: true,
      sourceId: true,
    },
    take: 5,
  });

  if (candidates.length === 1) {
    await exec.bankTransaction.update({
      where: { id: bt.id },
      data: {
        status: 'matched',
        matchedJournalEntryId: candidates[0].id,
        matchedAt: new Date(),
      },
    });
    return { matched: true, reason: 'amount_date' };
  }
  if (candidates.length > 1) {
    await exec.bankTransaction.update({
      where: { id: bt.id },
      data: { status: 'needs_review' },
    });
    return { matched: false, reason: 'multiple_candidates' };
  }
  return { matched: false, reason: 'no_candidates' };
}

/**
 * Resolve a Stripe object id (or metadata) to a JournalEntry id. Each
 * bank-rec source has a known domain table that holds the reference.
 */
async function findJournalEntryForDomain(args: {
  source: BankTransactionSource;
  externalId: string;
  metadata: Record<string, string>;
  tx?: Prisma.TransactionClient;
}): Promise<string | null> {
  const { source, externalId, metadata, tx } = args;
  const exec = asExec(tx);

  // Treasury OutboundTransfer → ContractorPayment → (manual JE) is rare;
  // for v1 we record but don't auto-match. Future: add a source='marketplace_payment'
  // on JournalEntry so the link is unambiguous.
  // Treasury InboundTransfer → either a rent charge (PI id) or a manual deposit.
  if (source === 'stripe_inbound_xfer') {
    // Try rent: inbound transfer description sometimes contains a PI id.
    const piId = metadata['paymentIntentId'] ?? metadata['pi_id'];
    if (piId) {
      const rp = await exec.rentPayment.findFirst({
        where: { stripePaymentIntentId: piId },
        select: { id: true },
      });
      if (rp) {
        const je = await exec.journalEntry.findFirst({
          where: { source: 'rent_payment', sourceId: rp.id },
          select: { id: true },
        });
        if (je) return je.id;
      }
    }
  }

  // Stripe charge → RentPayment.stripePaymentIntentId OR PaymentTransaction.referenceId
  if (source === 'stripe_charge') {
    // Try via paymentIntentId
    const rp = await exec.rentPayment.findFirst({
      where: { stripePaymentIntentId: externalId },
      select: { id: true },
    });
    if (rp) {
      const je = await exec.journalEntry.findFirst({
        where: { source: 'rent_payment', sourceId: rp.id },
        select: { id: true },
      });
      if (je) return je.id;
    }
    // Try via PaymentTransaction.referenceId
    const pt = await exec.paymentTransaction.findFirst({
      where: { referenceId: externalId },
      select: { id: true, rentPaymentId: true },
    });
    if (pt) {
      const je = await exec.journalEntry.findFirst({
        where: { source: 'rent_payment', sourceId: pt.rentPaymentId },
        select: { id: true },
      });
      if (je) return je.id;
    }
  }

  // Stripe payout → Payout.stripeTransferId
  if (source === 'stripe_payout') {
    const p = await exec.payout.findFirst({
      where: { stripeTransferId: externalId },
      select: { id: true },
    });
    if (p) {
      const je = await exec.journalEntry.findFirst({
        where: { source: 'system', sourceId: p.id },
        select: { id: true },
      });
      if (je) return je.id;
    }
  }

  // Owner distribution payout (future Phase 3 part 2)
  if (source === 'stripe_outbound_xfer' || source === 'stripe_transfer') {
    const od = await exec.ownerDistribution.findFirst({
      where: { stripeTransferId: externalId },
      select: { id: true },
    });
    if (od) {
      const je = await exec.journalEntry.findFirst({
        where: { source: 'owner_payout', sourceId: od.id },
        select: { id: true },
      });
      if (je) return je.id;
    }
  }

  return null;
}

/** Manually mark a bank transaction as matched to a journal entry. */
export async function manualMatch(args: {
  bankTransactionId: string;
  journalEntryId: string;
  userId: string;
}, tx?: Prisma.TransactionClient): Promise<void> {
  const exec = asExec(tx);
  await exec.bankTransaction.update({
    where: { id: args.bankTransactionId },
    data: {
      status: 'matched',
      matchedJournalEntryId: args.journalEntryId,
      matchedAt: new Date(),
      matchedBy: args.userId,
    },
  });
}

/** Mark a bank transaction as ignored (PM confirmed it's not a bookkeeping event). */
export async function ignoreBankTransaction(
  bankTransactionId: string,
  userId: string,
  note?: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const exec = asExec(tx);
  await exec.bankTransaction.update({
    where: { id: bankTransactionId },
    data: {
      status: 'ignored',
      matchedAt: new Date(),
      matchedBy: userId,
      notes: note ?? null,
    },
  });
}

/** Clear a previous match so the row returns to 'unmatched'. */
export async function unmatchBankTransaction(
  bankTransactionId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const exec = asExec(tx);
  await exec.bankTransaction.update({
    where: { id: bankTransactionId },
    data: {
      status: 'unmatched',
      matchedJournalEntryId: null,
      matchedAt: null,
      matchedBy: null,
    },
  });
}

/**
 * Compute reconciliation summary tiles for the dashboard.
 * Cheap query (only counts + sums) — safe to call on every page load.
 */
export async function getReconciliationSummary(args: {
  landlordId: string;
  fromDate: Date;
  toDate: Date;
}, tx?: Prisma.TransactionClient) {
  const exec = asExec(tx);
  const where = {
    landlordId: args.landlordId,
    postedAt: { gte: args.fromDate, lte: args.toDate },
  };

  const groups = await exec.bankTransaction.groupBy({
    by: ['status', 'source'],
    where,
    _count: { _all: true },
    _sum: { amount: true },
  });

  const tiles = {
    matched: { count: 0, total: 0 },
    unmatched: { count: 0, total: 0 },
    needs_review: { count: 0, total: 0 },
    ignored: { count: 0, total: 0 },
    total: { count: 0, total: 0 },
  };

  for (const g of groups) {
    const status = g.status as keyof typeof tiles;
    const count = g._count._all;
    const total = Number(g._sum.amount ?? 0);
    if (status === 'total') continue;
    tiles[status].count += count;
    tiles[status].total += total;
    tiles.total.count += count;
    tiles.total.total += total;
  }

  return tiles;
}
