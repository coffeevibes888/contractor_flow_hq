/**
 * Backfill script — convert historical Expense + RentPayment rows
 * into balanced journal entries on the new GL.
 *
 * Run once per landlord (or per opt-in) before flipping the analytics
 * dashboard to read from the GL. Idempotent: skips source records that
 * already have a journal entry (matched by `source` + `sourceId`).
 *
 *   npx tsx scripts/accounting/backfill-gl.ts <landlordId>
 *
 *   landlordId is optional — backfills all opted-in landlords when omitted.
 */

import { prisma as db } from '@/db/prisma';
import { postExpense, postRentPaymentReceipt, ensureChartOfAccounts, ensureFiscalPeriod } from '@/lib/accounting';

async function backfillLandlord(landlordId: string): Promise<{ expenses: number; payments: number; errors: string[] }> {
  const errors: string[] = [];
  let expenses = 0;
  let payments = 0;

  // 1. Make sure the chart of accounts exists
  await ensureChartOfAccounts(landlordId);

  // 2. Backfill paid rent payments
  const paidPayments = await db.rentPayment.findMany({
    where: {
      status: 'paid',
      paidAt: { not: null },
      lease: { unit: { property: { landlordId } } },
    },
    include: {
      lease: {
        include: {
          unit: { include: { property: { include: { landlord: { include: { owner: true } } } } } },
        },
      },
    },
    take: 1000, // chunked; loop in production
  });

  for (const rp of paidPayments) {
    try {
      const property = rp.lease?.unit?.property;
      if (!property) continue;
      const lateFee = rp.metadata && typeof (rp.metadata as { lateFee?: unknown }).lateFee === 'number'
        ? ((rp.metadata as { lateFee: number }).lateFee)
        : 0;
      await postRentPaymentReceipt(
        landlordId,
        rp.id,
        Number(rp.amount),
        lateFee,
        rp.paidAt!,
        {
          propertyId: property.id,
          unitId: rp.lease!.unitId,
          tenantId: rp.tenantId,
        },
      );
      payments++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Skip "already posted" cases gracefully
      if (msg.includes('source')) errors.push(`payment ${rp.id}: ${msg}`);
      else errors.push(`payment ${rp.id}: ${msg}`);
    }
  }

  // 3. Backfill expenses
  const allExpenses = await db.expense.findMany({
    where: { landlordId },
    take: 1000,
  });

  for (const ex of allExpenses) {
    try {
      await postExpense(
        landlordId,
        ex.id,
        Number(ex.amount),
        ex.category,
        ex.incurredAt,
        {
          propertyId: ex.propertyId ?? undefined,
          unitId: ex.unitId ?? undefined,
        },
      );
      expenses++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`expense ${ex.id}: ${msg}`);
    }
  }

  return { expenses, payments, errors };
}

async function main() {
  const landlordIdArg = process.argv[2];
  const landlordIds = landlordIdArg
    ? [landlordIdArg]
    : (await db.landlord.findMany({ select: { id: true, subscriptionTier: true } }))
        .filter((l) => l.subscriptionTier === 'pro' || l.subscriptionTier === 'enterprise')
        .map((l) => l.id);

  console.log(`Backfilling GL for ${landlordIds.length} landlord(s)…`);

  for (const id of landlordIds) {
    console.log(`\n— Landlord ${id} —`);
    const result = await backfillLandlord(id);
    console.log(`   expenses: ${result.expenses}`);
    console.log(`   payments: ${result.payments}`);
    if (result.errors.length) {
      console.log(`   errors (${result.errors.length}):`);
      for (const e of result.errors.slice(0, 5)) console.log(`     - ${e}`);
    }
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
