/**
 * GET /api/contractor/crew-locations
 *
 * Web counterpart to /api/mobile/contractor/crew-locations. Returns the
 * currently clocked-in crew (active time entries with `clockOut === null`)
 * along with last known GPS coordinates, the job they're working, and how
 * long they've been on the clock. Drives the Live Crew Map dashboard page.
 *
 * Auth: signed-in contractor (via session). Contractor employees are
 * intentionally excluded — only the contractor account owner sees the crew.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Owner-only for now. If you want supervisors/managers to see the map
    // too, add them to this allowlist.
    const allowedRoles = new Set(['contractor', 'admin', 'superAdmin']);
    if (session.user.role && !allowedRoles.has(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const db = prisma as any;

    const activeEntries = await db.contractorTimeEntry.findMany({
      where: {
        contractorId: profile.id,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
      select: {
        id: true,
        clockIn: true,
        clockInLocation: true,
        employee: { select: { id: true, firstName: true, lastName: true, photo: true } },
        job: { select: { id: true, title: true, jobNumber: true } },
      },
    });

    const now = Date.now();
    const crew = activeEntries.map((e: any) => {
      const loc = e.clockInLocation as { lat?: number; lng?: number; address?: string } | null;
      const elapsedMinutes = Math.floor((now - new Date(e.clockIn).getTime()) / 60000);
      return {
        entryId: e.id,
        employeeId: e.employee?.id ?? null,
        employeeName: e.employee
          ? `${e.employee.firstName ?? ''} ${e.employee.lastName ?? ''}`.trim() || 'Unnamed'
          : 'Unnamed',
        employeePhoto: e.employee?.photo ?? null,
        lat: typeof loc?.lat === 'number' ? loc.lat : null,
        lng: typeof loc?.lng === 'number' ? loc.lng : null,
        address: loc?.address ?? null,
        clockIn: new Date(e.clockIn).toISOString(),
        elapsedMinutes,
        jobId: e.job?.id ?? null,
        jobTitle: e.job?.title ?? null,
        jobNumber: e.job?.jobNumber ?? null,
      };
    });

    return NextResponse.json({ crew, count: crew.length });
  } catch (error) {
    console.error('[contractor/crew-locations]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
