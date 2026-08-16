import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { prismaBase } from '@/db/prisma-base';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';

// GET - Revenue analytics
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
    const period = searchParams.get('period') || 'year'; // month, year, custom

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (period === 'year') {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    } else {
      startDate = new Date(searchParams.get('startDate') || startOfYear(now));
      endDate = new Date(searchParams.get('endDate') || endOfYear(now));
    }

    const where: any = {
      rental: { landlordId: landlord.id },
      status: { in: ['confirmed', 'checked_in', 'checked_out'] },
      checkIn: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (rentalId) {
      where.rentalId = rentalId;
    }

    // Get bookings
    const bookings = await prismaBase.sTRBooking.findMany({
      where,
      select: {
        checkIn: true,
        totalPrice: true,
        platformFee: true,
        rentalId: true,
      },
    });

    // Get expenses
    const expenses = await prismaBase.sTRExpense.findMany({
      where: {
        landlordId: landlord.id,
        ...(rentalId && { rentalId }),
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        amount: true,
        category: true,
      },
    });

    // Calculate totals
    const totalRevenue = bookings.reduce((sum: number, b: any) => sum + Number(b.totalPrice), 0);
    const totalPlatformFees = bookings.reduce((sum: number, b: any) => sum + Number(b.platformFee || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const netRevenue = totalRevenue - totalPlatformFees - totalExpenses;

    // Monthly breakdown
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyData = months.map((month: Date) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthBookings = bookings.filter((b: any) => {
        const checkIn = new Date(b.checkIn);
        return checkIn >= monthStart && checkIn <= monthEnd;
      });

      const monthExpenses = expenses.filter((e: any) => {
        const date = new Date(e.date);
        return date >= monthStart && date <= monthEnd;
      });

      const revenue = monthBookings.reduce((sum: number, b: any) => sum + Number(b.totalPrice), 0);
      const fees = monthBookings.reduce((sum: number, b: any) => sum + Number(b.platformFee || 0), 0);
      const costs = monthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      return {
        month: month.toISOString(),
        revenue,
        fees,
        expenses: costs,
        net: revenue - fees - costs,
        bookings: monthBookings.length,
      };
    });

    // Expense breakdown by category
    const expensesByCategory = expenses.reduce((acc: Record<string, number>, e: any) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalPlatformFees,
        totalExpenses,
        netRevenue,
        totalBookings: bookings.length,
        averageBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
      },
      monthlyData,
      expensesByCategory,
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
