import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';

/**
 * GET /api/contractor/team/members
 *
 * Lightweight list of team members for use in dropdowns and pickers (e.g.
 * the scheduling tab, time-tracking, dispatch). Only returns active and
 * invited employees so we don't show terminated people in pickers.
 *
 * Visible to anyone with `team.view`. Non-owner employees without that
 * permission get a 403 — they shouldn't even know who else is on the team.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const ca = await resolveContractorAuth(session.user.id);
    if (!ca) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    if (!ca.isOwner && !can(ca, 'team.view')) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to view the team' },
        { status: 403 },
      );
    }

    const employees = await prisma.contractorEmployee.findMany({
      where: {
        contractorId: ca.contractorId,
        status: { in: ['active', 'invited'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photo: true,
        role: true,
        email: true,
        assignedRole: { select: { id: true, name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const members = employees.map((e) => ({
      id: e.id,
      name:
        `${e.firstName} ${e.lastName}`.trim() ||
        e.email ||
        'Unnamed team member',
      image: e.photo,
      role: e.assignedRole?.name || e.role,
    }));

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('GET /api/contractor/team/members', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
