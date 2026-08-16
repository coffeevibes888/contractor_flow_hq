/**
 * GET /api/mobile/pm/team/payroll
 *
 * Returns recent team payments + payroll summary (total paid YTD, this
 * month, pending count). Mirrors the website's Payroll page.
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
      select: { id: true },
    });
    if (!landlord) {
      return NextResponse.json({
        payments: [],
        summary: { paidYTD: 0, paidThisMonth: 0, pendingCount: 0, completedCount: 0 },
      });
    }

    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [payments, ytd, mtd, pending, completed] = await Promise.all([
      prisma.teamPayment.findMany({
        where: { landlordId: landlord.id },
        include: {
          teamMember: { include: { user: { select: { name: true, image: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.teamPayment.aggregate({
        where: { landlordId: landlord.id, status: 'completed', paidAt: { gte: startOfYear } },
        _sum: { netAmount: true },
      }),
      prisma.teamPayment.aggregate({
        where: { landlordId: landlord.id, status: 'completed', paidAt: { gte: startOfMonth } },
        _sum: { netAmount: true },
      }),
      prisma.teamPayment.count({
        where: { landlordId: landlord.id, status: { in: ['pending', 'processing'] } },
      }),
      prisma.teamPayment.count({
        where: { landlordId: landlord.id, status: 'completed' },
      }),
    ]);

    return NextResponse.json({
      summary: {
        paidYTD: Number(ytd._sum.netAmount ?? 0),
        paidThisMonth: Number(mtd._sum.netAmount ?? 0),
        pendingCount: pending,
        completedCount: completed,
      },
      payments: payments.map((p) => ({
        id: p.id,
        paymentType: p.paymentType,
        grossAmount: Number(p.grossAmount),
        netAmount: Number(p.netAmount),
        platformFee: Number(p.platformFee),
        description: p.description,
        status: p.status,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        teamMember: {
          id: p.teamMember.id,
          name: p.teamMember.user?.name ?? p.teamMember.invitedEmail ?? 'Member',
          image: p.teamMember.user?.image ?? null,
          role: p.teamMember.role,
        },
      })),
    });
  } catch (error: any) {
    console.error('[mobile/pm/team/payroll]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
