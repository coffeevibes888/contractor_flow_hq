/**
 * POST /api/mobile/marketplace/contractors/[id]/book
 *
 * Create an instant booking. Wraps the website's `instantBookingService`
 * which handles deposit / Stripe escrow / scheduling under the hood.
 *
 * Body:
 *   {
 *     serviceType: string,
 *     startTime: ISO string,
 *     endTime:   ISO string,
 *     address: { street, city, state, zip },
 *     notes?: string
 *   }
 *
 * Response:
 *   { booking: { id, status, depositAmount, depositRequired }, paymentIntent?: { clientSecret, amount } }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { instantBookingService } from '@/lib/services/instant-booking';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { emitMarketplaceCard } from '@/lib/services/marketplace-cards';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { serviceType, startTime, endTime, address, notes } = body ?? {};

    if (!serviceType || !startTime || !endTime || !address) {
      return NextResponse.json(
        { error: 'serviceType, startTime, endTime, and address are required' },
        { status: 400 },
      );
    }

    const contractor = await prisma.contractorProfile.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, userId: true, businessName: true, instantBookingEnabled: true, depositRequired: true, depositAmount: true },
    });
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    if (!contractor.instantBookingEnabled) {
      return NextResponse.json({ error: 'Contractor has not enabled instant booking' }, { status: 400 });
    }

    const booking = await instantBookingService.createBooking({
      contractorId: contractor.id,
      customerId: auth.userId,
      serviceType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      address,
      notes,
      depositAmount: contractor.depositRequired ? Number(contractor.depositAmount ?? 0) : undefined,
    });

    // Card into the DM with the contractor
    if (contractor.userId) {
      const customer = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      });
      const start = booking.startTime instanceof Date ? booking.startTime : new Date(booking.startTime);
      await emitMarketplaceCard(auth.userId, contractor.userId, {
        kind: 'booking_created',
        title: 'New booking',
        summary: `${customer?.name ?? 'Customer'} booked ${serviceType} for ${start.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
        amount: contractor.depositRequired ? Number(contractor.depositAmount ?? 0) : undefined,
        refId: booking.id,
        refType: 'booking',
        details: {
          when: start.toISOString(),
          ...(contractor.depositRequired ? { depositHeld: true } : {}),
        },
      }, { senderName: customer?.name ?? undefined });
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime instanceof Date ? booking.startTime.toISOString() : booking.startTime,
        endTime: booking.endTime instanceof Date ? booking.endTime.toISOString() : booking.endTime,
        depositRequired: !!contractor.depositRequired,
        depositAmount: contractor.depositRequired ? Number(contractor.depositAmount ?? 0) : 0,
        depositPaid: booking.depositPaid,
      },
    });
  } catch (error: any) {
    console.error('[mobile/marketplace/book]', error);
    return NextResponse.json(
      { error: error?.message || 'Could not create booking' },
      { status: 500 },
    );
  }
}
