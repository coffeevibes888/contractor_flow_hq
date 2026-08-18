/**
 * POST /api/employee/clock
 *
 * Handles clock in, clock out, and break management for employees.
 * Captures GPS coordinates for both events.
 *
 * Actions:
 * - clock_in: Creates a new ContractorTimeEntry with clockIn + GPS
 * - clock_out: Sets clockOut + GPS on the active entry, calculates duration
 * - add_break: Adds break minutes to an active entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'clock_in': {
        const { employeeId, contractorId, jobId, location, notes } = body;

        if (!employeeId || !contractorId) {
          return NextResponse.json({ error: 'Employee and contractor IDs required' }, { status: 400 });
        }

        // Verify the employee record belongs to this user
        const employee = await prisma.contractorEmployee.findFirst({
          where: { id: employeeId, userId: session.user.id, status: 'active' },
        });
        if (!employee) {
          return NextResponse.json({ error: 'Employee not found or not authorized' }, { status: 403 });
        }

        // Check for existing active entry (prevent double clock-in)
        const existing = await prisma.contractorTimeEntry.findFirst({
          where: { employeeId, contractorId, clockOut: null },
        });
        if (existing) {
          return NextResponse.json({ error: 'Already clocked in. Clock out first.' }, { status: 409 });
        }

        // Create time entry
        const entry = await prisma.contractorTimeEntry.create({
          data: {
            contractorId,
            employeeId,
            jobId: jobId || null,
            clockIn: new Date(),
            clockInLocation: location ? { lat: location.lat, lng: location.lng } : null,
            notes: notes || null,
            status: 'pending',
          },
        });

        return NextResponse.json({
          success: true,
          entryId: entry.id,
          clockIn: entry.clockIn.toISOString(),
        });
      }

      case 'clock_out': {
        const { entryId, employeeId: empId, location, notes: outNotes } = body;

        if (!entryId) {
          return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
        }

        // Verify ownership
        const entry = await prisma.contractorTimeEntry.findFirst({
          where: {
            id: entryId,
            employee: { userId: session.user.id },
            clockOut: null,
          },
        });
        if (!entry) {
          return NextResponse.json({ error: 'Active time entry not found' }, { status: 404 });
        }

        const clockOut = new Date();
        const durationMs = clockOut.getTime() - entry.clockIn.getTime();
        const durationMinutes = Math.round(durationMs / 60000);
        const netMinutes = durationMinutes - (entry.breakMinutes || 0);
        const billableHours = Math.round((netMinutes / 60) * 100) / 100;

        // Get employee's hourly rate for auto-calculating total
        const emp = await prisma.contractorEmployee.findUnique({
          where: { id: entry.employeeId! },
          select: { payRate: true },
        });
        const hourlyRate = emp ? Number(emp.payRate) : 0;
        const totalAmount = billableHours * hourlyRate;

        await prisma.contractorTimeEntry.update({
          where: { id: entryId },
          data: {
            clockOut,
            clockOutLocation: location ? { lat: location.lat, lng: location.lng } : null,
            duration: durationMinutes,
            billableHours,
            hourlyRate: hourlyRate || null,
            totalAmount: totalAmount || null,
            notes: outNotes ? `${entry.notes || ''}${entry.notes ? ' | ' : ''}Out: ${outNotes}` : entry.notes,
          },
        });

        return NextResponse.json({
          success: true,
          clockOut: clockOut.toISOString(),
          duration: durationMinutes,
          billableHours,
        });
      }

      case 'add_break': {
        const { entryId: breakEntryId, breakMinutes } = body;

        if (!breakEntryId || typeof breakMinutes !== 'number') {
          return NextResponse.json({ error: 'Entry ID and break minutes required' }, { status: 400 });
        }

        // Verify ownership
        const breakEntry = await prisma.contractorTimeEntry.findFirst({
          where: {
            id: breakEntryId,
            employee: { userId: session.user.id },
            clockOut: null,
          },
        });
        if (!breakEntry) {
          return NextResponse.json({ error: 'Active entry not found' }, { status: 404 });
        }

        await prisma.contractorTimeEntry.update({
          where: { id: breakEntryId },
          data: {
            breakMinutes: { increment: breakMinutes },
          },
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/employee/clock error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
