import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { instantBookingService } from '@/lib/services/instant-booking';
import { z } from 'zod';

const cancelSchema = z.object({
  reason: z.string().optional(),
});

const depositSchema = z.object({
  amount: z.number().positive(),
});

/**
 * GET /api/contractor/booking/[id]
 * Get booking details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;
    const booking = await instantBookingService.getBooking(bookingId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user has access to this booking
    if (
      booking.customerId !== session.user.id &&
      booking.contractorId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        contractorId: booking.contractorId,
        customerId: booking.customerId,
        serviceType: booking.serviceType,
        title: booking.title,
        description: booking.description,
        address: booking.address,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        status: booking.status,
        depositAmount: booking.depositAmount,
        depositPaid: booking.depositPaid,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contractor/booking/[id]
 * Cancel a booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;
    const body = await request.json();
    const validatedData = cancelSchema.parse(body);

    // Get booking to verify access
    const booking = await instantBookingService.getBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Determine who is cancelling
    let cancelledBy: 'contractor' | 'customer';
    if (booking.customerId === session.user.id) {
      cancelledBy = 'customer';
    } else if (booking.contractorId === session.user.id) {
      cancelledBy = 'contractor';
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cancel the booking
    const result = await instantBookingService.cancelBooking(
      bookingId,
      cancelledBy,
      validatedData.reason
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      refundAmount: result.refundAmount,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);

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
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contractor/booking/[id]/deposit
 * Create payment intent for deposit
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;
    const body = await request.json();
    const validatedData = depositSchema.parse(body);

    // Verify booking exists and user has access
    const booking = await instantBookingService.getBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create payment intent
    const paymentIntent = await instantBookingService.applyDeposit(
      bookingId,
      validatedData.amount
    );

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.clientSecret,
      amount: paymentIntent.amount,
      paymentIntentId: paymentIntent.paymentIntentId,
    });
  } catch (error) {
    console.error('Error creating deposit payment:', error);

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
      { error: 'Failed to create deposit payment' },
      { status: 500 }
    );
  }
}
