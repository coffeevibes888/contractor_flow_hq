import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * POST /api/contractor/calendar/block-date
 *
 * Blocks a single date for the contractor. Auto-creates the
 * `ContractorAvailability` row with sensible defaults if it doesn't exist
 * yet — previously this returned 404 for new contractors and the block-dates
 * UI silently failed.
 *
 * Also writes a row to `ContractorBlockedDate` so we can store the reason
 * (the legacy `blockedDates` array on `ContractorAvailability` doesn't
 * support per-date metadata).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorId, date, reason } = await req.json();

    if (!contractorId || !date) {
      return NextResponse.json(
        { error: 'contractorId and date are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true },
    });

    if (!contractor || contractor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const blockedDate = startOfDay(new Date(date));

    // Upsert availability row (was 404 before; now auto-creates with defaults)
    const availability = await prisma.contractorAvailability.upsert({
      where: { contractorId },
      create: {
        contractorId,
        // Schema defaults handle the weekly schedule and timing fields
        blockedDates: [blockedDate],
      },
      update: {
        // Skip if already in the list (prevents dupes from rapid clicks)
        blockedDates: {
          set: undefined, // we'll compute below
        },
      },
      select: { blockedDates: true },
    });

    // Re-fetch to make sure we have the current list, then add if needed
    if (
      !availability.blockedDates.some(
        (d) => startOfDay(new Date(d)).getTime() === blockedDate.getTime()
      )
    ) {
      await prisma.contractorAvailability.update({
        where: { contractorId },
        data: {
          blockedDates: [...availability.blockedDates, blockedDate],
        },
      });
    }

    // Also persist a `ContractorBlockedDate` row for the reason metadata
    await prisma.contractorBlockedDate.create({
      data: {
        contractorId,
        startDate: blockedDate,
        endDate: endOfDay(blockedDate),
        reason: reason || null,
        isAllDay: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to block date:', error);
    return NextResponse.json({ error: 'Failed to block date' }, { status: 500 });
  }
}

/**
 * DELETE /api/contractor/calendar/block-date?contractorId=...&date=ISO
 *
 * Unblocks a date. Removes from both `ContractorAvailability.blockedDates`
 * and any matching `ContractorBlockedDate` rows.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');
    const dateStr = searchParams.get('date');

    if (!contractorId || !dateStr) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true },
    });

    if (!contractor || contractor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const targetDay = startOfDay(new Date(dateStr));

    const availability = await prisma.contractorAvailability.findUnique({
      where: { contractorId },
    });

    if (!availability) {
      // Nothing to unblock — treat as success
      return NextResponse.json({ success: true });
    }

    const updatedBlockedDates = availability.blockedDates.filter(
      (d) => startOfDay(new Date(d)).getTime() !== targetDay.getTime()
    );

    await prisma.contractorAvailability.update({
      where: { contractorId },
      data: { blockedDates: updatedBlockedDates },
    });

    // Clean up any matching ContractorBlockedDate rows too
    await prisma.contractorBlockedDate.deleteMany({
      where: {
        contractorId,
        startDate: targetDay,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to unblock date:', error);
    return NextResponse.json({ error: 'Failed to unblock date' }, { status: 500 });
  }
}

/**
 * GET /api/contractor/calendar/block-date?contractorId=...
 *
 * Returns blocked dates with reasons (for admin display).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');

    if (!contractorId) {
      return NextResponse.json({ error: 'contractorId required' }, { status: 400 });
    }

    const blocks = await prisma.contractorBlockedDate.findMany({
      where: { contractorId },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({
      blocks: blocks.map((b) => ({
        id: b.id,
        startDate: b.startDate.toISOString(),
        endDate: b.endDate.toISOString(),
        reason: b.reason,
        isAllDay: b.isAllDay,
      })),
    });
  } catch (error) {
    console.error('Failed to load blocked dates:', error);
    return NextResponse.json({ error: 'Failed to load blocked dates' }, { status: 500 });
  }
}
