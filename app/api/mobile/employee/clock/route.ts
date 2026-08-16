/**
 * POST /api/mobile/employee/clock
 *
 * Body: { action: 'in' | 'out', location?: { lat, lng, address? }, jobId?, notes? }
 *
 * Works for both ContractorEmployee and TeamMember.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { action, location, jobId, notes } = body as {
      action: 'in' | 'out';
      location?: { lat: number; lng: number; address?: string };
      jobId?: string;
      notes?: string;
    };

    if (action !== 'in' && action !== 'out') {
      return NextResponse.json({ error: 'action must be "in" or "out"' }, { status: 400 });
    }

    const db = prisma as any;

    const contractorEmp = await db.contractorEmployee.findFirst({
      where: { userId: payload.userId },
    });
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: payload.userId },
    });

    if (!contractorEmp && !teamMember) {
      return NextResponse.json({ error: 'No employee profile' }, { status: 404 });
    }

    const now = new Date();

    if (contractorEmp) {
      // Find active entry
      const active = await db.contractorTimeEntry.findFirst({
        where: { employeeId: contractorEmp.id, clockOut: null },
      });

      if (action === 'in') {
        if (active) {
          return NextResponse.json({ error: 'Already clocked in', entryId: active.id }, { status: 400 });
        }
        const entry = await db.contractorTimeEntry.create({
          data: {
            contractorId: contractorEmp.contractorId,
            employeeId: contractorEmp.id,
            jobId: jobId ?? null,
            clockIn: now,
            clockInLocation: location ?? null,
            notes: notes ?? null,
            status: 'pending',
          },
        });
        return NextResponse.json({ success: true, entryId: entry.id, clockIn: entry.clockIn });
      } else {
        if (!active) {
          return NextResponse.json({ error: 'Not clocked in' }, { status: 400 });
        }
        const duration = Math.floor((now.getTime() - new Date(active.clockIn).getTime()) / 60000);
        await db.contractorTimeEntry.update({
          where: { id: active.id },
          data: {
            clockOut: now,
            clockOutLocation: location ?? null,
            duration,
            notes: notes ? `${active.notes ?? ''}\n${notes}`.trim() : active.notes,
          },
        });
        return NextResponse.json({ success: true, durationMinutes: duration });
      }
    } else if (teamMember) {
      const active = await prisma.timeEntry.findFirst({
        where: { teamMemberId: teamMember.id, clockOut: null },
      });

      if (action === 'in') {
        if (active) {
          return NextResponse.json({ error: 'Already clocked in', entryId: active.id }, { status: 400 });
        }
        const entry = await prisma.timeEntry.create({
          data: {
            landlordId: teamMember.landlordId,
            teamMemberId: teamMember.id,
            clockIn: now,
            clockInLat: location?.lat,
            clockInLng: location?.lng,
            notes: notes ?? null,
          },
        });
        return NextResponse.json({ success: true, entryId: entry.id, clockIn: entry.clockIn });
      } else {
        if (!active) {
          return NextResponse.json({ error: 'Not clocked in' }, { status: 400 });
        }
        const totalMinutes = Math.floor((now.getTime() - active.clockIn.getTime()) / 60000);
        await prisma.timeEntry.update({
          where: { id: active.id },
          data: {
            clockOut: now,
            clockOutLat: location?.lat,
            clockOutLng: location?.lng,
            totalMinutes,
            notes: notes ? `${active.notes ?? ''}\n${notes}`.trim() : active.notes,
          },
        });
        return NextResponse.json({ success: true, durationMinutes: totalMinutes });
      }
    }

    return NextResponse.json({ error: 'Unknown employee type' }, { status: 500 });
  } catch (error) {
    console.error('[mobile/employee/clock]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
