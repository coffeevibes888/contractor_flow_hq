/**
 * POST /api/mobile/contractor/clock/heartbeat
 *
 * While a crew member is clocked in, the mobile app pings this endpoint
 * every ~60s with their current GPS coordinates. We store the most-recent
 * location on the open `contractorTimeEntry.lastLocation` JSON column so
 * the Live Crew Map can show real-time positions, not just where the
 * person clocked in.
 *
 * Body:  { lat: number, lng: number, accuracy?: number, address?: string }
 * Auth:  Bearer mobile token, contractor or employee role.
 *
 * Response: { ok: true } on success; 4xx with `{ error }` otherwise.
 *
 * Why a separate endpoint
 * - Keeps the high-frequency heartbeat traffic isolated from the lower-
 *   frequency clock-in/out POST so we can rate-limit it independently.
 * - Returns immediately after a single Prisma update so the device can
 *   batch heartbeats with minimal battery cost.
 */

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

interface ResolvedActor {
  contractorId: string;
  employeeId: string | null;
}

async function resolveActor(userId: string, role: string): Promise<ResolvedActor | null> {
  const db = prisma as any;
  if (role === 'contractor' || role === 'admin' || role === 'superAdmin') {
    const profile = await db.contractorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    const selfEmployee = await db.contractorEmployee.findFirst({
      where: { contractorId: profile.id, userId, status: 'active' },
      select: { id: true },
    });
    return { contractorId: profile.id, employeeId: selfEmployee?.id ?? null };
  }
  const employee = await db.contractorEmployee.findFirst({
    where: { userId, status: 'active' },
    select: { id: true, contractorId: true },
  });
  if (!employee) return null;
  return { contractorId: employee.contractorId, employeeId: employee.id };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const actor = await resolveActor(payload.userId, payload.role);
    if (!actor) {
      return NextResponse.json({ error: 'No contractor profile' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const lat = typeof body?.lat === 'number' ? body.lat : null;
    const lng = typeof body?.lng === 'number' ? body.lng : null;
    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const accuracy = typeof body?.accuracy === 'number' ? body.accuracy : null;
    const address = typeof body?.address === 'string' ? body.address : null;

    const db = prisma as any;
    const open = await db.contractorTimeEntry.findFirst({
      where: {
        contractorId: actor.contractorId,
        employeeId: actor.employeeId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
      select: { id: true, clockInLocation: true },
    });
    if (!open) {
      return NextResponse.json({ error: 'Not clocked in' }, { status: 400 });
    }

    // Store the latest location on the open entry. We piggyback on the
    // existing `clockInLocation` JSON column by adding a `lastSeen` block
    // to it — that way nothing needs a schema migration to ship today.
    // Long-term we should add a dedicated `lastLocation` column; for now
    // this is forward-compatible: existing readers ignore unknown keys.
    const merged = {
      ...(open.clockInLocation as Record<string, unknown> | null),
      lastSeen: { lat, lng, accuracy, address, at: new Date().toISOString() },
    };

    await db.contractorTimeEntry.update({
      where: { id: open.id },
      data: { clockInLocation: merged },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mobile/contractor/clock/heartbeat]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
