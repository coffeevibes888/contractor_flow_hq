/**
 * Cash Payment Actions
 * Generate barcodes for retail cash payments at Walmart, 7-Eleven, CVS, etc.
 * 
 * Currently uses mock barcode generation. Integrate a cash payment provider
 * (e.g. PayNearMe, Exact Payments) by replacing the stubs below.
 */

'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { formatError } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

// ---- Cash provider stubs (replace with real provider when ready) ----
const CASH_PAYMENT_FEE = 0.88; // $0.88 flat retail fee

function isPayNearMeConfigured(): boolean { return false; }

async function createPayNearMeOrder(opts: {
  orderId: string; amount: number; customerId: string;
  customerFirstName: string; customerLastName: string;
  customerEmail?: string; metadata?: Record<string, string>; callbackUrl: string;
}) {
  const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
  return {
    success: true,
    data: {
      barcode: { type: 'CODE128', value: `MOCK-${opts.orderId}`, image_url: null },
      payment_slip_url: null,
      retail_locations_url: null,
      expiration_date: expiry.toISOString(),
    },
  };
}

async function cancelPayNearMeOrder(_orderId: string) {
  return { success: true };
}
// ---- end stubs ----

/**
 * Generate a unique reference ID for cash payments
 * Format: RF-XXXXXX (6 alphanumeric characters)
 */
function generateReferenceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
  let result = 'RF-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============= CREATE CASH PAYMENT =============

/**
 * Create a cash payment barcode for rent payment
 * Uses PayNearMe API when configured, falls back to mock barcode
 */
