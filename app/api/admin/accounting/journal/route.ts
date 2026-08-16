/**
 * Manual Journal Entry API
 * POST — create a manual double-entry journal entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingManagement } from '@/lib/accounting/feature-gate';
import { postJournalEntry } from '@/lib/accounting/gl';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { landlordId, effectiveDate, memo, lines } = body;

    if (!landlordId || !effectiveDate || !lines || !Array.isArray(lines) || lines.length < 2)
      return NextResponse.json({ success: false, message: 'landlordId, effectiveDate, and at least 2 lines are required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    // Validate lines balance
    const totalDebit = lines.reduce((s: number, l: { debit?: number }) => s + (l.debit ?? 0), 0);
    const totalCredit = lines.reduce((s: number, l: { credit?: number }) => s + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01)
      return NextResponse.json({
        success: false,
        message: `Journal entry is not balanced: debits ${totalDebit.toFixed(2)} ≠ credits ${totalCredit.toFixed(2)}`,
      }, { status: 400 });

    const entry = await postJournalEntry({
      landlordId,
      effectiveDate: new Date(effectiveDate),
      memo,
      source: 'manual_adjustment',
      createdBy: session.user.id,
      lines,
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
