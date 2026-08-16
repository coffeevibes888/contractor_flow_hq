import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor ID required' }, { status: 400 });
    }

    const availability = await prisma.contractorAvailability.findUnique({
      where: { contractorId },
    });

    if (!availability) {
      return NextResponse.json({ availability: null });
    }

    const formattedAvailability = {
      weeklySchedule: {
        monday: {
          start: availability.mondayStart || '09:00',
          end: availability.mondayEnd || '17:00',
          enabled: availability.mondayEnabled,
        },
        tuesday: {
          start: availability.tuesdayStart || '09:00',
          end: availability.tuesdayEnd || '17:00',
          enabled: availability.tuesdayEnabled,
        },
        wednesday: {
          start: availability.wednesdayStart || '09:00',
          end: availability.wednesdayEnd || '17:00',
          enabled: availability.wednesdayEnabled,
        },
        thursday: {
          start: availability.thursdayStart || '09:00',
          end: availability.thursdayEnd || '17:00',
          enabled: availability.thursdayEnabled,
        },
        friday: {
          start: availability.fridayStart || '09:00',
          end: availability.fridayEnd || '17:00',
          enabled: availability.fridayEnabled,
        },
        saturday: {
          start: availability.saturdayStart || '09:00',
          end: availability.saturdayEnd || '17:00',
          enabled: availability.saturdayEnabled,
        },
        sunday: {
          start: availability.sundayStart || '09:00',
          end: availability.sundayEnd || '17:00',
          enabled: availability.sundayEnabled,
        },
      },
      bufferMinutes: availability.bufferMinutes,
      minNoticeHours: availability.minNoticeHours,
      maxAdvanceDays: availability.maxAdvanceDays,
      blockedDates: availability.blockedDates,
    };

    return NextResponse.json({ availability: formattedAvailability });
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorId, availability } = await req.json();

    // Verify user owns this contractor profile
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true },
    });

    if (!contractor || contractor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = {
      contractorId,
      mondayStart: availability.monday?.start,
      mondayEnd: availability.monday?.end,
      mondayEnabled: availability.monday?.enabled ?? true,
      tuesdayStart: availability.tuesday?.start,
      tuesdayEnd: availability.tuesday?.end,
      tuesdayEnabled: availability.tuesday?.enabled ?? true,
      wednesdayStart: availability.wednesday?.start,
      wednesdayEnd: availability.wednesday?.end,
      wednesdayEnabled: availability.wednesday?.enabled ?? true,
      thursdayStart: availability.thursday?.start,
      thursdayEnd: availability.thursday?.end,
      thursdayEnabled: availability.thursday?.enabled ?? true,
      fridayStart: availability.friday?.start,
      fridayEnd: availability.friday?.end,
      fridayEnabled: availability.friday?.enabled ?? true,
      saturdayStart: availability.saturday?.start,
      saturdayEnd: availability.saturday?.end,
      saturdayEnabled: availability.saturday?.enabled ?? false,
      sundayStart: availability.sunday?.start,
      sundayEnd: availability.sunday?.end,
      sundayEnabled: availability.sunday?.enabled ?? false,
      bufferMinutes: availability.bufferMinutes,
      minNoticeHours: availability.minNoticeHours,
      maxAdvanceDays: availability.maxAdvanceDays,
    };

    await prisma.contractorAvailability.upsert({
      where: { contractorId },
      create: data,
      update: data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update availability:', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}
