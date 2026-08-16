import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';
import { startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// GET - Get calendar availability
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const rentalId = searchParams.get('rentalId');
    const month = searchParams.get('month') ? new Date(searchParams.get('month')!) : new Date();

    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);

    const where: any = {
      rental: { landlordId: landlord.id },
    };

    if (rentalId) {
      where.rentalId = rentalId;
    }

    // Get bookings
    const bookings = await prismaBase.sTRBooking.findMany({
      where: {
        ...where,
        status: { in: ['confirmed', 'checked_in'] },
        OR: [
          {
            checkIn: { gte: startDate, lte: endDate },
          },
          {
            checkOut: { gte: startDate, lte: endDate },
          },
          {
            checkIn: { lte: startDate },
            checkOut: { gte: endDate },
          },
        ],
      },
      include: {
        rental: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get blocked dates
    const blockedDates = await prismaBase.sTRBlockedDate.findMany({
      where: {
        ...where,
        OR: [
          {
            startDate: { gte: startDate, lte: endDate },
          },
          {
            endDate: { gte: startDate, lte: endDate },
          },
          {
            startDate: { lte: startDate },
            endDate: { gte: endDate },
          },
        ],
      },
      include: {
        rental: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Build calendar data
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const calendar = days.map(day => {
      const dayBookings = bookings.filter((b: any) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return day >= checkIn && day < checkOut;
      });

      const dayBlocked = blockedDates.filter((b: any) => {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        return day >= start && day <= end;
      });

      return {
        date: day.toISOString(),
        bookings: dayBookings,
        blocked: dayBlocked,
        isAvailable: dayBookings.length === 0 && dayBlocked.length === 0,
      };
    });

    return NextResponse.json({ calendar, bookings, blockedDates });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}
