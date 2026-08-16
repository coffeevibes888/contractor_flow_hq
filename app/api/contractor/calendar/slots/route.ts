import { NextRequest, NextResponse } from 'next/server';
import { instantBookingService } from '@/lib/services/instant-booking';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');
    const date = searchParams.get('date');
    const serviceType = searchParams.get('serviceType');
    const slotDuration = searchParams.get('slotDuration');

    if (!contractorId || !date || !serviceType) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const slots = await instantBookingService.getAvailableSlots(
      contractorId,
      new Date(date),
      serviceType,
      slotDuration ? parseInt(slotDuration) : 60
    );

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Failed to fetch time slots:', error);
    return NextResponse.json({ error: 'Failed to fetch time slots' }, { status: 500 });
  }
}
