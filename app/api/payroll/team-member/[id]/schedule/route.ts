/**
 * POST /api/payroll/team-member/[id]/schedule
 *
 * Set or clear the team member's pay schedule. Enterprise only — Pro
 * doesn't get scheduling per the plan tiering.
 *
 * Body:
 *   {
 *     paySchedule: 'weekly' | 'biweekly' | 'monthly' | null,
 *     paySchedulePayDay?: number,  // 0..6 for weekly/biweekly, 1..31 for monthly
 *     paySchedulePayDate?: string, // ISO date — anchor for "next pay day"
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { getPayrollAccess, PayrollAccessError } from '@/lib/services/payroll-access';

const VALID_SCHEDULES = new Set(['weekly', 'biweekly', 'monthly']);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const access = await getPayrollAccess();
    access.assertFull(); // Enterprise only.

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      paySchedule?: 'weekly' | 'biweekly' | 'monthly' | null;
      paySchedulePayDay?: number;
      paySchedulePayDate?: string;
    };

    const tm = await prisma.teamMember.findUnique({
      where: { id },
      select: { landlordId: true },
    });
    if (!tm || tm.landlordId !== access.landlordId) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    if (body.paySchedule === null) {
      await prisma.teamMember.update({
        where: { id },
        data: {
          paySchedule: null,
          paySchedulePayDay: null,
          paySchedulePayDate: null,
        },
      });
      return NextResponse.json({ success: true, cleared: true });
    }

    if (!body.paySchedule || !VALID_SCHEDULES.has(body.paySchedule)) {
      return NextResponse.json(
        { error: 'paySchedule must be weekly, biweekly, or monthly.' },
        { status: 400 }
      );
    }

    const day = Number(body.paySchedulePayDay);
    if (!Number.isFinite(day)) {
      return NextResponse.json(
        { error: 'paySchedulePayDay is required.' },
        { status: 400 }
      );
    }
    if (
      (body.paySchedule === 'weekly' || body.paySchedule === 'biweekly') &&
      (day < 0 || day > 6)
    ) {
      return NextResponse.json(
        { error: 'paySchedulePayDay must be 0–6 for weekly/biweekly.' },
        { status: 400 }
      );
    }
    if (body.paySchedule === 'monthly' && (day < 1 || day > 31)) {
      return NextResponse.json(
        { error: 'paySchedulePayDay must be 1–31 for monthly.' },
        { status: 400 }
      );
    }

    const date = body.paySchedulePayDate
      ? new Date(body.paySchedulePayDate)
      : computeNextPayDate(body.paySchedule, day);

    await prisma.teamMember.update({
      where: { id },
      data: {
        paySchedule: body.paySchedule,
        paySchedulePayDay: day,
        paySchedulePayDate: date,
      },
    });
    return NextResponse.json({
      success: true,
      paySchedule: body.paySchedule,
      paySchedulePayDay: day,
      paySchedulePayDate: date.toISOString(),
    });
  } catch (err: any) {
    if (err instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.code === 'owner_only' ? 403 : 402 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Could not update schedule.' },
      { status: 500 }
    );
  }
}

/** Compute the next pay date strictly in the future from today. */
function computeNextPayDate(
  schedule: 'weekly' | 'biweekly' | 'monthly',
  day: number
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today);

  if (schedule === 'monthly') {
    // First occurrence of `day` ≥ today.
    next.setDate(day);
    if (next < today) next.setMonth(next.getMonth() + 1);
    return next;
  }

  // weekly / biweekly — find the next occurrence of the target weekday.
  const todayDay = today.getDay();
  const diff = (day - todayDay + 7) % 7 || 7; // never today; always next
  next.setDate(today.getDate() + diff);
  return next;
}
