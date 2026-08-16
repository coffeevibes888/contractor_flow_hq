/**
 * GET  /api/mobile/employee/time-off  → list requests
 * POST /api/mobile/employee/time-off  → submit a new request
 *
 * Body for POST:
 *   { type: 'vacation'|'sick'|'personal'|'unpaid', startDate, endDate, hours?, reason? }
 *
 * Note: the website's TimeOffRequest model doesn't have separate `type`
 * or `totalHours` columns yet. We fold those into `reason` so the data
 * isn't silently dropped.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

// Parse "[vacation 8h] my reason here" out of a TimeOffRequest reason field.
function parseReason(raw: string | null): { type: string | null; hours: number | null; reason: string } {
  if (!raw) return { type: null, hours: null, reason: '' };
  const m = raw.match(/^\[([a-z_-]+)(?:\s+(\d+(?:\.\d+)?)h)?\]\s*(.*)$/i);
  if (!m) return { type: null, hours: null, reason: raw };
  return {
    type: m[1].toLowerCase(),
    hours: m[2] ? Number(m[2]) : null,
    reason: m[3] ?? '',
  };
}

function buildReason(type: string | null, hours: number | null, reason: string | null): string {
  const parts: string[] = [];
  if (type) parts.push(hours != null ? `[${type} ${hours}h]` : `[${type}]`);
  if (reason) parts.push(reason);
  return parts.join(' ').trim();
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const db = prisma as any;

    const contractorEmp = await db.contractorEmployee.findFirst({
      where: { userId: payload.userId },
    });
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: payload.userId },
    });

    let requests: {
      id: string;
      type: string | null;
      startDate: string;
      endDate: string;
      hours: number | null;
      reason: string;
      status: string;
      approvedAt: string | null;
      rejectionReason: string | null;
      createdAt: string;
    }[] = [];

    if (contractorEmp) {
      const raw = await db.contractorTimeOff.findMany({
        where: { employeeId: contractorEmp.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      requests = raw.map((r: any) => ({
        id: r.id,
        type: r.type,
        startDate: r.startDate?.toISOString?.() ?? r.startDate,
        endDate: r.endDate?.toISOString?.() ?? r.endDate,
        hours: r.hours ? Number(r.hours) : null,
        reason: r.reason ?? '',
        status: r.status,
        approvedAt: r.approvedAt?.toISOString?.() ?? null,
        rejectionReason: r.rejectionReason ?? null,
        createdAt: r.createdAt.toISOString(),
      }));
    } else if (teamMember) {
      const raw = await prisma.timeOffRequest.findMany({
        where: { teamMemberId: teamMember.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      requests = raw.map((r) => {
        const parsed = parseReason(r.reason);
        return {
          id: r.id,
          type: parsed.type,
          startDate: r.startDate.toISOString(),
          endDate: r.endDate.toISOString(),
          hours: parsed.hours,
          reason: parsed.reason,
          status: r.status,
          approvedAt: r.reviewedAt?.toISOString() ?? null,
          rejectionReason: r.reviewNotes ?? null,
          createdAt: r.createdAt.toISOString(),
        };
      });
    }

    // Quick balances (best effort)
    const usedThisYear = requests.filter(
      (r) => r.status === 'approved' && new Date(r.startDate).getFullYear() === new Date().getFullYear(),
    );
    const usedHours = usedThisYear.reduce((s, r) => s + (r.hours ?? 0), 0);

    return NextResponse.json({
      requests,
      summary: {
        pendingCount: requests.filter((r) => r.status === 'pending').length,
        approvedCount: requests.filter((r) => r.status === 'approved').length,
        usedHoursYTD: usedHours,
      },
    });
  } catch (error) {
    console.error('[mobile/employee/time-off GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { type, startDate, endDate, hours, reason } = body;

    if (!type || !startDate || !endDate) {
      return NextResponse.json({ error: 'type, startDate and endDate are required' }, { status: 400 });
    }

    const db = prisma as any;
    const contractorEmp = await db.contractorEmployee.findFirst({
      where: { userId: payload.userId },
      select: { id: true, contractorId: true },
    });
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: payload.userId },
      select: { id: true, landlordId: true },
    });

    if (!contractorEmp && !teamMember) {
      return NextResponse.json({ error: 'No employee profile' }, { status: 404 });
    }

    let id: string;
    if (contractorEmp) {
      const created = await db.contractorTimeOff.create({
        data: {
          contractorId: contractorEmp.contractorId,
          employeeId: contractorEmp.id,
          type,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          hours: hours ?? null,
          reason: reason ?? '',
          status: 'pending',
        },
      });
      id = created.id;
    } else {
      const created = await prisma.timeOffRequest.create({
        data: {
          landlordId: teamMember!.landlordId,
          teamMemberId: teamMember!.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          // Fold type + hours into reason since the schema doesn't have
          // first-class columns for them.
          reason: buildReason(type, hours ?? null, reason ?? null),
          status: 'pending',
        },
      });
      id = created.id;
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[mobile/employee/time-off POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
