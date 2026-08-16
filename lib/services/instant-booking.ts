import { prisma as db } from '@/db/prisma';
import { contractorSchedulerService } from './contractor-scheduler';
import { addDays, differenceInHours } from 'date-fns';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Platform fee: $1 flat from each side (customer + contractor) per transaction
const PLATFORM_FEE_PER_SIDE = 1.00;
// Days after completion before auto-release (dispute window)
const AUTO_RELEASE_DAYS = 3;

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  serviceTypes?: string[];
}

export interface BookingRequest {
  contractorId: string;
  customerId: string;
  serviceType: string;
  startTime: Date;
  endTime: Date;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  notes?: string;
  depositAmount?: number;
}

export interface Booking {
  id: string;
  contractorId: string;
  customerId: string;
  serviceType: string;
  title: string;
  description?: string;
  address: any;
  startTime: Date;
  endTime: Date;
  status: string;
  depositAmount?: number;
  depositPaid: boolean;
  depositPaymentId?: string;
  escrowStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CancellationResult {
  success: boolean;
  refundAmount?: number;
  message: string;
}

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  paymentIntentId: string;
}

export class InstantBookingService {
  /**
   * Get available time slots for a contractor on a specific date
   */
  async getAvailableSlots(
    contractorId: string,
    date: Date,
    serviceType: string,
    slotDuration: number = 60
  ): Promise<TimeSlot[]> {
    const contractor = await db.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        instantBookingEnabled: true,
        specialties: true,
      },
    });

    if (!contractor || !contractor.instantBookingEnabled) {
      return [];
    }

    if (!contractor.specialties.includes(serviceType)) {
      return [];
    }

    const slots = await contractorSchedulerService.getAvailableSlots(
      contractorId,
      date,
      slotDuration
    );

    return slots.map((slot) => ({
      ...slot,
      serviceTypes: contractor.specialties,
    }));
  }

  /**
   * Create an instant booking.
   *
   * Deposit flow (escrow):
   * 1. Customer pays deposit → funds go to PLATFORM Stripe account (not contractor)
   * 2. Contractor does the job → marks as completed
   * 3. Customer confirms completion (or 3-day auto-release window passes)
   * 4. Platform releases funds to contractor minus platform fee
   *
   * If contractor no-shows → customer files dispute → platform refunds from held funds
   * If contractor cancels → automatic full refund
   */
  async createBooking(data: BookingRequest): Promise<Booking> {
    const contractor = await db.contractorProfile.findUnique({
      where: { id: data.contractorId },
      select: {
        instantBookingEnabled: true,
        depositRequired: true,
        depositAmount: true,
        depositPercent: true,
        specialties: true,
      },
    });

    if (!contractor || !contractor.instantBookingEnabled) {
      throw new Error('Instant booking is not enabled for this contractor');
    }

    if (!contractor.specialties.includes(data.serviceType)) {
      throw new Error('Contractor does not offer this service type');
    }

    const isAvailable = await contractorSchedulerService.isSlotAvailable(
      data.contractorId,
      data.startTime,
      data.endTime
    );

    if (!isAvailable) {
      throw new Error('Time slot is no longer available');
    }

    // Calculate deposit
    let depositAmount = data.depositAmount;
    if (contractor.depositRequired && !depositAmount) {
      if (contractor.depositAmount) {
        depositAmount = Number(contractor.depositAmount);
      } else if (contractor.depositPercent) {
        throw new Error('Deposit amount is required for this booking');
      }
    }

    const appointment = await contractorSchedulerService.createAppointment({
      contractorId: data.contractorId,
      customerId: data.customerId,
      serviceType: data.serviceType,
      title: `${data.serviceType} - Instant Booking`,
      description: data.notes,
      address: data.address,
      startTime: data.startTime,
      endTime: data.endTime,
      depositAmount: depositAmount,
    });

    return {
      id: appointment.id,
      contractorId: appointment.contractorId,
      customerId: appointment.customerId,
      serviceType: appointment.serviceType,
      title: appointment.title,
      description: appointment.description || undefined,
      address: appointment.address,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      depositAmount: appointment.depositAmount
        ? Number(appointment.depositAmount)
        : undefined,
      depositPaid: appointment.depositPaid,
      depositPaymentId: appointment.depositPaymentId || undefined,
      escrowStatus: appointment.escrowStatus,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  /**
   * Create a payment intent for deposit.
   * Funds are held by the PLATFORM (escrow) — not sent to the contractor.
   */
  async applyDeposit(
    bookingId: string,
    amount: number
  ): Promise<PaymentIntent> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const appointment = await db.contractorAppointment.findUnique({
      where: { id: bookingId },
      include: {
        contractor: {
          select: {
            stripeCustomerId: true,
            businessName: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Booking not found');
    }

    if (appointment.depositPaid) {
      throw new Error('Deposit has already been paid');
    }

    // Payment goes to platform account — NO transfer_data.
    // This is the escrow: platform holds the money until job is done.
    // Amount = deposit + $1 customer-side platform fee
    const totalCharge = amount + PLATFORM_FEE_PER_SIDE;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalCharge * 100),
      currency: 'usd',
      metadata: {
        bookingId: appointment.id,
        contractorId: appointment.contractorId,
        customerId: appointment.customerId,
        type: 'booking_deposit_escrow',
        depositAmount: String(amount),
        customerFee: String(PLATFORM_FEE_PER_SIDE),
      },
      description: `Escrow deposit for booking with ${appointment.contractor.businessName} ($${amount.toFixed(2)} deposit + $${PLATFORM_FEE_PER_SIDE.toFixed(2)} booking fee)`,
    });

    await db.contractorAppointment.update({
      where: { id: bookingId },
      data: {
        depositPaymentId: paymentIntent.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      amount,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Mark deposit as paid and set escrow status to "held".
   * Called after Stripe webhook confirms payment succeeded.
   */
  async markDepositPaid(bookingId: string, paymentIntentId: string): Promise<void> {
    await db.contractorAppointment.update({
      where: { id: bookingId },
      data: {
        depositPaid: true,
        depositPaymentId: paymentIntentId,
        escrowStatus: 'held',
      },
    });
  }

  /**
   * Contractor marks job as completed.
   * Starts the auto-release countdown (dispute window).
   */
  async markCompleted(bookingId: string, contractorUserId: string): Promise<void> {
    const appointment = await db.contractorAppointment.findUnique({
      where: { id: bookingId },
      include: { contractor: { select: { userId: true } } },
    });

    if (!appointment) throw new Error('Booking not found');
    if (appointment.contractor.userId !== contractorUserId) {
      throw new Error('Only the contractor can mark this as completed');
    }
    if (appointment.status === 'cancelled') {
      throw new Error('Cannot complete a cancelled booking');
    }

    const autoReleaseAt = addDays(new Date(), AUTO_RELEASE_DAYS);

    await db.contractorAppointment.update({
      where: { id: bookingId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        autoReleaseAt,
      },
    });
  }

  /**
   * Customer confirms the job is done.
   * Immediately releases escrow funds to contractor.
   */
  async customerConfirmCompletion(bookingId: string, customerUserId: string): Promise<void> {
    const appointment = await db.contractorAppointment.findUnique({
      where: { id: bookingId },
    });

    if (!appointment) throw new Error('Booking not found');
    if (appointment.customerId !== customerUserId) {
      throw new Error('Only the customer can confirm completion');
    }
    if (appointment.status !== 'completed') {
      throw new Error('Job must be marked as completed by the contractor first');
    }

    await db.contractorAppointment.update({
      where: { id: bookingId },
      data: { customerConfirmedAt: new Date() },
    });

    // Release escrow immediately
    if (appointment.escrowStatus === 'held') {
      await this.releaseEscrow(bookingId);
    }
  }

  /**
   * Release escrow funds to contractor.
   * Called when customer confirms, or by cron job after auto-release window.
   */
  async releaseEscrow(bookingId: string): Promise<void> {
    const appointment = await db.contractorAppointment.findUnique({
      where: { id: bookingId },
      include: {
        contractor: {
          select: { stripeCustomerId: true, businessName: true },
        },
      },
    });

    if (!appointment) throw new Error('Booking not found');
    if (appointment.escrowStatus !== 'held') {
      throw new Error('No funds held in escrow for this booking');
    }
    if (!appointment.depositPaymentId || !appointment.depositAmount) {
      throw new Error('No deposit to release');
    }

    const depositAmount = Number(appointment.depositAmount);
    const platformFee = PLATFORM_FEE_PER_SIDE; // $1 from contractor side
    const contractorAmount = depositAmount - platformFee;

    // If contractor has a Stripe Connect account, transfer funds.
    // Otherwise, mark as released and handle payout manually.
    if (stripe && appointment.contractor.stripeCustomerId) {
      try {
        await stripe.transfers.create({
          amount: Math.round(contractorAmount * 100),
          currency: 'usd',
          destination: appointment.contractor.stripeCustomerId,
          metadata: {
            bookingId: appointment.id,
            type: 'escrow_release',
          },
          description: `Escrow release for booking ${appointment.id}`,
        });
      } catch (error) {
        console.error('Stripe transfer failed:', error);
        // Don't throw — mark as released anyway and handle manually
      }
    }

    await db.contractorAppointment.update({
      where: { id: bookingId },
      data: {
        escrowStatus: 'released',
        escrowReleasedAt: new Date(),
        platformFee,
      },
    });
  }

  /**
   * Customer files a dispute (contractor no-show, bad work, etc.)
   * Prevents auto-release and flags for admin review.
   */
  async fileDispute(
    bookingId: string,
    customerUserId: string,
    reason: string
  ): Promise<void> {
    const appointment = await db.contractorAppointment.findUnique({
      where: { id: bookingId },
    });

    if (!appointment) throw new Error('Booking not found');
    if (appointment.customerId !== customerUserId) {
      throw new Error('Only the customer can file a dispute');
    }
    if (appointment.escrowStatus === 'released') {
      throw new Error('Funds have already been released');
    }
    if (appointment.escrowStatus === 'refunded') {
      throw new Error('Funds have already been refunded');
    }

    await db.contractorAppointment.update({
      where: { id: bookingId },
      data: {
        escrowStatus: 'disputed',
        disputeReason: reason,
        disputeFiledAt: new Date(),
        autoReleaseAt: null, // Cancel auto-release
      },
    });
  }

  /**
   * Cancel a booking and apply cancellation policy.
   *
   * - Contractor cancels → full refund always
   * - Customer cancels → refund based on cancellation policy
   */
  async cancelBooking(
    bookingId: string,
    cancelledBy: 'contractor' | 'customer',
    reason?: string
  ): Promise<CancellationResult> {
    const appointment = await db.contractorAppointment.findUnique({
      where: { id: bookingId },
      include: {
        contractor: {
          select: {
            cancellationPolicy: true,
            cancellationHours: true,
          },
        },
      },
    });

    if (!appointment) throw new Error('Booking not found');
    if (appointment.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    const hoursUntilAppointment = differenceInHours(
      appointment.startTime,
      new Date()
    );

    let refundAmount = 0;
    let message = 'Booking cancelled successfully';

    if (cancelledBy === 'contractor') {
      // Contractor cancels → always full refund to customer
      refundAmount = Number(appointment.depositAmount || 0);
      message = 'Booking cancelled by contractor. Full deposit refund will be processed.';
    } else if (
      cancelledBy === 'customer' &&
      appointment.depositPaid &&
      appointment.depositAmount
    ) {
      const depositAmount = Number(appointment.depositAmount);
      const cancellationHours = appointment.contractor.cancellationHours || 24;
      const policy = appointment.contractor.cancellationPolicy || 'moderate';

      switch (policy) {
        case 'flexible':
          refundAmount = depositAmount * 0.5;
          message = 'Booking cancelled. 50% deposit refund per flexible policy.';
          break;
        case 'moderate':
          if (hoursUntilAppointment >= cancellationHours) {
            refundAmount = depositAmount;
            message = 'Booking cancelled. Full deposit refund will be processed.';
          } else {
            refundAmount = 0;
            message = `Booking cancelled. No refund for cancellations within ${cancellationHours} hours.`;
          }
          break;
        case 'strict':
          refundAmount = 0;
          message = 'Booking cancelled. No refund per strict cancellation policy.';
          break;
      }
    }

    // Cancel the appointment
    await contractorSchedulerService.cancelAppointment(
      bookingId,
      cancelledBy,
      reason
    );

    // Process Stripe refund if applicable
    if (refundAmount > 0 && appointment.depositPaymentId && stripe) {
      try {
        await stripe.refunds.create({
          payment_intent: appointment.depositPaymentId,
          amount: Math.round(refundAmount * 100),
        });

        await db.contractorAppointment.update({
          where: { id: bookingId },
          data: {
            escrowStatus: 'refunded',
            escrowRefundedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Refund failed:', error);
        message += ' Refund processing failed — please contact support.';
      }
    } else if (appointment.depositPaid && refundAmount === 0 && cancelledBy === 'customer') {
      // Customer cancelled late — release deposit to contractor
      if (appointment.escrowStatus === 'held') {
        await this.releaseEscrow(bookingId);
      }
    }

    return { success: true, refundAmount, message };
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    const appointment = await db.contractorAppointment.findUnique({
      where: { id: bookingId },
    });

    if (!appointment) return null;

    return {
      id: appointment.id,
      contractorId: appointment.contractorId,
      customerId: appointment.customerId,
      serviceType: appointment.serviceType,
      title: appointment.title,
      description: appointment.description || undefined,
      address: appointment.address,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      depositAmount: appointment.depositAmount
        ? Number(appointment.depositAmount)
        : undefined,
      depositPaid: appointment.depositPaid,
      depositPaymentId: appointment.depositPaymentId || undefined,
      escrowStatus: appointment.escrowStatus,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}

export const instantBookingService = new InstantBookingService();
