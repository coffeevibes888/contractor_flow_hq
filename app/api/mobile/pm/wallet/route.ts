/**
 * GET /api/mobile/pm/wallet
 *
 * Mobile-friendly slice of the website's /admin/wallet page. Returns:
 *   - balance: { available, pending, lastPayoutAt }
 *   - kpis: { totalReceived, thisMonth, pending, payoutsCount }
 *   - recentPayments: 10 most recent rent payments (paid + processing)
 *   - transactions: 10 most recent wallet transactions
 *   - connect: { hasStripeAccount, onboardingStatus }
 *
 * Uses the LandlordWallet table (not the legacy fields on Landlord).
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

    if (!landlord) {
      return NextResponse.json({
        balance: { available: 0, pending: 0, lastPayoutAt: null },
        kpis: { totalReceived: 0, thisMonth: 0, pending: 0, payoutsCount: 0 },
        recentPayments: [],
        transactions: [],
        connect: { hasStripeAccount: false, onboardingStatus: null },
      });
    }

    // Wallet (created on demand)
    const wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId: landlord.id },
      select: {
        id: true,
        availableBalance: true,
        pendingBalance: true,
        lastPayoutAt: true,
      },
    });

    // KPIs
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [allPaid, processing, recentPayments, txns, payoutsCount] = await Promise.all([
      prisma.rentPayment.findMany({
        where: {
          status: 'paid',
          lease: { unit: { property: { landlordId: landlord.id } } },
        },
        select: { amount: true, paidAt: true },
      }),
      prisma.rentPayment.aggregate({
        where: {
          status: { in: ['processing', 'pending'] },
          lease: { unit: { property: { landlordId: landlord.id } } },
        },
        _sum: { amount: true },
      }),
      prisma.rentPayment.findMany({
        where: {
          status: { in: ['paid', 'processing', 'pending'] },
          lease: { unit: { property: { landlordId: landlord.id } } },
        },
        include: {
          tenant: { select: { name: true } },
          lease: {
            include: {
              unit: { include: { property: { select: { name: true } } } },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        take: 10,
      }),
      wallet
        ? prisma.walletTransaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              type: true,
              amount: true,
              description: true,
              status: true,
              createdAt: true,
              availableAt: true,
            },
          })
        : Promise.resolve([]),
      wallet
        ? prisma.walletTransaction.count({
            where: { walletId: wallet.id, type: 'payout' },
          })
        : Promise.resolve(0),
    ]);

    const totalReceived = allPaid.reduce((s, p) => s + Number(p.amount), 0);
    const thisMonth = allPaid
      .filter((p) => p.paidAt && p.paidAt >= startOfMonth)
      .reduce((s, p) => s + Number(p.amount), 0);
    const pendingTotal = Number(processing._sum.amount ?? 0);

    return NextResponse.json({
      balance: {
        available: wallet ? Number(wallet.availableBalance) : 0,
        pending: wallet ? Number(wallet.pendingBalance) : 0,
        lastPayoutAt: wallet?.lastPayoutAt ? wallet.lastPayoutAt.toISOString() : null,
      },
      kpis: {
        totalReceived,
        thisMonth,
        pending: pendingTotal,
        payoutsCount,
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        paidAt: p.paidAt?.toISOString() ?? null,
        dueDate: p.dueDate?.toISOString() ?? null,
        tenantName: p.tenant?.name ?? 'Unknown',
        propertyName: p.lease?.unit?.property?.name ?? 'Unknown',
        unitName: p.lease?.unit?.name ?? '',
      })),
      transactions: txns.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        availableAt: t.availableAt?.toISOString() ?? null,
      })),
      connect: {
        hasStripeAccount: !!landlord.stripeConnectAccountId,
        onboardingStatus: landlord.stripeOnboardingStatus,
      },
    });
  } catch (error: any) {
    console.error('[mobile/pm/wallet]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
