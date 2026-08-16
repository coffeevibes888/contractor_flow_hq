'use server';

/**
 * Contractor scheduling actions.
 *
 * Owners and employees with the right permissions can create, read, update,
 * and delete shifts for their team. Shifts are scoped to a ContractorProfile
 * and reference a ContractorEmployee — never a landlord-side TeamMember.
 *
 * Permissions used:
 *   - jobs.schedule  (or team.invite as a stand-in for "manages crew") to
 *                    create/update/delete shifts
 *   - team.view      to read shifts (read-only access)
 *   - The owner gets all of these by default.
 */

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';
import { formatError } from '../utils';

// ─── Validators ──────────────────────────────────────────────────────────────

const SHIFT_TIME = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24h

export const contractorShiftSchema = z.object({
  employeeId: z.string().uuid('Invalid employee'),
  jobId: z.string().uuid().optional().nullable(),
  date: z.string().min(1, 'Date is required'), // ISO date string
  startTime: z.string().regex(SHIFT_TIME, 'Start time must be HH:MM'),
  endTime: z.string().regex(SHIFT_TIME, 'End time must be HH:MM'),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateContractorShiftSchema = contractorShiftSchema.partial().extend({
  id: z.string().uuid('Invalid shift'),
  status: z.enum(['scheduled', 'completed', 'missed', 'cancelled']).optional(),
});

// ─── Permission helpers ──────────────────────────────────────────────────────

async function requireScheduleManager() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' as const };
  }
  const ca = await resolveContractorAuth(session.user.id);
  if (!ca) return { error: 'Contractor profile not found' as const };

  // jobs.schedule is the primary key for "can manage shifts." Owners always
  // have it; foremen, ops managers and office admins typically do too.
  if (!ca.isOwner && !can(ca, 'jobs.schedule')) {
    return { error: 'You do not have permission to manage shifts' as const };
  }
  return { contractorAuth: ca };
}

async function requireScheduleViewer() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' as const };
  }
  const ca = await resolveContractorAuth(session.user.id);
  if (!ca) return { error: 'Contractor profile not found' as const };

  if (!ca.isOwner && !can(ca, 'team.view')) {
    return { error: 'You do not have permission to view team schedule' as const };
  }
  return { contractorAuth: ca };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createContractorShift(
  data: z.infer<typeof contractorShiftSchema>,
) {
  try {
    const guard = await requireScheduleManager();
    if ('error' in guard) return { success: false, message: guard.error };
    const { contractorAuth } = guard;

    const validated = contractorShiftSchema.parse(data);

    // Verify the employee belongs to this contractor and is active
    const employee = await prisma.contractorEmployee.findFirst({
      where: {
        id: validated.employeeId,
        contractorId: contractorAuth.contractorId,
        status: { in: ['active', 'invited'] },
      },
      select: { id: true },
    });
    if (!employee) {
      return { success: false, message: 'Team member not found on this account' };
    }

    // If a job link was provided, verify it too
    if (validated.jobId) {
      const job = await prisma.contractorJob.findFirst({
        where: { id: validated.jobId, contractorId: contractorAuth.contractorId },
        select: { id: true },
      });
      if (!job) {
        return { success: false, message: 'Selected job does not belong to this account' };
      }
    }

    const shift = await prisma.contractorShift.create({
      data: {
        contractorId: contractorAuth.contractorId,
        employeeId: validated.employeeId,
        jobId: validated.jobId || null,
        date: new Date(validated.date),
        startTime: validated.startTime,
        endTime: validated.endTime,
        notes: validated.notes || null,
      },
    });

    revalidatePath('/contractor-dashboard/team/schedule');
    revalidatePath('/contractor-dashboard/team/timesheets');
    return { success: true, shiftId: shift.id, message: 'Shift created' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getContractorShifts(filters?: {
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
  jobId?: string;
}) {
  try {
    const guard = await requireScheduleViewer();
    if ('error' in guard) return { success: false, message: guard.error, shifts: [] };
    const { contractorAuth } = guard;

    // If the caller is an employee (not the owner) and doesn't have
    // team.view_all, scope to just their own shifts.
    const restrictToSelf =
      !contractorAuth.isOwner && !can(contractorAuth, 'time.view_all');

    const shifts = await prisma.contractorShift.findMany({
      where: {
        contractorId: contractorAuth.contractorId,
        ...(restrictToSelf && contractorAuth.employeeId
          ? { employeeId: contractorAuth.employeeId }
          : {}),
        ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters?.jobId ? { jobId: filters.jobId } : {}),
        ...(filters?.startDate && filters?.endDate
          ? { date: { gte: filters.startDate, lte: filters.endDate } }
          : {}),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            jobNumber: true,
            address: true,
          },
        },
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
        employee: {
          id: s.employee.id,
          name: `${s.employee.firstName} ${s.employee.lastName}`.trim() || 'Unnamed',
          image: s.employee.photo,
        },
        job: s.job
          ? {
              id: s.job.id,
              title: s.job.title,
              jobNumber: s.job.jobNumber,
              address: s.job.address,
            }
          : null,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), shifts: [] };
  }
}

export async function updateContractorShift(
  data: z.infer<typeof updateContractorShiftSchema>,
) {
  try {
    const guard = await requireScheduleManager();
    if ('error' in guard) return { success: false, message: guard.error };
    const { contractorAuth } = guard;

    const validated = updateContractorShiftSchema.parse(data);

    const shift = await prisma.contractorShift.findFirst({
      where: { id: validated.id, contractorId: contractorAuth.contractorId },
      select: { id: true },
    });
    if (!shift) return { success: false, message: 'Shift not found' };

    // If updating the linked job, verify it
    if (validated.jobId) {
      const job = await prisma.contractorJob.findFirst({
        where: { id: validated.jobId, contractorId: contractorAuth.contractorId },
        select: { id: true },
      });
      if (!job) {
        return { success: false, message: 'Selected job does not belong to this account' };
      }
    }

    await prisma.contractorShift.update({
      where: { id: validated.id },
      data: {
        ...(validated.employeeId !== undefined && { employeeId: validated.employeeId }),
        ...(validated.jobId !== undefined && { jobId: validated.jobId || null }),
        ...(validated.date && { date: new Date(validated.date) }),
        ...(validated.startTime && { startTime: validated.startTime }),
        ...(validated.endTime && { endTime: validated.endTime }),
        ...(validated.notes !== undefined && { notes: validated.notes || null }),
        ...(validated.status && { status: validated.status }),
      },
    });

    revalidatePath('/contractor-dashboard/team/schedule');
    return { success: true, message: 'Shift updated' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deleteContractorShift(shiftId: string) {
  try {
    const guard = await requireScheduleManager();
    if ('error' in guard) return { success: false, message: guard.error };
    const { contractorAuth } = guard;

    const shift = await prisma.contractorShift.findFirst({
      where: { id: shiftId, contractorId: contractorAuth.contractorId },
      select: { id: true },
    });
    if (!shift) return { success: false, message: 'Shift not found' };

    await prisma.contractorShift.delete({ where: { id: shiftId } });

    revalidatePath('/contractor-dashboard/team/schedule');
    return { success: true, message: 'Shift deleted' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
