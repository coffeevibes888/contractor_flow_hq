/**
 * Rent Roll — the industry-standard property management report.
 *
 * One row per unit, with:
 *   - Tenant name, lease dates
 *   - Market rent vs. actual rent
 *   - Security deposit
 *   - Balance owed (from tenant ledger)
 *   - Last payment date
 *
 * Sorted by property, then unit. Useful for owners, lenders, and
 * prospective buyers during due diligence.
 */

import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as db } from '@/db/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export interface RentRollRow {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitLabel: string;
  tenantId: string | null;
  tenantName: string | null;
  leaseId: string | null;
  leaseStart: Date | null;
  leaseEnd: Date | null;
  status: 'occupied' | 'vacant' | 'notice';
  marketRent: number;
  actualRent: number;
  deposit: number;
  balanceOwed: number;
  lastPaymentAt: Date | null;
}

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  return Number(d.toString());
}

export async function rentRoll(
  landlordId: string,
  asOf: Date = new Date(),
  tx?: Prisma.TransactionClient,
): Promise<RentRollRow[]> {
  const c = (tx ?? (db as unknown as PrismaClient));

  const properties = await c.property.findMany({
    where: { landlordId },
    select: {
      id: true,
      name: true,
      units: {
        select: {
          id: true,
          name: true,
          rentAmount: true,
          leases: {
            where: { status: { in: ['active', 'pending_signature'] } },
            select: {
              id: true,
              startDate: true,
              endDate: true,
              rentAmount: true,
              tenant: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  const rows: RentRollRow[] = [];

  for (const prop of properties) {
    for (const unit of prop.units) {
      const activeLease = unit.leases[0] ?? null;
      const tenant = activeLease?.tenant ?? null;
      const leaseId = activeLease?.id ?? null;

      // Last successful payment on this lease
      let lastPayment: Date | null = null;
      let balanceOwed = 0;
      if (leaseId) {
        const last = await c.rentPayment.findFirst({
          where: { leaseId, status: 'paid' },
          orderBy: { paidAt: 'desc' },
          select: { paidAt: true, amount: true, amountPaid: true },
        });
        lastPayment = last?.paidAt ?? null;

        // Sum outstanding charges minus payments in tenant ledger
        const [chargeAgg, paymentAgg] = await Promise.all([
          c.tenantLedgerEntry.aggregate({
            where: { leaseId, type: { in: ['charge', 'late_fee', 'deposit'] } },
            _sum: { amount: true },
          }),
          c.tenantLedgerEntry.aggregate({
            where: { leaseId, type: { in: ['payment', 'credit', 'refund', 'deposit_refund'] } },
            _sum: { amount: true },
          }),
        ]);
        const owed   = toNum(chargeAgg._sum.amount);
        const paid   = Math.abs(toNum(paymentAgg._sum.amount)); // payments stored as negative
        balanceOwed = Number((owed - paid).toFixed(2));
      }

      const marketRent = toNum(unit.rentAmount);
      const actualRent = activeLease ? toNum(activeLease.rentAmount) : 0;

      rows.push({
        propertyId: prop.id,
        propertyName: prop.name,
        unitId: unit.id,
        unitLabel: unit.name,
        tenantId: tenant?.id ?? null,
        tenantName: tenant?.name ?? null,
        leaseId,
        leaseStart: activeLease?.startDate ?? null,
        leaseEnd:   activeLease?.endDate ?? null,
        status: activeLease ? 'occupied' : 'vacant',
        marketRent,
        actualRent,
        deposit: 0, // we don't currently store a per-lease deposit; could be added later
        balanceOwed,
        lastPaymentAt: lastPayment,
      });
    }
  }

  rows.sort((a, b) => a.propertyName.localeCompare(b.propertyName) || a.unitLabel.localeCompare(b.unitLabel));
  return rows;
}
