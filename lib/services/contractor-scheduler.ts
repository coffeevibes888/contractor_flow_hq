import { prisma as db } from '@/db/prisma';
import { addDays, addMinutes, format, parse, startOfDay, endOfDay, isWithinInterval, isBefore, isAfter } from 'date-fns';

export interface Availability {
  weeklySchedule: {
    [day: string]: { start: string; end: string; enabled: boolean };
  };
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  blockedDates: Date[];
}

export interface AppointmentData {
  contractorId: string;
  customerId: string;
  serviceType: string;
  title: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  startTime: Date;
  endTime: Date;
  depositAmount?: number;
  jobId?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
}

export class ContractorSchedulerService {
  /**
   * Get contractor's availability settings
   */
  async getAvailability(contractorId: string): Promise<Availability | null> {
    const availability = await db.contractorAvailability.findUnique({
      where: { contractorId },
    });

    if (!availability) {
      return null;
    }

    return {
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
  }

  /**
   * Set contractor's availability settings
   */
  async setAvailability(contractorId: string, availability: Availability): Promise<void> {
    const data = {
      contractorId,
      mondayStart: availability.weeklySchedule.monday?.start,
      mondayEnd: availability.weeklySchedule.monday?.end,
      mondayEnabled: availability.weeklySchedule.monday?.enabled ?? true,
      tuesdayStart: availability.weeklySchedule.tuesday?.start,
      tuesdayEnd: availability.weeklySchedule.tuesday?.end,
      tuesdayEnabled: availability.weeklySchedule.tuesday?.enabled ?? true,
      wednesdayStart: availability.weeklySchedule.wednesday?.start,
      wednesdayEnd: availability.weeklySchedule.wednesday?.end,
      wednesdayEnabled: availability.weeklySchedule.wednesday?.enabled ?? true,
      thursdayStart: availability.weeklySchedule.thursday?.start,
      thursdayEnd: availability.weeklySchedule.thursday?.end,
      thursdayEnabled: availability.weeklySchedule.thursday?.enabled ?? true,
      fridayStart: availability.weeklySchedule.friday?.start,
      fridayEnd: availability.weeklySchedule.friday?.end,
      fridayEnabled: availability.weeklySchedule.friday?.enabled ?? true,
      saturdayStart: availability.weeklySchedule.saturday?.start,
      saturdayEnd: availability.weeklySchedule.saturday?.end,
      saturdayEnabled: availability.weeklySchedule.saturday?.enabled ?? false,
      sundayStart: availability.weeklySchedule.sunday?.start,
      sundayEnd: availability.weeklySchedule.sunday?.end,
      sundayEnabled: availability.weeklySchedule.sunday?.enabled ?? false,
      bufferMinutes: availability.bufferMinutes,
      minNoticeHours: availability.minNoticeHours,
      maxAdvanceDays: availability.maxAdvanceDays,
      blockedDates: availability.blockedDates,
    };

    await db.contractorAvailability.upsert({
      where: { contractorId },
      create: data,
      update: data,
    });
  }

  /**
   * Get appointments for a contractor within a date range
   */
  async getAppointments(contractorId: string, dateRange: DateRange) {
    const appointments = await db.contractorAppointment.findMany({
      where: {
        contractorId,
        startTime: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        status: {
          not: 'cancelled',
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return appointments;
  }

  /**
   * Create a new appointment
   */
  async createAppointment(data: AppointmentData) {
    // Check if slot is available
    const isAvailable = await this.isSlotAvailable(
      data.contractorId,
      data.startTime,
      data.endTime
    );

    if (!isAvailable) {
      throw new Error('Time slot is not available');
    }

    const appointment = await db.contractorAppointment.create({
      data: {
        contractorId: data.contractorId,
        customerId: data.customerId,
        serviceType: data.serviceType,
        title: data.title,
        description: data.description,
        address: data.address,
        startTime: data.startTime,
        endTime: data.endTime,
        depositAmount: data.depositAmount,
        jobId: data.jobId,
        status: 'confirmed',
      },
    });

    // ✅ NEW: Emit event for appointment creation (replaces cron job)
    try {
      const { dbTriggers } = await import('@/lib/event-system');
      await dbTriggers.onAppointmentCreate(appointment);
    } catch (error) {
      console.error('Failed to emit appointment event:', error);
    }

    return appointment;
  }

  /**
   * Update an appointment
   */
  async updateAppointment(
    appointmentId: string,
    updates: Partial<AppointmentData>
  ) {
    // If rescheduling, check availability
    if (updates.startTime && updates.endTime) {
      const appointment = await db.contractorAppointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const isAvailable = await this.isSlotAvailable(
        appointment.contractorId,
        updates.startTime,
        updates.endTime,
        appointmentId
      );

      if (!isAvailable) {
        throw new Error('Time slot is not available');
      }
    }

    const appointment = await db.contractorAppointment.update({
      where: { id: appointmentId },
      data: {
        serviceType: updates.serviceType,
        title: updates.title,
        description: updates.description,
        address: updates.address,
        startTime: updates.startTime,
        endTime: updates.endTime,
      },
    });

    return appointment;
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    appointmentId: string,
    cancelledBy: 'contractor' | 'customer',
    reason?: string
  ) {
    const appointment = await db.contractorAppointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason,
      },
    });

    return appointment;
  }

  /**
   * Mark appointment as completed
   */
  async completeAppointment(appointmentId: string) {
    const appointment = await db.contractorAppointment.update({
      where: { id: appointmentId },
      data: {
        status: 'completed',
      },
    });

    return appointment;
  }

  /**
   * Check if a time slot is available
   */
  async isSlotAvailable(
    contractorId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    // Get availability settings
    const availability = await this.getAvailability(contractorId);
    if (!availability) {
      return false;
    }

    // Check if date is blocked
    const isBlocked = availability.blockedDates.some((blockedDate) => {
      const blocked = new Date(blockedDate);
      return (
        startOfDay(blocked).getTime() === startOfDay(startTime).getTime()
      );
    });

    if (isBlocked) {
      return false;
    }

    // Check minimum notice hours
    const now = new Date();
    const minNoticeTime = addMinutes(now, availability.minNoticeHours * 60);
    if (isBefore(startTime, minNoticeTime)) {
      return false;
    }

    // Check maximum advance days
    const maxAdvanceTime = addDays(now, availability.maxAdvanceDays);
    if (isAfter(startTime, maxAdvanceTime)) {
      return false;
    }

    // Check if within weekly schedule
    const dayName = format(startTime, 'EEEE').toLowerCase();
    const daySchedule = availability.weeklySchedule[dayName];

    if (!daySchedule || !daySchedule.enabled) {
      return false;
    }

    // Parse schedule times for the specific date
    const scheduleStart = parse(daySchedule.start, 'HH:mm', startTime);
    const scheduleEnd = parse(daySchedule.end, 'HH:mm', startTime);

    // Check if appointment is within schedule hours
    if (
      isBefore(startTime, scheduleStart) ||
      isAfter(endTime, scheduleEnd)
    ) {
      return false;
    }

    // Check for overlapping appointments
    const existingAppointments = await db.contractorAppointment.findMany({
      where: {
        contractorId,
        status: {
          not: 'cancelled',
        },
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        OR: [
          {
            // Existing appointment starts during new slot
            startTime: {
              gte: startTime,
              lt: endTime,
            },
          },
          {
            // Existing appointment ends during new slot
            endTime: {
              gt: startTime,
              lte: endTime,
            },
          },
          {
            // Existing appointment completely contains new slot
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gte: endTime } },
            ],
          },
        ],
      },
    });

