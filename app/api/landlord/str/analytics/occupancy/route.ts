import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';
import { startOfMonth, endOfMonth, getDaysInMonth, eachDayOfInterval } from 'date-fns';

// GET - Occupancy analytics
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
    const totalDays = getDaysInMonth(month);

    const where: any = {
      rental: { landlordId: landlord.id },
      status: { in: ['confirmed', 'checked_in', 'checked_out'] },
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
    };

    if (rentalId) {
      where.rentalId = rentalId;
    }

    const bookings = await prismaBase.sTRBooking.findMany({
      where,
      select: {
        checkIn: true,
        checkOut: true,
        nights: true,
        totalPrice: true,
        rentalId: true,
        rental: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate occupied nights
    let occupiedNights = 0;
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    days.forEach((day: Date) => {
      const isOccupied = bookings.some((booking: any) => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        return day >= checkIn && day < checkOut;
      });
      if (isOccupied) occupiedNights++;
    });

    const occupancyRate = (occupiedNights / totalDays) * 100;

    // Calculate ADR (Average Daily Rate)
    const totalRevenue = bookings.reduce((sum: number, b: any) => sum + Number(b.totalPrice), 0);
    const totalNights = bookings.reduce((sum: number, b: any) => sum + b.nights, 0);
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0;

    // Calculate RevPAR (Revenue Per Available Room)
    const revpar = totalRevenue / totalDays;

    // By property breakdown
    const byProperty = rentalId ? null : await Promise.all(
      ([...new Set(bookings.map((b: any) => b.rentalId as string))] as string[]).map(async (propId: string) => {
        const propBookings = bookings.filter((b: any) => b.rentalId === propId);
        const propNights = propBookings.reduce((sum: number, b: any) => sum + b.nights, 0);
        const propRevenue = propBookings.reduce((sum: number, b: any) => sum + Number(b.totalPrice), 0);
        
        return {
          propertyId: propId,
          propertyName: propBookings[0]?.rental.name || 'Unknown',
          bookings: propBookings.length,
          nights: propNights,
          revenue: propRevenue,
          occupancyRate: (propNights / totalDays) * 100,
          adr: propNights > 0 ? propRevenue / propNights : 0,
        };
      })
    );

    return NextResponse.json({
      summary: {
        totalDays,
        occupiedNights,
        availableNights: totalDays - occupiedNights,
        occupancyRate,
        adr,
        revpar,
        totalBookings: bookings.length,
        totalRevenue,
      },
      byProperty,
    });
  } catch (error) {
    console.error('Error fetching occupancy analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
