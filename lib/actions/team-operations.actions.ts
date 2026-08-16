'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatError } from '../utils';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  shiftSchema,
  updateShiftSchema,
  clockInSchema,
  clockOutSchema,
  manualTimeEntrySchema,
  reviewTimesheetSchema,
  processPayrollSchema,
  bonusPaymentSchema,
  teamMemberCompensationSchema,
  payrollSettingsSchema,
  timeOffRequestSchema,
  reviewTimeOffSchema,
} from '../validators';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { normalizeTier } from '../config/subscription-tiers';

// Helper to check Enterprise tier access
async function checkEnterpriseTierAccess(landlordId: string) {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: { subscriptionTier: true },
  });

  if (!landlord) {
    throw new Error('Landlord not found');
  }

  const tier = normalizeTier(landlord.subscriptionTier);
  if (tier !== 'enterprise') {
    throw new Error('Team Operations requires an Enterprise subscription');
  }

  return true;
}

// ============= SCHEDULING =============

// Create a shift
export async function createShift(data: z.infer<typeof shiftSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    await checkEnterpriseTierAccess(landlord.id);

    const validatedData = shiftSchema.parse(data);

    // Verify team member belongs to landlord
    const teamMember = await prisma.teamMember.findFirst({
      where: { id: validatedData.teamMemberId, landlordId: landlord.id, status: 'active' },
    });
    if (!teamMember) {
      return { success: false, message: 'Team member not found' };
    }

    // Verify property if provided
    if (validatedData.propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: validatedData.propertyId, landlordId: landlord.id },
      });
      if (!property) {
        return { success: false, message: 'Property not found' };
      }
    }

    const shift = await prisma.shift.create({
      data: {
        landlordId: landlord.id,
        teamMemberId: validatedData.teamMemberId,
        propertyId: validatedData.propertyId || null,
        date: new Date(validatedData.date),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        notes: validatedData.notes || null,
      },
    });

    revalidatePath('/admin/team-operations');
    return { success: true, message: 'Shift created', shiftId: shift.id };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get shifts with filters
export async function getShifts(filters?: { startDate?: Date; endDate?: Date; teamMemberId?: string; propertyId?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', shifts: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, shifts: [] };
    }

    const shifts = await prisma.shift.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        ...(filters?.startDate && filters?.endDate && {
          date: { gte: filters.startDate, lte: filters.endDate },
        }),
        ...(filters?.teamMemberId && { teamMemberId: filters.teamMemberId }),
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        teamMember: { include: { user: { select: { name: true, image: true } } } },
        property: { select: { name: true } },
      },
    });

    return {
      success: true,
      shifts: shifts.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        notes: s.notes,
        teamMember: {
          id: s.teamMemberId,
          name: s.teamMember.user.name,
          image: s.teamMember.user.image,
        },
        property: s.property ? { id: s.propertyId, name: s.property.name } : null,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), shifts: [] };
  }
}

// Update shift
export async function updateShift(data: z.infer<typeof updateShiftSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const validatedData = updateShiftSchema.parse(data);

    const shift = await prisma.shift.findFirst({
      where: { id: validatedData.id, landlordId: landlordResult.landlord.id },
    });

    if (!shift) {
      return { success: false, message: 'Shift not found' };
    }

    await prisma.shift.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.date && { date: new Date(validatedData.date) }),
        ...(validatedData.startTime && { startTime: validatedData.startTime }),
        ...(validatedData.endTime && { endTime: validatedData.endTime }),
        ...(validatedData.propertyId !== undefined && { propertyId: validatedData.propertyId || null }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes || null }),
        ...(validatedData.status && { status: validatedData.status }),
      },
    });

    revalidatePath('/admin/team-operations');
    return { success: true, message: 'Shift updated' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Delete shift
export async function deleteShift(shiftId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, landlordId: landlordResult.landlord.id },
    });

    if (!shift) {
      return { success: false, message: 'Shift not found' };
    }

    await prisma.shift.delete({ where: { id: shiftId } });
    revalidatePath('/admin/team-operations');
    return { success: true, message: 'Shift deleted' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}


// ============= TIME TRACKING =============

