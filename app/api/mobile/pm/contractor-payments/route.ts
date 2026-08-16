/**
 * GET /api/mobile/pm/contractor-payments
 *
 * Mirrors the website's "Payments" tab on /admin/contractors. Returns
 * payments owned by the authed PM's landlord plus a small summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

async function landlordFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  return prisma.landlord
    .findFirst({ where: { ownerUserId: payload.userId }, select: { id: true } })
    .then((l) => (l ? { id: l.id } : null));
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId') ?? undefined;

    const where: any = { landlordId: ctx.id };
    if (contractorId) where.contractorId = contractorId;

    const payments = await prisma.contractorPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contractor: { select: { id: true, name: true, email: true } },
        workOrder: { select: { id: true, title: true } },
      },
      take: 100,
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const totals = payments.reduce(
      (acc, p) => {
        const amt = Number(p.amount ?? 0);
        const fee = Number(p.platformFee ?? 0);
        acc.totalSpent += amt;
        acc.totalFees += fee;
        if (p.status === 'pending') acc.pending += amt;
        if (new Date(p.createdAt) >= startOfMonth) acc.thisMonth += amt;
        return acc;
      },
      { totalSpent: 0, totalFees: 0, pending: 0, thisMonth: 0 },
    );

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        platformFee: Number(p.platformFee ?? 0),
        netAmount: Number(p.netAmount ?? 0),
        status: p.status,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        contractor: p.contractor,
        workOrder: p.workOrder,
      })),
      totals,
    });
  } catch (e: any) {
    console.error('mobile pm/contractor-payments GET', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
