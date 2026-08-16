import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { calculateContractorPaymentFees } from '@/lib/config/platform-fees';

/**
 * Release escrow to contractor (PM/Landlord action after job completion)
 * 
 * DIRECT PAYMENT MODEL:
 * - Escrow was funded with: Job Amount + $1 (payer fee)
 * - Contractor receives: Job Amount - $1 (contractor fee)
 * - Platform keeps: $2 total ($1 from each side)
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

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        landlord: { select: { id: true, ownerUserId: true } },
        contractor: {
          select: { 
            id: true, name: true, email: true,
            stripeConnectAccountId: true, isPaymentReady: true,
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    if (workOrder.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (workOrder.status !== 'completed') {
      return NextResponse.json({ error: 'Work must be completed first' }, { status: 400 });
    }

    if (workOrder.escrowStatus !== 'funded') {
      return NextResponse.json({ error: 'Escrow must be funded' }, { status: 400 });
    }

    if (!workOrder.contractor?.stripeConnectAccountId) {
      return NextResponse.json({ error: 'Contractor payment not set up' }, { status: 400 });
    }

    const escrowAmount = Number(workOrder.escrowAmount);
    const fees = calculateContractorPaymentFees(escrowAmount);
    const contractorReceivesCents = Math.round(fees.contractorReceives * 100);

    if (fees.contractorReceives <= 0) {
      return NextResponse.json({ error: 'Amount too small' }, { status: 400 });
    }

    const transfer = await stripe.transfers.create({
      amount: contractorReceivesCents,
      currency: 'usd',
      destination: workOrder.contractor.stripeConnectAccountId,
      metadata: {
        type: 'contractor_payout',
        workOrderId: workOrder.id,
        contractorId: workOrder.contractor.id,
      },
    });

    await prisma.$transaction([
      prisma.contractorPayment.create({
        data: {
          landlordId: workOrder.landlordId,
          contractorId: workOrder.contractor.id,
          workOrderId: workOrder.id,
          amount: escrowAmount,
          platformFee: fees.contractorFee,
          netAmount: fees.contractorReceives,
          status: 'completed',
          stripeTransferId: transfer.id,
          paidAt: new Date(),
        },
      }),
      prisma.workOrder.update({
        where: { id: workOrderId },
        data: { status: 'paid', escrowStatus: 'released', escrowReleasedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      breakdown: { jobAmount: escrowAmount, contractorFee: fees.contractorFee, contractorReceives: fees.contractorReceives },
      message: `$${fees.contractorReceives.toFixed(2)} sent to ${workOrder.contractor.name}`,
    });
  } catch (error) {
    console.error('Error releasing escrow:', error);
    return NextResponse.json({ error: 'Failed to release escrow' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrderId = new URL(req.url).searchParams.get('workOrderId');
    if (!workOrderId) {
      return NextResponse.json({ error: 'Work order ID required' }, { status: 400 });
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        id: true, title: true, escrowAmount: true, escrowStatus: true, status: true,
        contractor: { select: { name: true, isPaymentReady: true } },
        landlord: { select: { ownerUserId: true } },
      },
    });

    if (!workOrder || workOrder.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const fees = calculateContractorPaymentFees(Number(workOrder.escrowAmount) || 0);

    return NextResponse.json({
      workOrderId: workOrder.id,
      title: workOrder.title,
      contractorName: workOrder.contractor?.name,
      breakdown: { jobAmount: Number(workOrder.escrowAmount), contractorFee: fees.contractorFee, contractorReceives: fees.contractorReceives },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