export async function createCashPayment(rentPaymentIds: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const tenantId = session.user.id;

    // Get tenant details
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    if (!tenant) {
      return { success: false, message: 'Tenant not found' };
    }

    // Get the rent payments
    const rentPayments = await prisma.rentPayment.findMany({
      where: {
        id: { in: rentPaymentIds },
        lease: { tenantId },
        status: { in: ['unpaid', 'overdue'] },
      },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    if (rentPayments.length === 0) {
      return { success: false, message: 'No valid rent payments found' };
    }

    // Calculate total amount
    const rentAmount = rentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = rentAmount + CASH_PAYMENT_FEE;

    // Get property from first payment
    const property = rentPayments[0].lease.unit.property;
    if (!property) {
      return { success: false, message: 'Property not found' };
    }

    // Check for existing pending cash payment for these rent payments
    const existingPayment = await prisma.cashPayment.findFirst({
      where: {
        tenantId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingPayment) {
      // Return existing barcode
      const barcodeData = JSON.parse(existingPayment.barcodeData);
      return {
        success: true,
        cashPayment: {
          id: existingPayment.id,
          referenceId: existingPayment.referenceId,
          amount: Number(existingPayment.amount),
          fee: Number(existingPayment.fee),
          totalAmount: Number(existingPayment.amount) + Number(existingPayment.fee),
          barcodeData,
          expiresAt: existingPayment.expiresAt.toISOString(),
          status: existingPayment.status,
          paymentSlipUrl: barcodeData.paymentSlipUrl || null,
          retailLocationsUrl: barcodeData.retailLocationsUrl || null,
        },
      };
    }

    // Generate unique reference ID
    let referenceId = generateReferenceId();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.cashPayment.findUnique({
        where: { referenceId },
      });
      if (!existing) break;
      referenceId = generateReferenceId();
      attempts++;
    }

    // Parse tenant name
    const nameParts = (tenant.name || 'Tenant User').split(' ');
    const firstName = nameParts[0] || 'Tenant';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    // Create PayNearMe order
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paynearmeResult = await createPayNearMeOrder({
      orderId: referenceId,
      amount: rentAmount,
      customerId: tenantId,
      customerFirstName: firstName,
      customerLastName: lastName,
      customerEmail: tenant.email || undefined,
      metadata: {
        propertyId: property.id,
        propertyName: property.name,
        rentPaymentIds: rentPaymentIds.join(','),
      },
      callbackUrl: `${baseUrl}/api/webhooks/paynearme`,
    });

    if (!paynearmeResult.success || !paynearmeResult.data) {
      return { success: false, message: (paynearmeResult as any).error || 'Failed to create cash payment' };
    }

    const pnmData = paynearmeResult.data;

    // Generate barcode data
    const barcodeData = JSON.stringify({
      format: pnmData.barcode.type,
      value: pnmData.barcode.value,
      imageUrl: pnmData.barcode.image_url,
      amount: totalAmount.toFixed(2),
      displayText: `Pay $${totalAmount.toFixed(2)} - Ref: ${referenceId}`,
      paymentSlipUrl: pnmData.payment_slip_url,
      retailLocationsUrl: pnmData.retail_locations_url,
    });

    // Create cash payment record
    const cashPayment = await prisma.cashPayment.create({
      data: {
        referenceId,
        paymentIntentId: rentPayments[0].id, // Link to first rent payment
        tenantId,
        propertyId: property.id,
        amount: rentAmount,
        fee: CASH_PAYMENT_FEE,
        status: 'pending',
        partnerId: isPayNearMeConfigured() ? 'paynearme' : 'mock',
        barcodeData,
        expiresAt: new Date(pnmData.expiration_date),
      },
    });

    revalidatePath('/user/profile/rent-receipts');

    return {
      success: true,
      cashPayment: {
        id: cashPayment.id,
        referenceId: cashPayment.referenceId,
        amount: rentAmount,
        fee: CASH_PAYMENT_FEE,
        totalAmount,
        barcodeData: JSON.parse(barcodeData),
        expiresAt: cashPayment.expiresAt.toISOString(),
        status: cashPayment.status,
        paymentSlipUrl: pnmData.payment_slip_url,
        retailLocationsUrl: pnmData.retail_locations_url,
      },
    };
  } catch (error) {
    console.error('Error creating cash payment:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= GET CASH PAYMENT STATUS =============

/**
 * Get the status of a cash payment
 */
export async function getCashPaymentStatus(referenceId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const cashPayment = await prisma.cashPayment.findUnique({
      where: { referenceId },
    });

    if (!cashPayment) {
      return { success: false, message: 'Cash payment not found' };
    }

    if (cashPayment.tenantId !== session.user.id) {
      return { success: false, message: 'Unauthorized' };
    }

    return {
      success: true,
      status: cashPayment.status,
      processedAt: cashPayment.processedAt?.toISOString() || null,
      confirmationNumber: cashPayment.confirmationNumber,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= GET PENDING CASH PAYMENTS =============

/**
 * Get all pending cash payments for the current tenant
 */
export async function getPendingCashPayments() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', payments: [] };
    }

    const payments = await prisma.cashPayment.findMany({
      where: {
        tenantId: session.user.id,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      payments: payments.map((p) => ({
        id: p.id,
        referenceId: p.referenceId,
        amount: Number(p.amount),
        fee: Number(p.fee),
        totalAmount: Number(p.amount) + Number(p.fee),
        barcodeData: JSON.parse(p.barcodeData),
        expiresAt: p.expiresAt.toISOString(),
        status: p.status,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), payments: [] };
  }
}

// ============= CANCEL CASH PAYMENT =============

/**
 * Cancel a pending cash payment
 */
export async function cancelCashPayment(cashPaymentId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const cashPayment = await prisma.cashPayment.findFirst({
      where: {
        id: cashPaymentId,
        tenantId: session.user.id,
        status: 'pending',
      },
    });

    if (!cashPayment) {
      return { success: false, message: 'Cash payment not found or already processed' };
    }

    // Cancel with PayNearMe if it was created there
    if (cashPayment.partnerId === 'paynearme') {
      const cancelResult = await cancelPayNearMeOrder(cashPayment.referenceId);
      if (!cancelResult.success) {
        console.warn('Failed to cancel cash order:', (cancelResult as any).error);
        // Continue anyway - we'll mark it as expired locally
      }
    }

    await prisma.cashPayment.update({
      where: { id: cashPaymentId },
      data: { status: 'expired' },
    });

    revalidatePath('/user/profile/rent-receipts');

    return { success: true, message: 'Cash payment cancelled' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= PROCESS CASH PAYMENT (WEBHOOK/ADMIN) =============

/**
 * Process a completed cash payment (called by webhook or admin)
 * This marks the rent payment as paid
 */
export async function processCashPayment(
  referenceId: string,
  confirmationNumber: string
) {
  try {
    const cashPayment = await prisma.cashPayment.findUnique({
      where: { referenceId },
      include: {
        tenant: true,
        property: true,
      },
    });

    if (!cashPayment) {
      return { success: false, message: 'Cash payment not found' };
    }

    if (cashPayment.status !== 'pending') {
      return { success: false, message: 'Cash payment already processed' };
    }

    // Update cash payment status
    await prisma.cashPayment.update({
      where: { id: cashPayment.id },
      data: {
        status: 'completed',
        confirmationNumber,
        processedAt: new Date(),
      },
    });

    // Mark the rent payment as paid
    await prisma.rentPayment.update({
      where: { id: cashPayment.paymentIntentId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'cash',
        metadata: {
          cashPaymentId: cashPayment.id,
          confirmationNumber,
          paidVia: 'retail_cash',
        },
      },
    });

    revalidatePath('/user/profile/rent-receipts');
    revalidatePath('/admin/dashboard/properties');

    return { success: true, message: 'Cash payment processed successfully' };
  } catch (error) {
    console.error('Error processing cash payment:', error);
    return { success: false, message: formatError(error) };
  }
}