// Clock in
export async function clockIn(data: z.infer<typeof clockInSchema>) {
  console.log('--- Clock In Action Started ---');
  try {
    const session = await auth();
    console.log('1. Session:', session ? `User ID: ${session.user?.id}` : 'No session');
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const validatedData = clockInSchema.parse(data);
    console.log('2. Validated Data:', validatedData);

    // Find team member for current user
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, status: 'active' },
      include: { landlord: { select: { subscriptionTier: true } } },
    });
    console.log('3. Team Member:', teamMember ? `ID: ${teamMember.id}, Landlord ID: ${teamMember.landlordId}` : 'Not found');

    if (!teamMember) {
      return { success: false, message: 'You are not a team member' };
    }

    console.log('4. Checking enterprise access...');
    await checkEnterpriseTierAccess(teamMember.landlordId);
    console.log('5. Enterprise access GRANTED.');

    // Check if already clocked in
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { teamMemberId: teamMember.id, clockOut: null },
    });
    console.log('6. Active Entry Check:', activeEntry ? `Found active entry ID: ${activeEntry.id}` : 'No active entry');

    if (activeEntry) {
      return { success: false, message: 'You are already clocked in' };
    }

    console.log('7. Creating new TimeEntry...');
    const entry = await prisma.timeEntry.create({
      data: {
        landlordId: teamMember.landlordId,
        teamMemberId: teamMember.id,
        shiftId: validatedData.shiftId || null,
        propertyId: validatedData.propertyId || null,
        clockIn: new Date(),
        clockInLat: validatedData.location?.lat,
        clockInLng: validatedData.location?.lng,
        notes: validatedData.notes || null,
      },
    });
    console.log('8. New TimeEntry created:', entry.id);

    revalidatePath('/admin/team-operations');
    revalidatePath('/admin/team');
    console.log('--- Clock In Action Succeeded ---');
    return { success: true, message: 'Clocked in successfully', timeEntryId: entry.id };
  } catch (error) {
    console.error('--- Clock In Action FAILED ---');
    console.error('Full Error:', error);
    return { success: false, message: formatError(error) };
  }
}

// Clock out
export async function clockOut(data: z.infer<typeof clockOutSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const validatedData = clockOutSchema.parse(data);

    const entry = await prisma.timeEntry.findUnique({
      where: { id: validatedData.timeEntryId },
      include: { teamMember: true },
    });

    if (!entry) {
      return { success: false, message: 'Time entry not found' };
    }

    if (entry.teamMember.userId !== session.user.id) {
      return { success: false, message: 'Not authorized' };
    }

    if (entry.clockOut) {
      return { success: false, message: 'Already clocked out' };
    }

    const clockOutTime = new Date();
    const breakMinutes = validatedData.breakMinutes || entry.breakMinutes;
    const totalMinutes = Math.floor((clockOutTime.getTime() - entry.clockIn.getTime()) / 60000) - breakMinutes;

    await prisma.timeEntry.update({
      where: { id: validatedData.timeEntryId },
      data: {
        clockOut: clockOutTime,
        clockOutLat: validatedData.location?.lat,
        clockOutLng: validatedData.location?.lng,
        breakMinutes,
        totalMinutes: Math.max(0, totalMinutes),
        notes: validatedData.notes || entry.notes,
      },
    });

    revalidatePath('/admin/team-operations');
    revalidatePath('/admin/team');
    return { success: true, message: 'Clocked out successfully', totalMinutes };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get active time entry for current user
export async function getActiveTimeEntry() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', entry: null };
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, status: 'active' },
    });

    if (!teamMember) {
      return { success: false, message: 'Not a team member', entry: null };
    }

    const entry = await prisma.timeEntry.findFirst({
      where: { teamMemberId: teamMember.id, clockOut: null },
      include: { property: { select: { name: true } } },
    });

    return {
      success: true,
      entry: entry ? {
        id: entry.id,
        clockIn: entry.clockIn,
        propertyName: entry.property?.name,
        notes: entry.notes,
      } : null,
    };
  } catch (error) {
    return { success: false, message: formatError(error), entry: null };
  }
}

