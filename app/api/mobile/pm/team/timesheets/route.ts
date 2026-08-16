/**
 * GET /api/mobile/pm/team/timesheets
 *
 * Returns recent timesheets across the landlord's team with status,
 * hours, and member info. Mirrors the website's Timesheets page.
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
      return NextResponse.json({ timesheets: [], counts: { draft: 0, submitted: 0, approved: 0, paid: 0 } });
    }

    const timesheets = await prisma.timesheet.findMany({
      where: { landlordId: landlord.id },
      include: {
        teamMember: {
          include: { user: { select: { name: true, image: true } } },
        },
      },
      orderBy: { periodEnd: 'desc' },
      take: 50,
    });

    const counts = {
      draft: timesheets.filter((t) => t.status === 'draft').length,
      submitted: timesheets.filter((t) => t.status === 'submitted').length,
      approved: timesheets.filter((t) => t.status === 'approved').length,
      paid: timesheets.filter((t) => t.status === 'paid').length,
    };

    return NextResponse.json({
      counts,
      timesheets: timesheets.map((t) => ({
        id: t.id,
        periodStart: t.periodStart.toISOString(),
        periodEnd: t.periodEnd.toISOString(),
        totalHours: Number(t.totalHours),
        regularHours: Number(t.regularHours),
        overtimeHours: Number(t.overtimeHours),
        status: t.status,
        submittedAt: t.submittedAt?.toISOString() ?? null,
        reviewedAt: t.reviewedAt?.toISOString() ?? null,
        teamMember: {
          id: t.teamMember.id,
          name: t.teamMember.user?.name ?? t.teamMember.invitedEmail ?? 'Member',
          image: t.teamMember.user?.image ?? null,
          role: t.teamMember.role,
          hourlyRate: t.teamMember.hourlyRate ? Number(t.teamMember.hourlyRate) : null,
        },
      })),
    });
  } catch (error: any) {
    console.error('[mobile/pm/team/timesheets]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
