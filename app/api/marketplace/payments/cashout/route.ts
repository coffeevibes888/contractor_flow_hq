/**
 * POST /api/marketplace/payments/cashout
 *
 * Contractor → their linked external bank. Net = balance - $1.
 *
 * Body: { amountCents: number, externalAccountId: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  executeContractorCashout,
  MARKETPLACE_MIN_CASHOUT_CENTS,
  MARKETPLACE_PLATFORM_FEE_CENTS,
  reasonToUserMessage,
} from '@/lib/services/treasury-payments.service';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      amountCents?: number;
      externalAccountId?: string;
    };
    const amountCents = Math.round(Number(body.amountCents || 0));

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than zero.' },
        { status: 400 }
      );
    }
    if (amountCents < MARKETPLACE_MIN_CASHOUT_CENTS) {
      return NextResponse.json(
        { error: reasonToUserMessage('amount_below_minimum') },
        { status: 400 }
      );
    }
    if (!body.externalAccountId?.startsWith('ba_')) {
      return NextResponse.json(
        { error: reasonToUserMessage('no_external_bank') },
        { status: 400 }
      );
    }

    // Caller must be a contractor (or contractor employee owner).
    const profile = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json(
        { error: 'Contractor profile not found.' },
        { status: 404 }
      );
    }

    const result = await executeContractorCashout({
      amountCents,
      contractorProfileId: profile.id,
      externalAccountId: body.externalAccountId,
      callerUserId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, reason: result.reason },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ...result,
      feeCharged: MARKETPLACE_PLATFORM_FEE_CENTS / 100,
      estimatedArrival: '1–3 business days for bank transfer',
    });
  } catch (err: any) {
    console.error('[marketplace/payments/cashout] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not process cashout.' },
      { status: 500 }
    );
  }
}
