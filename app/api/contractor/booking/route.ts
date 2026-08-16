import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { instantBookingService } from '@/lib/services/instant-booking';
import { z } from 'zod';

const bookingSchema = z.object({
  contractorId: z.string().uuid(),
  serviceType: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(2).max(2),
    zip: z.string().min(5),
  }),
  notes: z.string().optional(),
  depositAmount: z.number().positive().optional(),
});

/**
 * POST /api/contractor/booking
 * Create an instant booking
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bookingSchema.parse(body);

    // Create booking
    const booking = await instantBookingService.createBooking({
      contractorId: validatedData.contractorId,
      customerId: session.user.id,
      serviceType: validatedData.serviceType,
      startTime: new Date(validatedData.startTime),
      endTime: new Date(validatedData.endTime),
      address: validatedData.address,
      notes: validatedData.notes,
      depositAmount: validatedData.depositAmount,
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        contractorId: booking.contractorId,
        serviceType: booking.serviceType,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        status: booking.status,
        depositAmount: booking.depositAmount,
        depositPaid: booking.depositPaid,
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contractor/booking
 * Get user's bookings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // This would typically fetch bookings from the database
    // For now, return a placeholder response
    return NextResponse.json({
      bookings: [],
      message: 'Booking list endpoint - implementation pending',
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
