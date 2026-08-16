import { NextRequest, NextResponse } from 'next/server';
import { instantBookingService } from '@/lib/services/instant-booking';
import { prisma } from '@/db/prisma';
import { addDays, startOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor ID required' }, { status: 400 });
    }

    // Get contractor's first specialty for slot checking
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { specialties: true, instantBookingEnabled: true },
    });

    if (!contractor || !contractor.instantBookingEnabled || !contractor.specialties.length) {
      return NextResponse.json({ nextAvailable: null });
    }

    const startDate = start ? new Date(start) : startOfDay(new Date());
    const endDate = end ? new Date(end) : addDays(startDate, 14);

    // Check each day for availability
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const slots = await instantBookingService.getAvailableSlots(
        contractorId,
        currentDate,
        contractor.specialties[0],
        60
      );

      const availableSlot = slots.find(slot => slot.isAvailable);
      if (availableSlot) {
        return NextResponse.json({ nextAvailable: availableSlot.startTime });
      }

      currentDate = addDays(currentDate, 1);
    }

    return NextResponse.json({ nextAvailable: null });
  } catch (error) {
    console.error('Failed to find next available:', error);
    return NextResponse.json({ error: 'Failed to find availability' }, { status: 500 });
  }
}
