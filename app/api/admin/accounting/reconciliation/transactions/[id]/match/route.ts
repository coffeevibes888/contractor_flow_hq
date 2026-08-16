import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';
import { manualMatch } from '@/lib/banking/stripe-bank-sync';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const bankTransactionId = params.id;
    if (!bankTransactionId) {
      return NextResponse.json({ success: false, message: 'id is required' }, { status: 400 });
    }

    let body: { landlordId?: string; journalEntryId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }
    const { landlordId, journalEntryId } = body;
    if (!landlordId || !journalEntryId) {
      return NextResponse.json({ success: false, message: 'landlordId and journalEntryId are required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }
    await assertAccountingLedger(landlordId);

    const [bt, je] = await Promise.all([
      prisma.bankTransaction.findFirst({ where: { id: bankTransactionId, landlordId } }),
      prisma.journalEntry.findFirst({ where: { id: journalEntryId, landlordId } }),
    ]);
    if (!bt) return NextResponse.json({ success: false, message: 'Bank transaction not found' }, { status: 404 });
    if (!je) return NextResponse.json({ success: false, message: 'Journal entry not found' }, { status: 404 });

    await manualMatch({ bankTransactionId, journalEntryId, userId: session.user.id });

    return NextResponse.json({ success: true, data: { bankTransactionId, journalEntryId } });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
