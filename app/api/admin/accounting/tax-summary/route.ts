/**
 * Schedule E / Tax Summary API
 * GET ?landlordId=&year=
 * Maps GL account balances to IRS Schedule E line numbers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingManagement } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

const SCHEDULE_E_LINES: Record<string, string> = {
  sch_e_3:   'Line 3 — Rents received',
  sch_e_4:   'Line 4 — Royalties received',
  sch_e_5:   'Line 5 — Advertising',
  sch_e_6:   'Line 6 — Auto & travel',
  sch_e_7:   'Line 7 — Cleaning & maintenance',
  sch_e_8:   'Line 8 — Commissions',
  sch_e_9:   'Line 9 — Insurance',
  sch_e_10:  'Line 10 — Legal & professional fees',
  sch_e_11:  'Line 11 — Management fees',
  sch_e_12:  'Line 12 — Mortgage interest',
  sch_e_13:  'Line 13 — Other interest',
  sch_e_14:  'Line 14 — Repairs',
  sch_e_15:  'Line 15 — Supplies',
  sch_e_16:  'Line 16 — Taxes',
  sch_e_17:  'Line 17 — Utilities',
  sch_e_18:  'Line 18 — Professional fees',
  sch_e_19:  'Line 19 — Other expenses',
  sch_e_19a: 'Line 19a — Travel',
  sch_e_20:  'Line 20 — Depreciation',
  sch_e_22:  'Line 22 — Total expenses',
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId)
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59);

    // Get all accounts with tax lines and their activity for the year
    const accounts = await prisma.chartOfAccount.findMany({
      where: { landlordId, taxLine: { not: null }, isActive: true },
      include: {
        lines: {
          where: {
            entry: {
              landlordId,
              effectiveDate: { gte: from, lte: to },
            },
          },
          select: { debit: true, credit: true },
        },
      },
    });

    // Group by taxLine
    const byLine: Record<string, { label: string; accounts: Array<{ code: string; name: string; amount: number }>; total: number; isIncome: boolean }> = {};

    for (const acct of accounts) {
      const taxLine = acct.taxLine!;
      const netDebit = acct.lines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
      const amount = Math.abs(netDebit);

      if (!byLine[taxLine]) {
        byLine[taxLine] = {
          label: SCHEDULE_E_LINES[taxLine] ?? taxLine,
          accounts: [],
          total: 0,
          isIncome: acct.type === 'income',
        };
      }
      byLine[taxLine].accounts.push({ code: acct.code, name: acct.name, amount });
      byLine[taxLine].total += amount;
    }

    const totalIncome = Object.values(byLine)
      .filter((g) => g.isIncome)
      .reduce((s, g) => s + g.total, 0);

    const totalExpenses = Object.values(byLine)
      .filter((g) => !g.isIncome)
      .reduce((s, g) => s + g.total, 0);

    const netRentalIncome = totalIncome - totalExpenses;

    // Sort by Schedule E line order
    const lines = Object.entries(byLine)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([lineKey, data]) => ({ lineKey, ...data }));

    return NextResponse.json({
      success: true,
      data: { year, from: from.toISOString(), to: to.toISOString(), lines, totalIncome, totalExpenses, netRentalIncome },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
