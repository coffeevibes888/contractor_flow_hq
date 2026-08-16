/**
 * Depreciation API
 * GET  ?landlordId=  — list posted depreciation entries
 * POST              — calculate and post a straight-line depreciation journal entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingManagement } from '@/lib/accounting/feature-gate';
import { postJournalEntry } from '@/lib/accounting/gl';
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

    await assertAccountingManagement(landlordId);

    // List past depreciation journal entries
    const entries = await prisma.journalEntry.findMany({
      where: { landlordId, source: 'system', memo: { contains: 'depreciation' } },
      orderBy: { effectiveDate: 'desc' },
      take: 100,
      include: {
        lines: {
          include: { account: { select: { code: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { landlordId, assetCost, salvageValue, usefulLifeYears, effectiveDate, propertyId, memo } = body;

    if (!landlordId || assetCost === undefined || usefulLifeYears === undefined)
      return NextResponse.json({ success: false, message: 'landlordId, assetCost, and usefulLifeYears are required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    // Straight-line monthly depreciation
    const annualDepreciation = (assetCost - (salvageValue ?? 0)) / usefulLifeYears;
    const monthlyDepreciation = annualDepreciation / 12;

    if (monthlyDepreciation <= 0)
      return NextResponse.json({ success: false, message: 'Depreciation amount must be positive' }, { status: 400 });

    const date = effectiveDate ? new Date(effectiveDate) : new Date();

    const entry = await postJournalEntry({
      landlordId,
      effectiveDate: date,
      memo: memo ?? `Straight-line depreciation — ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      source: 'system',
      createdBy: session.user.id,
      lines: [
        // Debit: Depreciation Expense
        { accountCode: '5900', debit: monthlyDepreciation, propertyId: propertyId ?? undefined },
        // Credit: Accumulated Depreciation — Buildings
        { accountCode: '1420', credit: monthlyDepreciation, propertyId: propertyId ?? undefined },
      ],
    });

    if (!entry) {
      return NextResponse.json({ success: false, message: 'Depreciation entry could not be posted' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { entryId: entry.entryId, monthlyAmount: monthlyDepreciation, annualAmount: annualDepreciation },
    }, { status: 201 });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
