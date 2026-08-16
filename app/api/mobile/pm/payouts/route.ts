/**
 * Legacy payouts endpoint — preserved so the existing mobile Payouts
 * screen keeps working while the new Wallet screen takes the spotlight.
 *
 * Pulls from the canonical LandlordWallet + WalletTransaction tables
 * (the legacy fields on Landlord like `availableBalance` / `bankLast4`
 * never existed on the Prisma model).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: {
        id: true,
        stripeConnectAccountId: true,
        stripeOnboardingStatus: true,
      },
    });

    if (!landlord) return NextResponse.json({ payout: null, history: [] });

    const wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId: landlord.id },
      select: {
        id: true,
        availableBalance: true,
        pendingBalance: true,
      },
    });

    let history: { id: string; amount: number; status: string; createdAt: string; notes: string | null }[] = [];
    let totalPaidOut = 0;
    if (wallet) {
      const txns = await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id, type: 'payout' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          status: true,
          description: true,
          createdAt: true,
        },
      });
      history = txns.map((t) => ({
        id: t.id,
        // Payout transactions are stored as negative amounts; surface
        // the absolute value to the mobile UI.
        amount: Math.abs(Number(t.amount)),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        notes: t.description,
      }));
      totalPaidOut = history
        .filter((t) => t.status === 'completed')
        .reduce((s, t) => s + t.amount, 0);
    }

    return NextResponse.json({
      payout: {
        availableBalance: wallet ? Number(wallet.availableBalance) : 0,
        pendingBalance:   wallet ? Number(wallet.pendingBalance)   : 0,
        totalPaidOut,
        hasStripeAccount: !!landlord.stripeConnectAccountId,
        payoutMethod: landlord.stripeConnectAccountId ? 'stripe' : 'none',
        bankLast4: null,
      },
      history,
    });
  } catch (error) {
    console.error('[mobile/pm/payouts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