    if (existingAppointments.length > 0) {
      return false;
    }

    // Check buffer time with adjacent appointments
    const bufferStart = addMinutes(startTime, -availability.bufferMinutes);
    const bufferEnd = addMinutes(endTime, availability.bufferMinutes);

    const adjacentAppointments = await db.contractorAppointment.findMany({
      where: {
        contractorId,
        status: {
          not: 'cancelled',
        },
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        OR: [
          {
            endTime: {
              gt: bufferStart,
              lte: startTime,
            },
          },
          {
            startTime: {
              gte: endTime,
              lt: bufferEnd,
            },
          },
        ],
      },
    });

    if (adjacentAppointments.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(
    contractorId: string,
    date: Date,
    slotDuration: number = 60 // minutes
  ): Promise<TimeSlot[]> {
    const availability = await this.getAvailability(contractorId);
    if (!availability) {
      return [];
    }

    // Check if date is beyond maximum advance days
    const now = new Date();
    const maxAdvanceTime = addDays(now, availability.maxAdvanceDays);
    if (isAfter(startOfDay(date), startOfDay(maxAdvanceTime))) {
      return [];
    }

    // Check if date is blocked
    const isBlocked = availability.blockedDates.some((blockedDate) => {
      const blocked = new Date(blockedDate);
      return startOfDay(blocked).getTime() === startOfDay(date).getTime();
    });

    if (isBlocked) {
      return [];
    }

    // Get day schedule
    const dayName = format(date, 'EEEE').toLowerCase();
    const daySchedule = availability.weeklySchedule[dayName];

    if (!daySchedule || !daySchedule.enabled) {
      return [];
    }

    // Parse schedule times
    const scheduleStart = parse(daySchedule.start, 'HH:mm', date);
    const scheduleEnd = parse(daySchedule.end, 'HH:mm', date);

    // Generate all possible slots
    const slots: TimeSlot[] = [];
    let currentTime = scheduleStart;

    while (isBefore(currentTime, scheduleEnd)) {
      const slotEnd = addMinutes(currentTime, slotDuration);

      if (isAfter(slotEnd, scheduleEnd)) {
        break;
      }

      const isAvailable = await this.isSlotAvailable(
        contractorId,
        currentTime,
        slotEnd
      );

      slots.push({
        startTime: currentTime,
        endTime: slotEnd,
        isAvailable,
      });

      currentTime = addMinutes(currentTime, slotDuration);
    }

    return slots;
  }

  /**
   * Get appointments that need reminders (24 hours before)
   */
  async getAppointmentsNeedingReminders(): Promise<any[]> {
    const now = new Date();
    const reminderWindow = addMinutes(now, 24 * 60); // 24 hours from now
    const reminderWindowEnd = addMinutes(reminderWindow, 5); // 5 minute window

    const appointments = await db.contractorAppointment.findMany({
      where: {
        status: 'confirmed',
        startTime: {
          gte: reminderWindow,
          lte: reminderWindowEnd,
        },
      },
      include: {
        contractor: {
          select: {
            businessName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return appointments;
  }

  /**
   * Sync with Google Calendar (placeholder for OAuth implementation)
   */
  async syncWithGoogleCalendar(contractorId: string, token: string): Promise<void> {
    // Store the token
    await db.contractorProfile.update({
      where: { id: contractorId },
      data: {
        googleCalendarToken: token,
      },
    });

    // TODO: Implement bidirectional sync with Google Calendar API
    // This would involve:
    // 1. Fetching events from Google Calendar
    // 2. Creating appointments in our system
    // 3. Pushing our appointments to Google Calendar
    // 4. Setting up webhooks for real-time sync
  }

  /**
   * Sync with Outlook Calendar (placeholder for OAuth implementation)
   */
  async syncWithOutlook(contractorId: string, token: string): Promise<void> {
    // Store the token
    await db.contractorProfile.update({
      where: { id: contractorId },
      data: {
        outlookCalendarToken: token,
      },
    });

    // TODO: Implement bidirectional sync with Outlook Calendar API
  }
}

export const contractorSchedulerService = new ContractorSchedulerService();
