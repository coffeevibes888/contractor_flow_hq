import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';
import { ignoreBankTransaction } from '@/lib/banking/stripe-bank-sync';

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

    let body: { landlordId?: string; note?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }
    const { landlordId, note } = body;
    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });
    }
    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }
    await assertAccountingLedger(landlordId);

    const bt = await prisma.bankTransaction.findFirst({
      where: { id: bankTransactionId, landlordId },
    });
    if (!bt) return NextResponse.json({ success: false, message: 'Bank transaction not found' }, { status: 404 });

    await ignoreBankTransaction(bankTransactionId, session.user.id, note);
    return NextResponse.json({ success: true, data: { bankTransactionId } });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