// Get who's working now (for landlord dashboard)
export async function getWhosWorkingNow() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', workers: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, workers: [] };
    }

    const activeEntries = await prisma.timeEntry.findMany({
      where: { landlordId: landlordResult.landlord.id, clockOut: null },
      include: {
        teamMember: { include: { user: { select: { name: true, image: true } } } },
        property: { select: { name: true } },
      },
    });

    return {
      success: true,
      workers: activeEntries.map((e) => ({
        timeEntryId: e.id,
        teamMemberId: e.teamMemberId,
        name: e.teamMember.user.name,
        image: e.teamMember.user.image,
        clockIn: e.clockIn,
        propertyName: e.property?.name || 'All Properties',
        minutesWorked: Math.floor((Date.now() - e.clockIn.getTime()) / 60000),
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), workers: [] };
  }
}

// Get time entries with filters
export async function getTimeEntries(filters?: { teamMemberId?: string; startDate?: Date; endDate?: Date }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', entries: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, entries: [] };
    }

    const entries = await prisma.timeEntry.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        ...(filters?.teamMemberId && { teamMemberId: filters.teamMemberId }),
        ...(filters?.startDate && filters?.endDate && {
          clockIn: { gte: filters.startDate, lte: filters.endDate },
        }),
      },
      orderBy: { clockIn: 'desc' },
      include: {
        teamMember: { include: { user: { select: { name: true } } } },
        property: { select: { name: true } },
      },
    });

    return {
      success: true,
      entries: entries.map((e) => ({
        id: e.id,
        teamMemberName: e.teamMember.user.name,
        propertyName: e.property?.name,
        clockIn: e.clockIn,
        clockOut: e.clockOut,
        breakMinutes: e.breakMinutes,
        totalMinutes: e.totalMinutes,
        isManual: e.isManual,
        approvalStatus: e.approvalStatus,
        notes: e.notes,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), entries: [] };
  }
}

// Create manual time entry (landlord only)
export async function createManualTimeEntry(data: z.infer<typeof manualTimeEntrySchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    await checkEnterpriseTierAccess(landlord.id);

    const validatedData = manualTimeEntrySchema.parse(data);

    // Verify team member
    const teamMember = await prisma.teamMember.findFirst({
      where: { id: validatedData.teamMemberId, landlordId: landlord.id },
    });
    if (!teamMember) {
      return { success: false, message: 'Team member not found' };
    }

    const clockIn = new Date(validatedData.clockIn);
    const clockOut = new Date(validatedData.clockOut);
    const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000) - validatedData.breakMinutes;

    const entry = await prisma.timeEntry.create({
      data: {
        landlordId: landlord.id,
        teamMemberId: validatedData.teamMemberId,
        propertyId: validatedData.propertyId || null,
        clockIn,
        clockOut,
        breakMinutes: validatedData.breakMinutes,
        totalMinutes: Math.max(0, totalMinutes),
        notes: validatedData.notes || null,
        isManual: true,
        approvalStatus: 'approved', // Manual entries by landlord are auto-approved
      },
    });

    revalidatePath('/admin/team-operations');
    return { success: true, message: 'Time entry created', timeEntryId: entry.id };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}


// ============= TIMESHEETS =============

// Get timesheets
export async function getTimesheets(filters?: { status?: string; teamMemberId?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', timesheets: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, timesheets: [] };
    }

    const timesheets = await prisma.timesheet.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.teamMemberId && { teamMemberId: filters.teamMemberId }),
      },
      orderBy: { periodEnd: 'desc' },
      include: {
        teamMember: { include: { user: { select: { name: true, image: true } } } },
        _count: { select: { timeEntries: true } },
      },
    });

    return {
      success: true,
      timesheets: timesheets.map((ts) => ({
        id: ts.id,
        periodStart: ts.periodStart,
        periodEnd: ts.periodEnd,
        totalHours: ts.totalHours.toString(),
        regularHours: ts.regularHours.toString(),
        overtimeHours: ts.overtimeHours.toString(),
        status: ts.status,
        submittedAt: ts.submittedAt,
        teamMember: {
          id: ts.teamMemberId,
          name: ts.teamMember.user.name,
          image: ts.teamMember.user.image,
        },
        entryCount: ts._count.timeEntries,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), timesheets: [] };
  }
}

