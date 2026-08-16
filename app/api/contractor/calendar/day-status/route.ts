import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { contractorSchedulerService } from '@/lib/services/contractor-scheduler';
import { startOfDay, addDays, format, parse, addMinutes } from 'date-fns';

/**
 * GET /api/contractor/calendar/day-status?contractorId=...&start=ISO&end=ISO
 *
 * Returns one entry per day in the range with the *real* booking-availability
 * status — the same logic the instant-book validator uses. This guarantees
 * that what the contractor sees on their calendar matches what a homeowner
 * sees when they try to book.
 *
 * Status values:
 *   - "available"  — at least one slot is bookable
 *   - "partial"    — some slots booked, some still open
 *   - "booked"     — every slot in working hours is taken
 *   - "blocked"    — date is in blocked list
 *   - "off"        — outside working hours / weekly schedule (e.g. weekends)
 *   - "past"       — earlier than min-notice cutoff
 *   - "too-far"    — beyond max-advance days
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    if (!contractorId) {
      return NextResponse.json({ error: 'contractorId required' }, { status: 400 });
    }

    const start = startStr ? new Date(startStr) : startOfDay(new Date());
    const end = endStr ? new Date(endStr) : addDays(start, 60);

    const availability = await contractorSchedulerService.getAvailability(contractorId);

    if (!availability) {
      return NextResponse.json({
        days: [],
        notConfigured: true,
        message: 'Contractor has not configured working hours yet',
      });
    }

    // Pull all non-cancelled appointments in range upfront (one DB call)
    const appointments = await prisma.contractorAppointment.findMany({
      where: {
        contractorId,
        startTime: { gte: start, lte: end },
        status: { not: 'cancelled' },
      },
      select: { id: true, startTime: true, endTime: true, status: true, title: true, serviceType: true },
      orderBy: { startTime: 'asc' },
    });

    const now = new Date();
    const minNoticeCutoff = addMinutes(now, availability.minNoticeHours * 60);
    const maxAdvanceCutoff = addDays(now, availability.maxAdvanceDays);

    const days: Array<{
      date: string; // YYYY-MM-DD
      status: 'available' | 'partial' | 'booked' | 'blocked' | 'off' | 'past' | 'too-far';
      appointments: Array<{ id: string; startTime: string; endTime: string; title: string; status: string; serviceType: string }>;
      reason?: string;
    }> = [];

    let cursor = startOfDay(start);
    while (cursor <= end) {
      const dayKey = format(cursor, 'yyyy-MM-dd');
      const dayAppts = appointments
        .filter((a) => format(a.startTime, 'yyyy-MM-dd') === dayKey)
        .map((a) => ({
          id: a.id,
          startTime: a.startTime.toISOString(),
          endTime: a.endTime.toISOString(),
          title: a.title,
          status: a.status,
          serviceType: a.serviceType,
        }));

      // Blocked check
      const isBlocked = availability.blockedDates.some(
        (b) => startOfDay(new Date(b)).getTime() === cursor.getTime()
      );
      if (isBlocked) {
        days.push({ date: dayKey, status: 'blocked', appointments: dayAppts });
        cursor = addDays(cursor, 1);
        continue;
      }

      // Past min-notice
      if (cursor.getTime() + 24 * 60 * 60 * 1000 - 1 < minNoticeCutoff.getTime()) {
        // Day's last second is still before min-notice cutoff
        days.push({ date: dayKey, status: 'past', appointments: dayAppts });
        cursor = addDays(cursor, 1);
        continue;
      }

      // Beyond max-advance
      if (cursor > maxAdvanceCutoff) {
        days.push({ date: dayKey, status: 'too-far', appointments: dayAppts });
        cursor = addDays(cursor, 1);
        continue;
      }

      // Working day check
      const dayName = format(cursor, 'EEEE').toLowerCase();
      const daySchedule = availability.weeklySchedule[dayName];
      if (!daySchedule || !daySchedule.enabled) {
        days.push({ date: dayKey, status: 'off', appointments: dayAppts });
        cursor = addDays(cursor, 1);
        continue;
      }

      // Compute total possible slots in working window vs how many appointments cover them
      const scheduleStart = parse(daySchedule.start, 'HH:mm', cursor);
      const scheduleEnd = parse(daySchedule.end, 'HH:mm', cursor);
      const workMinutes = Math.max(
        0,
        (scheduleEnd.getTime() - scheduleStart.getTime()) / 60000
      );
      const bookedMinutes = dayAppts.reduce((sum, a) => {
        const overlapStart = Math.max(scheduleStart.getTime(), new Date(a.startTime).getTime());
        const overlapEnd = Math.min(scheduleEnd.getTime(), new Date(a.endTime).getTime());
        return sum + Math.max(0, (overlapEnd - overlapStart) / 60000);
      }, 0);

      let status: 'available' | 'partial' | 'booked';
      if (workMinutes === 0) {
        status = 'booked';
      } else if (bookedMinutes <= 0) {
        status = 'available';
      } else if (bookedMinutes + availability.bufferMinutes >= workMinutes) {
        status = 'booked';
      } else {
        status = 'partial';
      }

      days.push({ date: dayKey, status, appointments: dayAppts });
      cursor = addDays(cursor, 1);
    }

    return NextResponse.json({ days });
  } catch (error) {
    console.error('Failed to compute day status:', error);
    return NextResponse.json({ error: 'Failed to compute day status' }, { status: 500 });
  }
}
