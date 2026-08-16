/**
 * GET  /api/mobile/contractor/clock          → current open entry, if any
 * POST /api/mobile/contractor/clock          → { action: 'clock_in' | 'clock_out', jobId?, location? }
 *
 * Mobile-auth (Bearer token) replacement for the website's session-cookie
 * based /api/contractor/time/clock. The previous mobile screen called the
 * web-only route, which can't authenticate against a Bearer token — that
 * is why the Clock In button looked like it did nothing.
 *
 * Authorization
 * - The token's user can be a contractor *owner* (`role === 'contractor'`)
 *   or a contractor *employee* (`role === 'employee'`). Both paths land
 *   on the same `contractorTimeEntry` row; the difference is whether
 *   `employeeId` is the contractor profile id or the employee record id.
 *
 * Why mirror the web logic instead of importing it
 * - The web route uses `auth()` (NextAuth session). Calling it from a
 *   Bearer-token request returns `null`, so we replicate the same Prisma
 *   shape here. The two routes can be consolidated later behind a shared
 *   service if we ever need a third caller.
 */

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

interface ResolvedActor {
  contractorId: string;
  /** Employee record id when an employee is clocking themself in. Null
   *  when the contractor *owner* is clocking themselves in (the legacy
   *  app supports both — see the dispatch ManualPunchButton on web). */
  employeeId: string | null;
  /** Optional employee user id, used for notifications. */
  employeeUserId: string | null;
}

async function resolveActor(userId: string, role: string): Promise<ResolvedActor | null> {
  const db = prisma as any;

  if (role === 'contractor' || role === 'admin' || role === 'superAdmin') {
    const profile = await db.contractorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;

    // A contractor owner may also have a self-employee record (rare —
    // happens when an owner adds themselves to the crew so they show up on
    // the dispatch board). If they do, prefer that — otherwise clock as
    // the bare contractor.
    const selfEmployee = await db.contractorEmployee.findFirst({
      where: { contractorId: profile.id, userId, status: 'active' },
      select: { id: true, userId: true },
    });

    return {
      contractorId: profile.id,
      employeeId: selfEmployee?.id ?? null,
      employeeUserId: selfEmployee?.userId ?? userId,
    };
  }

  // Employees: find the active employment record and use its contractor id.
  const employee = await db.contractorEmployee.findFirst({
    where: { userId, status: 'active' },
    select: { id: true, contractorId: true, userId: true },
  });
  if (!employee) return null;

  return {
    contractorId: employee.contractorId,
    employeeId: employee.id,
    employeeUserId: employee.userId,
  };
}

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  return verifyMobileToken(token);
}

// ─── GET — current open entry ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const payload = await authenticate(req);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actor = await resolveActor(payload.userId, payload.role);
    if (!actor) return NextResponse.json({ error: 'No contractor profile' }, { status: 404 });

    const db = prisma as any;
    const active = await db.contractorTimeEntry.findFirst({
      where: {
        contractorId: actor.contractorId,
        employeeId: actor.employeeId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
      include: {
        job: { select: { id: true, title: true, jobNumber: true } },
      },
    });

    return NextResponse.json({
      active: active
        ? {
            id: active.id,
            clockIn: active.clockIn,
            clockInLocation: active.clockInLocation,
            jobId: active.job?.id ?? null,
            jobTitle: active.job?.title ?? null,
            jobNumber: active.job?.jobNumber ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('[mobile/contractor/clock GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST — clock in / clock out ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = await authenticate(req);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actor = await resolveActor(payload.userId, payload.role);
    if (!actor) return NextResponse.json({ error: 'No contractor profile' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const jobId = typeof body?.jobId === 'string' ? body.jobId : null;
    const entryId = typeof body?.entryId === 'string' ? body.entryId : null;
    const location = body?.location ?? null;

    if (action !== 'clock_in' && action !== 'clock_out') {
      return NextResponse.json(
        { error: "action must be 'clock_in' or 'clock_out'" },
        { status: 400 },
      );
    }

    const db = prisma as any;

    if (action === 'clock_in') {
      // Don't allow double-clock-in.
      const existing = await db.contractorTimeEntry.findFirst({
        where: {
          contractorId: actor.contractorId,
          employeeId: actor.employeeId,
          clockOut: null,
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Already clocked in. Clock out first.' },
          { status: 400 },
        );
      }

      // Validate the optional job belongs to this contractor.
      if (jobId) {
        const job = await db.contractorJob.findFirst({
          where: { id: jobId, contractorId: actor.contractorId },
          select: { id: true },
        });
        if (!job) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
      }

      const entry = await db.contractorTimeEntry.create({
        data: {
          contractorId: actor.contractorId,
          employeeId: actor.employeeId,
          jobId: jobId,
          clockIn: new Date(),
          clockInLocation: location,
          status: 'pending',
        },
        include: {
          job: { select: { id: true, title: true, jobNumber: true } },
        },
      });

      return NextResponse.json({
        success: true,
        entry: {
          id: entry.id,
          clockIn: entry.clockIn,
          clockOut: null,
          jobId: entry.job?.id ?? null,
          jobTitle: entry.job?.title ?? null,
          jobNumber: entry.job?.jobNumber ?? null,
        },
      });
    }

    // ── clock_out ──────────────────────────────────────────────────────────
    let activeEntry = null;
    if (entryId) {
      activeEntry = await db.contractorTimeEntry.findFirst({
        where: {
          id: entryId,
          contractorId: actor.contractorId,
          employeeId: actor.employeeId,
          clockOut: null,
        },
      });
    }
    if (!activeEntry) {
      activeEntry = await db.contractorTimeEntry.findFirst({
        where: {
          contractorId: actor.contractorId,
          employeeId: actor.employeeId,
          clockOut: null,
        },
        orderBy: { clockIn: 'desc' },
      });
    }
    if (!activeEntry) {
      return NextResponse.json({ error: 'No active clock-in found' }, { status: 400 });
    }

    const clockOut = new Date();
    const durationMinutes = Math.max(
      0,
      Math.floor((clockOut.getTime() - new Date(activeEntry.clockIn).getTime()) / 60_000),
    );

    const updated = await db.contractorTimeEntry.update({
      where: { id: activeEntry.id },
      data: {
        clockOut,
        clockOutLocation: location,
        duration: durationMinutes,
        billableHours: durationMinutes / 60,
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        id: updated.id,
        clockIn: updated.clockIn,
        clockOut: updated.clockOut,
        durationMinutes,
      },
    });
  } catch (error) {
    console.error('[mobile/contractor/clock POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
