'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function setPropertySchedule(
  propertyId: string,
  schedule: {
    monday?: { enabled: boolean; slots: { start: string; end: string }[] };
    tuesday?: { enabled: boolean; slots: { start: string; end: string }[] };
    wednesday?: { enabled: boolean; slots: { start: string; end: string }[] };
    thursday?: { enabled: boolean; slots: { start: string; end: string }[] };
    friday?: { enabled: boolean; slots: { start: string; end: string }[] };
    saturday?: { enabled: boolean; slots: { start: string; end: string }[] };
    sunday?: { enabled: boolean; slots: { start: string; end: string }[] };
  },
  options?: {
    timezone?: string;
    slotDuration?: number;
    bufferTime?: number;
  }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const isAllowed = role === 'admin' || role === 'superAdmin' || role === 'landlord' || role === 'property_manager';
    
    if (!session?.user?.id || !isAllowed) {
      return { success: false, message: 'Unauthorized' };
    }

    const existingSchedule = await prisma.propertySchedule.findUnique({
      where: { propertyId },
    });

    let propertySchedule;
    if (existingSchedule) {
      propertySchedule = await prisma.propertySchedule.update({
        where: { propertyId },
        data: {
          schedule,
          timezone: options?.timezone || existingSchedule.timezone,
          slotDuration: options?.slotDuration || existingSchedule.slotDuration,
          bufferTime: options?.bufferTime || existingSchedule.bufferTime,
        },
      });
    } else {
      propertySchedule = await prisma.propertySchedule.create({
        data: {
          propertyId,
          schedule,
          timezone: options?.timezone || 'America/Los_Angeles',
          slotDuration: options?.slotDuration || 30,
          bufferTime: options?.bufferTime || 0,
        },
      });
    }

    revalidatePath(`/admin/dashboard/properties/${propertyId}`);
    revalidatePath('/admin/dashboard/properties');
    return { success: true, schedule: propertySchedule };
  } catch (error) {
    console.error('Set schedule error:', error);
    return { success: false, message: 'Failed to set schedule' };
  }
}

export async function getPropertySchedule(propertyId: string) {
  try {
    const schedule = await prisma.propertySchedule.findUnique({
      where: { propertyId },
    });

    return { success: true, schedule };
  } catch (error) {
    console.error('Get schedule error:', error);
    return { success: false, message: 'Failed to fetch schedule' };
  }
}

export async function bookAppointment(data: {
  propertyId: string;
  name: string;
  email: string;
  phone?: string;
  date: Date;
  startTime: string;
  endTime: string;
  notes?: string;
}) {
  try {
    const appointment = await prisma.propertyAppointment.create({
      data: {
        ...data,
        status: 'pending',
      },
    });

    // ✅ NEW: Emit event for property showing (sends confirmation + reminders)
    try {
      const { dbTriggers } = await import('@/lib/event-system');
      await dbTriggers.onPropertyAppointmentCreate(appointment);
    } catch (error) {
      console.error('Failed to emit property showing event:', error);
    }

    return { success: true, appointment };
  } catch (error) {
    console.error('Book appointment error:', error);
    return { success: false, message: 'Failed to book appointment' };
  }
}

export async function getPropertyAppointments(propertyId: string, date?: Date) {
  try {
    const where: any = { propertyId };
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const appointments = await prisma.propertyAppointment.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return { success: true, appointments };
  } catch (error) {
    console.error('Get appointments error:', error);
    return { success: false, message: 'Failed to fetch appointments' };
  }
}
