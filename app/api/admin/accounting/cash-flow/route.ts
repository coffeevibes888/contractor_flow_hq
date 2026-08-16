/**
 * Cash Flow Statement API
 * GET ?landlordId=&from=&to=
 *
 * Operating: rent income - operating expenses
 * Investing: capex (repairs tagged as capital, depreciation)
 * Financing: mortgage payments, owner distributions
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingReports } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

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

    await assertAccountingReports(landlordId);

    const now = new Date();
    const from = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : new Date(now.getFullYear(), 0, 1); // YTD default
    const to = searchParams.get('to')
      ? new Date(searchParams.get('to')!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Pull journal lines grouped by account type for the period
    const lines = await prisma.journalLine.findMany({
      where: {
        entry: {
          landlordId,
          effectiveDate: { gte: from, lte: to },
        },
      },
      include: {
        account: { select: { code: true, name: true, type: true, subType: true } },
        entry: { select: { source: true } },
      },
    });

    // Rent payments = income credits
    const rentIncome = lines
      .filter((l) => l.account.type === 'income' && Number(l.credit) > 0)
      .reduce((s, l) => s + Number(l.credit), 0);

    // Operating expenses (subType = operating_expense, tax_expense)
    const operatingExpenses = lines
      .filter((l) =>
        l.account.type === 'expense' &&
        ['operating_expense', 'tax_expense'].includes(l.account.subType ?? '') &&
        Number(l.debit) > 0
      )
      .reduce((s, l) => s + Number(l.debit), 0);

    // Management / professional fees
    const managementFees = lines
      .filter((l) =>
        l.account.type === 'expense' &&
        l.account.subType === 'operating_expense' &&
        (l.account.code >= '5500' && l.account.code <= '5699') &&
        Number(l.debit) > 0
      )
      .reduce((s, l) => s + Number(l.debit), 0);

    const netOperating = rentIncome - operatingExpenses;

    // Investing — capital repairs, depreciation
    const capex = lines
      .filter((l) =>
        l.account.type === 'expense' &&
        l.account.code === '5100' &&
        Number(l.debit) > 0
      )
      .reduce((s, l) => s + Number(l.debit), 0);

    const depreciation = lines
      .filter((l) => l.account.code === '5900' && Number(l.debit) > 0)
      .reduce((s, l) => s + Number(l.debit), 0);

    const netInvesting = -(capex); // negative = cash out

    // Financing — distributions, mortgage
    const distributions = lines
      .filter((l) => l.account.code === '5800' && Number(l.debit) > 0)
      .reduce((s, l) => s + Number(l.debit), 0);

    const mortgageInterest = lines
      .filter((l) => l.account.code === '5910' && Number(l.debit) > 0)
      .reduce((s, l) => s + Number(l.debit), 0);

    const netFinancing = -(distributions + mortgageInterest);

    // Breakdown rows for display
    const operating = [
      { label: 'Rent income collected', amount: rentIncome, positive: true },
      { label: 'Operating expenses paid', amount: -operatingExpenses, positive: operatingExpenses === 0 },
    ];

    const investing = [
      { label: 'Repairs & maintenance capex', amount: -capex, positive: capex === 0 },
      { label: 'Depreciation (non-cash add-back)', amount: depreciation, positive: true },
    ];

    const financing = [
      { label: 'Owner distributions', amount: -distributions, positive: distributions === 0 },
      { label: 'Mortgage interest paid', amount: -mortgageInterest, positive: mortgageInterest === 0 },
    ];

    const netChange = netOperating + netInvesting + netFinancing;

    return NextResponse.json({
      success: true,
      data: {
        from: from.toISOString(),
        to: to.toISOString(),
        operating,
        investing,
        financing,
        netOperating,
        netInvesting,
        netFinancing,
        netChange,
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
