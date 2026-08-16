import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_FEES, calculateContractorPaymentFees } from '@/lib/config/platform-fees';

/**
 * Fund escrow for a work order (PM/Landlord/Homeowner action)
 * 
 * DIRECT PAYMENT MODEL:
 * - Payer pays: Job Amount + $1 Platform Fee
 * - Money held in escrow until work is completed
 * - On release: Contractor receives Job Amount - $1 Platform Fee
 * - Total platform revenue: $2 per transaction
 * 
 * NOTE: This creates a payment intent that charges the payer directly.
 * The funds go to YOUR platform account and are transferred to contractor on release.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId } = await req.json();

    if (!workOrderId) {
      return NextResponse.json({ error: 'Work order ID required' }, { status: 400 });
    }

    // Get work order with landlord info
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        landlord: {
          select: {
            id: true,
            ownerUserId: true,
            stripeCustomerId: true,
          },
        },
        contractor: {
          select: { 
            id: true, 
            name: true, 
            stripeConnectAccountId: true,
            isPaymentReady: true,
          },
        },
      },
    }) as any;

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Verify the user owns this landlord account
    if (workOrder.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check work order status
    if (!['assigned', 'in_progress'].includes(workOrder.status)) {
      return NextResponse.json({ 
        error: 'Work order must be assigned before funding escrow' 
      }, { status: 400 });
    }

    // Check escrow isn't already funded
    if (workOrder.escrowStatus === 'funded') {
      return NextResponse.json({ error: 'Escrow already funded' }, { status: 400 });
    }

    // Verify contractor can receive payments
    if (!workOrder.contractor?.stripeConnectAccountId || !workOrder.contractor?.isPaymentReady) {
      return NextResponse.json({ 
        error: 'Contractor has not set up their payment account. Please ask them to complete their payout setup.' 
      }, { status: 400 });
    }

    // Get agreed price
    const agreedPrice = workOrder.agreedPrice;
    if (!agreedPrice || Number(agreedPrice) <= 0) {
      return NextResponse.json({ error: 'Invalid agreed price' }, { status: 400 });
    }

    const jobAmount = Number(agreedPrice);
    const fees = calculateContractorPaymentFees(jobAmount);
    const totalAmountCents = Math.round(fees.payerTotal * 100);

    // Ensure landlord has a Stripe customer ID for payment
    if (!workOrder.landlord.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No payment method on file. Please add a payment method first.' 
      }, { status: 400 });
    }

    // Create payment intent
    // Money goes to YOUR platform account, then transferred to contractor on release
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: 'usd',
      customer: workOrder.landlord.stripeCustomerId,
      capture_method: 'automatic',
      // Platform fee is collected when we transfer to contractor (on release)
      // For now, full amount goes to platform account
      metadata: {
        type: 'contractor_escrow',
        workOrderId: workOrder.id,
        landlordId: workOrder.landlordId,
        contractorId: workOrder.contractorId || '',
        contractorConnectId: workOrder.contractor.stripeConnectAccountId,
        jobAmount: jobAmount.toString(),
        payerFee: fees.payerFee.toString(),
        contractorFee: fees.contractorFee.toString(),
        totalAmount: fees.payerTotal.toString(),
      },
      description: `Escrow for: ${workOrder.title} ($${jobAmount.toFixed(2)} + $${fees.payerFee.toFixed(2)} platform fee)`,
    });

    // Update work order with payment intent
    await (prisma.workOrder.update as any)({
      where: { id: workOrderId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        escrowAmount: jobAmount,
        escrowStatus: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      clientSecret: paymentIntent.client_secret,
      breakdown: {
        jobAmount,
        payerFee: fees.payerFee,
        payerTotal: fees.payerTotal,
        contractorFee: fees.contractorFee,
        contractorReceives: fees.contractorReceives,
      },
      message: `Pay $${fees.payerTotal.toFixed(2)} (Job: $${jobAmount.toFixed(2)} + $${fees.payerFee.toFixed(2)} platform fee). Contractor will receive $${fees.contractorReceives.toFixed(2)} after $${fees.contractorFee.toFixed(2)} fee.`,
    });
  } catch (error) {
    console.error('Error funding escrow:', error);
    return NextResponse.json({ error: 'Failed to fund escrow' }, { status: 500 });
  }
}

// GET - Preview escrow funding (show breakdown before payment)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workOrderId = searchParams.get('workOrderId');

    if (!workOrderId) {
      return NextResponse.json({ error: 'Work order ID required' }, { status: 400 });
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        id: true,
        title: true,
        agreedPrice: true,
        escrowStatus: true,
        contractor: {
          select: { 
            name: true,
            stripeConnectAccountId: true,
            isPaymentReady: true,
          },
        },
        landlord: {
          select: { ownerUserId: true },
        },
      },
    }) as any;

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    if (workOrder.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const jobAmount = Number(workOrder.agreedPrice) || 0;
    const fees = calculateContractorPaymentFees(jobAmount);

    return NextResponse.json({
      workOrderId: workOrder.id,
      title: workOrder.title,
      contractorName: workOrder.contractor?.name,
      escrowStatus: workOrder.escrowStatus || 'none',
      contractorPaymentReady: workOrder.contractor?.isPaymentReady || false,
      breakdown: {
        jobAmount,
        payerFee: fees.payerFee,
        payerTotal: fees.payerTotal,
        contractorFee: fees.contractorFee,
        contractorReceives: fees.contractorReceives,
        payerFeeLabel: 'Platform Fee (you pay)',
        contractorFeeLabel: 'Platform Fee (deducted from contractor)',
      },
    });
  } catch (error) {
    console.error('Error getting escrow preview:', error);
    return NextResponse.json({ error: 'Failed to get escrow preview' }, { status: 500 });
  }
}