// Get single timesheet with entries
export async function getTimesheet(timesheetId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const timesheet = await prisma.timesheet.findFirst({
      where: { id: timesheetId, landlordId: landlordResult.landlord.id },
      include: {
        teamMember: {
          include: {
            user: { select: { name: true, image: true } },
            compensation: true,
          },
        },
        timeEntries: {
          orderBy: { clockIn: 'asc' },
          include: { property: { select: { name: true } } },
        },
        reviewedBy: { select: { name: true } },
        payment: true,
      },
    });

    if (!timesheet) {
      return { success: false, message: 'Timesheet not found' };
    }

    return { success: true, timesheet };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Submit timesheet for approval
export async function submitTimesheet(timesheetId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    // Find team member for current user
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, status: 'active' },
    });

    if (!teamMember) {
      return { success: false, message: 'Not a team member' };
    }

    const timesheet = await prisma.timesheet.findFirst({
      where: { id: timesheetId, teamMemberId: teamMember.id, status: 'draft' },
    });

    if (!timesheet) {
      return { success: false, message: 'Timesheet not found or already submitted' };
    }

    await prisma.timesheet.update({
      where: { id: timesheetId },
      data: { status: 'submitted', submittedAt: new Date() },
    });

    revalidatePath('/admin/team-operations');
    revalidatePath('/admin/team');
    return { success: true, message: 'Timesheet submitted for approval' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Approve or reject timesheet (landlord only)
export async function reviewTimesheet(data: z.infer<typeof reviewTimesheetSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const validatedData = reviewTimesheetSchema.parse(data);

    const timesheet = await prisma.timesheet.findFirst({
      where: { id: validatedData.timesheetId, landlordId: landlordResult.landlord.id, status: 'submitted' },
    });

    if (!timesheet) {
      return { success: false, message: 'Timesheet not found or not submitted' };
    }

    await prisma.timesheet.update({
      where: { id: validatedData.timesheetId },
      data: {
        status: validatedData.status,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: validatedData.reviewNotes || null,
      },
    });

    revalidatePath('/admin/team-operations');
    return { success: true, message: `Timesheet ${validatedData.status}` };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= PAYROLL =============

// Calculate payroll for a timesheet
async function calculatePayroll(timesheetId: string) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    include: { teamMember: { include: { compensation: true } } },
  });

  if (!timesheet) throw new Error('Timesheet not found');

  const comp = timesheet.teamMember.compensation;
  if (!comp) throw new Error('Compensation not configured for team member');

  let grossAmount = 0;
  let regularPay = 0;
  let overtimePay = 0;

  if (comp.payType === 'hourly') {
    const hourlyRate = Number(comp.hourlyRate || 0);
    const overtimeRate = Number(comp.overtimeRate || hourlyRate * 1.5);

    regularPay = Number(timesheet.regularHours) * hourlyRate;
    overtimePay = Number(timesheet.overtimeHours) * overtimeRate;
    grossAmount = regularPay + overtimePay;
  } else {
    // Salary: For now, just use total hours * implied hourly rate
    // In production, you'd divide annual salary by pay periods
    const salaryAmount = Number(comp.salaryAmount || 0);
    const impliedHourlyRate = salaryAmount / 2080; // 52 weeks * 40 hours
    grossAmount = Number(timesheet.totalHours) * impliedHourlyRate;
    regularPay = grossAmount;
  }

  // Enterprise tier - no platform fee on internal payroll
  const platformFee = 0;
  const netAmount = grossAmount;

  return {
    timesheetId,
    teamMemberId: timesheet.teamMemberId,
    grossAmount,
    regularPay,
    overtimePay,
    platformFee,
    netAmount,
  };
}

