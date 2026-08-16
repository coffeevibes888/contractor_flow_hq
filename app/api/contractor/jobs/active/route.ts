import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';

/**
 * GET /api/contractor/jobs/active
 *
 * Lightweight list of jobs that aren't completed/cancelled, for use in
 * pickers (scheduling, dispatch, etc.). Returns only the fields the picker
 * needs — the full job page hits a heavier endpoint.
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

    if (!ca.isOwner && !can(ca, 'jobs.view')) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to view jobs' },
        { status: 403 },
      );
    }

    const jobs = await prisma.contractorJob.findMany({
      where: {
        contractorId: ca.contractorId,
        status: { in: ['quoted', 'approved', 'scheduled', 'in_progress', 'on_hold'] },
      },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        address: true,
        city: true,
        state: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('GET /api/contractor/jobs/active', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
