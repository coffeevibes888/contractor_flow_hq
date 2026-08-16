/**
 * GET /api/mobile/marketplace/contractors/[id]/availability?date=YYYY-MM-DD&serviceType=plumbing
 *
 * Returns available time slots for a contractor on a specific date.
 * Wraps the existing instantBookingService used by the website.
 *
 * Response: { enabled: boolean, slots: { startTime, endTime }[] }
 *   - enabled false means contractor hasn't turned on instant booking
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { instantBookingService } from '@/lib/services/instant-booking';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const serviceType = searchParams.get('serviceType') || '';
    const slotDuration = parseInt(searchParams.get('duration') || '60', 10);

    if (!dateStr) return NextResponse.json({ error: 'date is required' }, { status: 400 });
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });

    // Resolve contractor — accept profile id or slug
    const contractor = await prisma.contractorProfile.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: {
        id: true,
        instantBookingEnabled: true,
        depositRequired: true,
        depositAmount: true,
      },
    });
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    if (!contractor.instantBookingEnabled) {
      return NextResponse.json({ enabled: false, slots: [], deposit: null });
    }

    const slots = await instantBookingService.getAvailableSlots(
      contractor.id,
      date,
      serviceType,
      slotDuration,
    );

    return NextResponse.json({
      enabled: true,
      deposit: contractor.depositRequired
        ? { required: true, amount: Number(contractor.depositAmount ?? 0) }
        : { required: false, amount: 0 },
      slots: slots
        .filter((s) => s.isAvailable)
        .map((s) => ({
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
        })),
    });
  } catch (error) {
    console.error('[mobile/marketplace/availability]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