// Get pending payroll
export async function getPendingPayroll() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', payroll: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, payroll: [] };
    }

    const approvedTimesheets = await prisma.timesheet.findMany({
      where: { landlordId: landlordResult.landlord.id, status: 'approved' },
      include: {
        teamMember: {
          include: {
            user: { select: { name: true } },
            compensation: true,
          },
        },
      },
    });

    const payrollItems = [];
    for (const ts of approvedTimesheets) {
      try {
        const calc = await calculatePayroll(ts.id);
        payrollItems.push({
          teamMemberName: ts.teamMember.user.name,
          periodStart: ts.periodStart,
          periodEnd: ts.periodEnd,
          totalHours: ts.totalHours.toString(),
          ...calc,
        });
      } catch {
        // Skip timesheets without compensation setup
      }
    }

    const totalGross = payrollItems.reduce((sum, p) => sum + p.grossAmount, 0);
    const totalFees = payrollItems.reduce((sum, p) => sum + p.platformFee, 0);

    return {
      success: true,
      payroll: payrollItems,
      summary: { totalGross, totalFees, count: payrollItems.length },
    };
  } catch (error) {
    return { success: false, message: formatError(error), payroll: [] };
  }
}

// Process payroll batch
export async function processPayroll(data: z.infer<typeof processPayrollSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    await checkEnterpriseTierAccess(landlord.id);

    const validatedData = processPayrollSchema.parse(data);

    // Verify all timesheets are approved
    const timesheets = await prisma.timesheet.findMany({
      where: {
        id: { in: validatedData.timesheetIds },
        landlordId: landlord.id,
        status: 'approved',
      },
    });

    if (timesheets.length !== validatedData.timesheetIds.length) {
      return { success: false, message: 'Some timesheets are not approved' };
    }

    // Calculate total needed
    let totalNeeded = 0;
    const payrollItems: Array<{
      timesheetId: string;
      teamMemberId: string;
      grossAmount: number;
      regularPay: number;
      overtimePay: number;
      platformFee: number;
      netAmount: number;
    }> = [];

    for (const ts of timesheets) {
      const calc = await calculatePayroll(ts.id);
      totalNeeded += calc.grossAmount;
      payrollItems.push(calc);
    }

    // Check wallet balance
    const wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId: landlord.id },
      select: { availableBalance: true },
    });

    if (!wallet) {
      return { success: false, message: 'Wallet not found. Please set up your wallet first.' };
    }

    const walletBalance = Number(wallet.availableBalance);
    if (walletBalance < totalNeeded) {
      return {
        success: false,
        message: `Insufficient balance. You have $${walletBalance.toFixed(2)} but need $${totalNeeded.toFixed(2)}`,
      };
    }

    // Process in transaction
    const payments = await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.landlordWallet.update({
        where: { landlordId: landlord.id },
        data: { availableBalance: { decrement: totalNeeded } },
      });

      const createdPayments = [];
      for (const item of payrollItems) {
        const payment = await tx.teamPayment.create({
          data: {
            landlordId: landlord.id,
            teamMemberId: item.teamMemberId,
            timesheetId: item.timesheetId,
            grossAmount: item.grossAmount,
            platformFee: item.platformFee,
            netAmount: item.netAmount,
            regularPay: item.regularPay,
            overtimePay: item.overtimePay,
            status: 'completed',
            paidAt: new Date(),
          },
        });

        await tx.timesheet.update({
          where: { id: item.timesheetId },
          data: { status: 'paid' },
        });

        createdPayments.push(payment);
      }

      return createdPayments;
    });

    revalidatePath('/admin/team-operations');
    return {
      success: true,
      message: `Processed ${payments.length} payments totaling $${totalNeeded.toFixed(2)}`,
      paymentIds: payments.map((p) => p.id),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Send bonus payment
export async function sendBonusPayment(data: z.infer<typeof bonusPaymentSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    await checkEnterpriseTierAccess(landlord.id);

    const validatedData = bonusPaymentSchema.parse(data);

    // Verify team member
    const teamMember = await prisma.teamMember.findFirst({
      where: { id: validatedData.teamMemberId, landlordId: landlord.id },
      include: { user: { select: { name: true } } },
    });

    if (!teamMember) {
      return { success: false, message: 'Team member not found' };
    }

    const amount = validatedData.amount;
    // Enterprise tier - no platform fee on internal payroll
    const platformFee = 0;
    const netAmount = amount;

    // Check wallet balance
    const wallet = await prisma.landlordWallet.findUnique({
      where: { landlordId: landlord.id },
      select: { availableBalance: true },
    });

    if (!wallet) {
      return { success: false, message: 'Wallet not found' };
    }

    const walletBalance = Number(wallet.availableBalance);
    if (walletBalance < amount) {
      return { success: false, message: `Insufficient balance. You have $${walletBalance.toFixed(2)}` };
    }

    const payment = await prisma.$transaction(async (tx) => {
      await tx.landlordWallet.update({
        where: { landlordId: landlord.id },
        data: { availableBalance: { decrement: amount } },
      });

      return tx.teamPayment.create({
        data: {
          landlordId: landlord.id,
          teamMemberId: validatedData.teamMemberId,
          paymentType: 'bonus',
          grossAmount: amount,
          platformFee,
          netAmount,
          bonusAmount: amount,
          description: validatedData.description,
          status: 'completed',
          paidAt: new Date(),
        },
      });
    });

    revalidatePath('/admin/team-operations');
    return {
      success: true,
      message: `Bonus of $${amount.toFixed(2)} sent to ${teamMember.user.name}`,
      paymentId: payment.id,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get team payments history
export async function getTeamPayments(filters?: { teamMemberId?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', payments: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, payments: [] };
    }

    const payments = await prisma.teamPayment.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        ...(filters?.teamMemberId && { teamMemberId: filters.teamMemberId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        teamMember: { include: { user: { select: { name: true } } } },
        timesheet: { select: { periodStart: true, periodEnd: true } },
      },
    });

    return {
      success: true,
      payments: payments.map((p) => ({
        id: p.id,
        teamMemberName: p.teamMember.user.name,
        paymentType: p.paymentType,
        grossAmount: p.grossAmount.toString(),
        platformFee: p.platformFee.toString(),
        netAmount: p.netAmount.toString(),
        status: p.status,
        paidAt: p.paidAt,
        description: p.description,
        period: p.timesheet ? {
          start: p.timesheet.periodStart,
          end: p.timesheet.periodEnd,
        } : null,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), payments: [] };
  }
}


// ============= COMPENSATION & SETTINGS =============

// Get team member compensation
export async function getTeamMemberCompensation(teamMemberId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { id: teamMemberId, landlordId: landlordResult.landlord.id },
      include: { compensation: true, user: { select: { name: true } } },
    });

    if (!teamMember) {
      return { success: false, message: 'Team member not found' };
    }

    return {
      success: true,
      compensation: teamMember.compensation,
      teamMemberName: teamMember.user.name,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update team member compensation
export async function updateTeamMemberCompensation(data: z.infer<typeof teamMemberCompensationSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    await checkEnterpriseTierAccess(landlord.id);

    const validatedData = teamMemberCompensationSchema.parse(data);

    // Verify team member
    const teamMember = await prisma.teamMember.findFirst({
      where: { id: validatedData.teamMemberId, landlordId: landlord.id },
    });

    if (!teamMember) {
      return { success: false, message: 'Team member not found' };
    }

    await prisma.teamMemberCompensation.upsert({
      where: { teamMemberId: validatedData.teamMemberId },
      create: {
        teamMemberId: validatedData.teamMemberId,
        payType: validatedData.payType,
        hourlyRate: validatedData.hourlyRate,
        salaryAmount: validatedData.salaryAmount,
        overtimeRate: validatedData.overtimeRate,
        commissionRate: validatedData.commissionRate,
      },
      update: {
        payType: validatedData.payType,
        hourlyRate: validatedData.hourlyRate,
        salaryAmount: validatedData.salaryAmount,
        overtimeRate: validatedData.overtimeRate,
        commissionRate: validatedData.commissionRate,
      },
    });

    revalidatePath('/admin/team-operations');
    return { success: true, message: 'Compensation updated' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get payroll settings
export async function getPayrollSettings() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const settings = await prisma.payrollSettings.findUnique({
      where: { landlordId: landlordResult.landlord.id },
    });

    return {
      success: true,
      settings: settings || {
        payPeriodType: 'biweekly',
        payPeriodStartDay: 1,
        overtimeThreshold: 40,
        dailyOvertimeThreshold: null,
        overtimeMultiplier: 1.5,
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update payroll settings
export async function updatePayrollSettings(data: z.infer<typeof payrollSettingsSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const landlord = landlordResult.landlord;
    await checkEnterpriseTierAccess(landlord.id);

    const validatedData = payrollSettingsSchema.parse(data);

    await prisma.payrollSettings.upsert({
      where: { landlordId: landlord.id },
      create: {
        landlordId: landlord.id,
        ...validatedData,
      },
      update: validatedData,
    });

    revalidatePath('/admin/team-operations');
    return { success: true, message: 'Payroll settings updated' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= TIME OFF =============

// Request time off (team member)
export async function requestTimeOff(data: z.infer<typeof timeOffRequestSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, status: 'active' },
    });

    if (!teamMember) {
      return { success: false, message: 'Not a team member' };
    }

    const validatedData = timeOffRequestSchema.parse(data);

    const request = await prisma.timeOffRequest.create({
      data: {
        teamMemberId: teamMember.id,
        landlordId: teamMember.landlordId,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        reason: validatedData.reason || null,
      },
    });

    revalidatePath('/admin/team-operations');
    return { success: true, message: 'Time off request submitted', requestId: request.id };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get time off requests
export async function getTimeOffRequests(filters?: { status?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', requests: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, requests: [] };
    }

    const requests = await prisma.timeOffRequest.findMany({
      where: {
        landlordId: landlordResult.landlord.id,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        teamMember: { include: { user: { select: { name: true, image: true } } } },
        reviewedBy: { select: { name: true } },
      },
    });

    return {
      success: true,
      requests: requests.map((r) => ({
        id: r.id,
        teamMemberName: r.teamMember.user.name,
        teamMemberImage: r.teamMember.user.image,
        startDate: r.startDate,
        endDate: r.endDate,
        reason: r.reason,
        status: r.status,
        reviewedBy: r.reviewedBy?.name,
        reviewedAt: r.reviewedAt,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), requests: [] };
  }
}

// Review time off request (landlord)
export async function reviewTimeOff(data: z.infer<typeof reviewTimeOffSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const validatedData = reviewTimeOffSchema.parse(data);

    const request = await prisma.timeOffRequest.findFirst({
      where: { id: validatedData.id, landlordId: landlordResult.landlord.id, status: 'pending' },
    });

    if (!request) {
      return { success: false, message: 'Request not found or already reviewed' };
    }

    await prisma.timeOffRequest.update({
      where: { id: validatedData.id },
      data: {
        status: validatedData.status,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: validatedData.reviewNotes || null,
      },
    });

    revalidatePath('/admin/team-operations');
    return { success: true, message: `Time off request ${validatedData.status}` };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= REPORTS =============

// Get labor costs by property
export async function getLaborCostsByProperty(dateRange?: { start: Date; end: Date }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', report: null };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, report: null };
    }

    const whereClause: Record<string, unknown> = {
      landlordId: landlordResult.landlord.id,
      clockOut: { not: null },
    };

    if (dateRange) {
      whereClause.clockIn = { gte: dateRange.start, lte: dateRange.end };
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        property: { select: { id: true, name: true } },
        teamMember: { include: { compensation: true } },
      },
    });

    const byProperty: Record<string, { name: string; totalHours: number; totalCost: number }> = {};
    let unassignedHours = 0;
    let unassignedCost = 0;

    for (const entry of timeEntries) {
      const hours = (entry.totalMinutes || 0) / 60;
      const hourlyRate = Number(entry.teamMember.compensation?.hourlyRate || 0);
      const cost = hours * hourlyRate;

      if (entry.propertyId && entry.property) {
        if (!byProperty[entry.propertyId]) {
          byProperty[entry.propertyId] = { name: entry.property.name, totalHours: 0, totalCost: 0 };
        }
        byProperty[entry.propertyId].totalHours += hours;
        byProperty[entry.propertyId].totalCost += cost;
      } else {
        unassignedHours += hours;
        unassignedCost += cost;
      }
    }

    return {
      success: true,
      report: {
        byProperty: Object.entries(byProperty).map(([id, data]) => ({
          propertyId: id,
          ...data,
        })),
        unassigned: { totalHours: unassignedHours, totalCost: unassignedCost },
        totalHours: Object.values(byProperty).reduce((sum, p) => sum + p.totalHours, 0) + unassignedHours,
        totalCost: Object.values(byProperty).reduce((sum, p) => sum + p.totalCost, 0) + unassignedCost,
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error), report: null };
  }
}
