/**
 * GET /api/mobile/public/listings/:slug/schedule?date=YYYY-MM-DD
 *
 * Public viewing-schedule lookup for the mobile listing detail screen.
 * Mirrors the data the website's `<PropertyScheduler />` consumes via the
 * `getPropertySchedule` / `getPropertyAppointments` server actions, but
 * exposed as a fetchable JSON endpoint so the native app can render its
 * own scheduler without an authenticated session.
 *
 * Response:
 *   {
 *     schedule: {                               // null when no PM-defined schedule
 *       timezone: string,
 *       slotDuration: number,                   // minutes
 *       schedule: { monday: { enabled, slots[] }, ... }
 *     } | null,
 *     date: string,                             // ISO date that was queried
 *     slots: { start: string; end: string }[],  // open viewing slots for `date`
 *   }
 *
 * Booking is exposed as POST so the same URL handles both directions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

interface DaySchedule {
  enabled: boolean;
  slots: { start: string; end: string }[];
}
interface WeekSchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  [key: string]: DaySchedule | undefined;
}

const DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;

/** Parse "HH:mm" into total minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
/** Format total minutes since midnight as "HH:mm". */
function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    // Resolve the property by slug — schedule is keyed by propertyId.
    const property = await prisma.property.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const schedule = await prisma.propertySchedule.findUnique({
      where: { propertyId: property.id },
    });

    // No schedule configured yet — caller renders the empty state.
    if (!schedule) {
      return NextResponse.json({
        schedule: null,
        date: dateParam ?? new Date().toISOString().slice(0, 10),
        slots: [],
      });
    }

    // ─── Resolve target date ─────────────────────────────────────────────
    const targetDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const dayName = DAY_NAMES[targetDate.getDay()];
    const week = (schedule.schedule ?? {}) as WeekSchedule;
    const day = week[dayName];

    if (!day || !day.enabled || !Array.isArray(day.slots) || day.slots.length === 0) {
      return NextResponse.json({
        schedule: {
          timezone: schedule.timezone,
          slotDuration: schedule.slotDuration,
          schedule: week,
        },
        date: targetDate.toISOString().slice(0, 10),
        slots: [],
      });
    }

    // ─── Filter out already-booked slots for that date ───────────────────
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.propertyAppointment.findMany({
      where: {
        propertyId: property.id,
        date: { gte: startOfDay, lte: endOfDay },
        status: { not: 'cancelled' },
      },
      select: { startTime: true },
    });
    const booked = new Set(appointments.map((a) => a.startTime));

    // ─── Expand each schedule range into discrete slots ──────────────────
    const slotDuration = schedule.slotDuration || 30;
    const open: { start: string; end: string }[] = [];
    for (const range of day.slots) {
      const startMin = toMinutes(range.start);
      const endMin = toMinutes(range.end);
      for (let m = startMin; m + slotDuration <= endMin; m += slotDuration) {
        const start = toHHMM(m);
        if (!booked.has(start)) {
          open.push({ start, end: toHHMM(m + slotDuration) });
        }
      }
    }

    return NextResponse.json({
      schedule: {
        timezone: schedule.timezone,
        slotDuration,
        schedule: week,
      },
      date: targetDate.toISOString().slice(0, 10),
      slots: open,
    });
  } catch (e) {
    console.error('public schedule', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

interface BookingPayload {
  date?: string;
  startTime?: string;
  endTime?: string;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = (await req.json()) as BookingPayload;

    if (!body.date || !body.startTime || !body.endTime || !body.name || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: date, startTime, endTime, name, email' },
        { status: 400 },
      );
    }

    const property = await prisma.property.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Reject if this exact slot is already taken (race protection).
    const start = new Date(`${body.date}T00:00:00`);
    const end = new Date(`${body.date}T23:59:59`);
    const conflict = await prisma.propertyAppointment.findFirst({
      where: {
        propertyId: property.id,
        date: { gte: start, lte: end },
        startTime: body.startTime,
        status: { not: 'cancelled' },
      },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json(
        { error: 'That slot was just booked. Please pick another time.' },
        { status: 409 },
      );
    }

    const appointment = await prisma.propertyAppointment.create({
      data: {
        propertyId: property.id,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        date: new Date(`${body.date}T00:00:00`),
        startTime: body.startTime,
        endTime: body.endTime,
        notes: body.notes || null,
        status: 'pending',
      },
    });

    // Fire the same notification flow the web action uses.
    try {
      const { dbTriggers } = await import('@/lib/event-system');
      await dbTriggers.onPropertyAppointmentCreate(appointment);
    } catch (err) {
      console.error('Failed to emit property showing event:', err);
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        date: appointment.date.toISOString().slice(0, 10),
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      },
    });
  } catch (e) {
    console.error('public schedule book', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
