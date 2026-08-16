/**
 * Tenant Ledger — per-tenant running balance.
 *
 * Every rent charge, payment, late fee, credit, or refund posts a
 * `TenantLedgerEntry`. The `runningBalance` column is denormalized so
 * we can read "what does this tenant owe?" in one query.
 *
 * Sign convention: positive amount = tenant owes more (charge, late fee).
 *                 negative amount = tenant paid or was credited.
 *
 *   openBalance (last running balance)
 *   + charges   (positive)
 *   + late_fees (positive)
 *   + deposits  (positive — held in trust)
 *   - payments  (negative)
 *   - credits   (negative)
 *   - refunds   (negative)
 *   = currentBalance
 */

import { Prisma, type PrismaClient, type LedgerEntryType } from '@prisma/client';
import { prisma as db } from '@/db/prisma';
import { postJournalEntry, type JournalLineInput } from './gl';
import { DEFAULT_CASH_ACCOUNT_CODE, DEFAULT_RENT_INCOME_ACCOUNT_CODE, DEFAULT_LATE_FEE_INCOME_ACCOUNT_CODE, DEFAULT_SECURITY_DEPOSIT_CASH_CODE, DEFAULT_SECURITY_DEPOSIT_LIABILITY_CODE } from './chart-of-accounts';

type Client = PrismaClient | Prisma.TransactionClient;

export interface PostLedgerEntryInput {
  landlordId: string;
  tenantId: string;
  leaseId: string;
  propertyId: string;
  unitId: string;
  type: LedgerEntryType;
  amount: number;             // positive = charge; negative = payment
  effectiveDate: Date;
  description?: string;
  rentPaymentId?: string;
  postedBy?: string;
  tx?: Prisma.TransactionClient;
}

/** Post a tenant ledger entry + its associated journal entry (atomic). */
export async function postLedgerEntry(input: PostLedgerEntryInput) {
  const c = (input.tx ?? (db as unknown as PrismaClient));

  // Compute the new running balance from the previous entry
  const last = await c.tenantLedgerEntry.findFirst({
    where: { leaseId: input.leaseId },
    orderBy: { postedAt: 'desc' },
    select: { runningBalance: true },
  });
  const previousBalance = last ? Number(last.runningBalance.toString()) : 0;
  const runningBalance = Number((previousBalance + input.amount).toFixed(2));

  // Post the corresponding journal entry for the GL.
  // The chart of accounts for "tenant owes us" is 1200 A/R Tenants.
  // We post the cash side when type === payment (cash actually moves).
  let journalEntryId: string | null = null;
  if (Math.abs(input.amount) > 0) {
    const lines: JournalLineInput[] = [];
    if (input.type === 'charge') {
      lines.push({ accountCode: '1200', debit: input.amount, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description });
      lines.push({ accountCode: DEFAULT_RENT_INCOME_ACCOUNT_CODE, credit: input.amount, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description });
    } else if (input.type === 'late_fee') {
      lines.push({ accountCode: '1200', debit: input.amount, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description ?? 'Late fee' });
      lines.push({ accountCode: DEFAULT_LATE_FEE_INCOME_ACCOUNT_CODE, credit: input.amount, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description ?? 'Late fee' });
    } else if (input.type === 'payment') {
      // Cash receipt — DR cash, CR A/R (reducing the receivable).
      const amt = Math.abs(input.amount);
      lines.push({ accountCode: DEFAULT_CASH_ACCOUNT_CODE, debit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description });
      lines.push({ accountCode: '1200', credit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description });
    } else if (input.type === 'deposit') {
      // Held in trust — DR trust cash, CR deposit liability
      const amt = Math.abs(input.amount);
      lines.push({ accountCode: DEFAULT_SECURITY_DEPOSIT_CASH_CODE, debit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description ?? 'Security deposit' });
      lines.push({ accountCode: DEFAULT_SECURITY_DEPOSIT_LIABILITY_CODE, credit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description ?? 'Security deposit' });
    } else if (input.type === 'deposit_refund') {
      const amt = Math.abs(input.amount);
      lines.push({ accountCode: DEFAULT_SECURITY_DEPOSIT_LIABILITY_CODE, debit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description ?? 'Deposit refund' });
      lines.push({ accountCode: DEFAULT_CASH_ACCOUNT_CODE, credit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description ?? 'Deposit refund' });
    } else if (input.type === 'credit' || input.type === 'adjustment' || input.type === 'refund') {
      // Manually-issued credit / adjustment / refund. For now, treat as a contra-charge
      // (reduces A/R). Side depends on sign.
      const amt = Math.abs(input.amount);
      if (input.amount >= 0) {
        // credit — we owe the tenant money
        lines.push({ accountCode: '1200', credit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description });
        lines.push({ accountCode: '2200', debit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description });
      } else {
        // refund — we paid the tenant back out of pocket
        lines.push({ accountCode: '5990', debit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description });
        lines.push({ accountCode: DEFAULT_CASH_ACCOUNT_CODE, credit: amt, propertyId: input.propertyId, unitId: input.unitId, tenantId: input.tenantId, memo: input.description });
      }
    }
    if (lines.length === 2) {
      const result = await postJournalEntry({
        landlordId: input.landlordId,
        effectiveDate: input.effectiveDate,
        memo: input.description ?? `Tenant ledger: ${input.type}`,
        source: input.type === 'payment' || input.type === 'deposit' || input.type === 'deposit_refund' ? 'rent_payment' : 'tenant_credit',
        sourceId: input.rentPaymentId,
        createdBy: input.postedBy,
        lines,
        tx: input.tx,
      });
      journalEntryId = result?.entryId ?? null;
    }
  }

  const entry = await c.tenantLedgerEntry.create({
    data: {
      landlordId: input.landlordId,
      tenantId: input.tenantId,
      leaseId: input.leaseId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      type: input.type,
      amount: input.amount,
      runningBalance,
      effectiveDate: input.effectiveDate,
      description: input.description,
      rentPaymentId: input.rentPaymentId,
      journalEntryId,
    },
  });

  return entry;
}

