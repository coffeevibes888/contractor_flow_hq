import { NextRequest, NextResponse } from 'next/server';
import { instantBookingService } from '@/lib/services/instant-booking';
import { parse, isValid } from 'date-fns';

/**
 * GET /api/contractor/[contractorId]/availability
 * Get available time slots for a contractor
 * Query params: date (YYYY-MM-DD), serviceType, slotDuration (optional, default 60)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const { contractorId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const dateStr = searchParams.get('date');
    const serviceType = searchParams.get('serviceType');
    const slotDurationStr = searchParams.get('slotDuration');

    // Validate required parameters
    if (!dateStr) {
      return NextResponse.json(
        { error: 'Date parameter is required (format: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (!serviceType) {
      return NextResponse.json(
        { error: 'Service type parameter is required' },
        { status: 400 }
      );
    }

    // Parse date — accept both ISO strings and yyyy-MM-dd format
    let date: Date;
    if (dateStr.includes('T')) {
      // ISO string like "2026-04-28T04:00:00.000Z"
      date = new Date(dateStr);
    } else {
      // yyyy-MM-dd format
      date = parse(dateStr, 'yyyy-MM-dd', new Date());
    }
    if (!isValid(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD or ISO string' },
        { status: 400 }
      );
    }

    // Parse slot duration (default 60 minutes)
    const slotDuration = slotDurationStr ? parseInt(slotDurationStr, 10) : 60;
    if (isNaN(slotDuration) || slotDuration <= 0) {
      return NextResponse.json(
        { error: 'Invalid slot duration' },
        { status: 400 }
      );
    }

    // Get available slots
    const slots = await instantBookingService.getAvailableSlots(
      contractorId,
      date,
      serviceType,
      slotDuration
    );

    return NextResponse.json({
      contractorId,
      date: dateStr,
      serviceType,
      slotDuration,
      slots: slots.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        isAvailable: slot.isAvailable,
      })),
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