/** Convenience: get the current balance for a lease (most recent entry). */
export async function getTenantBalance(leaseId: string, tx?: Prisma.TransactionClient): Promise<number> {
  const c = (tx ?? (db as unknown as PrismaClient));
  const last = await c.tenantLedgerEntry.findFirst({
    where: { leaseId },
    orderBy: { postedAt: 'desc' },
    select: { runningBalance: true },
  });
  return last ? Number(last.runningBalance.toString()) : 0;
}

/** Get the full ledger history for a lease. */
export async function getTenantLedger(leaseId: string, tx?: Prisma.TransactionClient) {
  const c = (tx ?? (db as unknown as PrismaClient));
  return c.tenantLedgerEntry.findMany({
    where: { leaseId },
    orderBy: { postedAt: 'asc' },
  });
}

/** Post a monthly rent charge for an active lease (idempotent per month). */
export async function postMonthlyRentCharge(args: {
  leaseId: string;
  amount: number;
  effectiveDate: Date;
  description?: string;
  tx?: Prisma.TransactionClient;
}) {
  const c = (args.tx ?? (db as unknown as PrismaClient));
  const lease = await c.lease.findUnique({
    where: { id: args.leaseId },
    select: { id: true, tenantId: true, unitId: true, unit: { select: { propertyId: true, property: { select: { landlordId: true } } } } },
  });
  if (!lease) throw new Error(`Lease ${args.leaseId} not found`);

  // Idempotency: skip if a charge for this lease with the same effective date already exists.
  const existing = await c.tenantLedgerEntry.findFirst({
    where: { leaseId: args.leaseId, type: 'charge', effectiveDate: args.effectiveDate },
  });
  if (existing) return existing;

  return postLedgerEntry({
    landlordId: lease.unit.property.landlordId!,
    tenantId: lease.tenantId,
    leaseId: lease.id,
    propertyId: lease.unit.propertyId,
    unitId: lease.unitId,
    type: 'charge',
    amount: args.amount,
    effectiveDate: args.effectiveDate,
    description: args.description ?? `Monthly rent — ${args.effectiveDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
    tx: args.tx,
  });
}

/** Record a tenant payment against the lease (positive amount, stored as negative ledger entry). */
export async function postTenantPayment(args: {
  leaseId: string;
  amount: number;
  effectiveDate: Date;
  description?: string;
  rentPaymentId?: string;
  tx?: Prisma.TransactionClient;
}) {
  const c = (args.tx ?? (db as unknown as PrismaClient));
  const lease = await c.lease.findUnique({
    where: { id: args.leaseId },
    select: { id: true, tenantId: true, unitId: true, unit: { select: { propertyId: true, property: { select: { landlordId: true } } } } },
  });
  if (!lease) throw new Error(`Lease ${args.leaseId} not found`);

  return postLedgerEntry({
    landlordId: lease.unit.property.landlordId!,
    tenantId: lease.tenantId,
    leaseId: lease.id,
    propertyId: lease.unit.propertyId,
    unitId: lease.unitId,
    type: 'payment',
    amount: -Math.abs(args.amount),  // store as negative
    effectiveDate: args.effectiveDate,
    description: args.description ?? 'Rent payment received',
    rentPaymentId: args.rentPaymentId,
    tx: args.tx,
  });
}
