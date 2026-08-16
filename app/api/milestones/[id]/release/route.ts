import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { StripeEscrowService } from '@/lib/services/stripe-escrow';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const milestoneId = params.id;

    // Get the milestone with all relations
    const milestone = await prisma.jobMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        escrow: {
          include: {
            contractorJob: {
              include: {
                contractor: {
                  select: {
                    id: true,
                    businessName: true,
                    userId: true,
                    // TODO: Add stripeConnectAccountId field to ContractorProfile schema
                    // stripeAccountId: true
                  }
                },
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    // TODO: Add stripeCustomerId field to ContractorCustomer schema if needed
                    // stripeCustomerId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Verify customer owns this job
    if (milestone.escrow.contractorJob.customerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if milestone is pending approval
    if (milestone.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Milestone must be pending approval to release payment' },
        { status: 400 }
      );
    }

    // Check if escrow is funded
    if (milestone.escrow.status !== 'funded') {
      return NextResponse.json(
        { error: 'Escrow must be funded before releasing payment' },
        { status: 400 }
      );
    }

    // Verify contractor has Stripe account
    // TODO: Add stripeConnectAccountId field to ContractorProfile schema
    // For now, return an error indicating setup is needed
    return NextResponse.json(
      { error: 'Payment release not yet configured. Stripe Connect account field needs to be added to ContractorProfile schema.' },
      { status: 501 } // Not Implemented
    );

    /* This code will work once stripeConnectAccountId is added to schema:
    
    if (!milestone.escrow.contractorJob.contractor.stripeAccountId) {
      return NextResponse.json(
        { error: 'Contractor has not completed payment setup' },
        { status: 400 }
      );
    }

    // Verify customer has Stripe customer ID
    if (!milestone.escrow.contractorJob.customer.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Customer payment method not found' },
        { status: 400 }
      );
    }

    // Get customer's default payment method
    const customer = await StripeEscrowService.getCustomer(
      milestone.escrow.contractorJob.customer.stripeCustomerId
    );

    if (!customer.invoice_settings?.default_payment_method) {
      return NextResponse.json(
        { error: 'No payment method on file' },
        { status: 400 }
      );
    }

    // Release payment via Stripe
    const result = await StripeEscrowService.releaseMilestonePayment(
      milestoneId,
      milestone.escrow.stripePaymentId!,
      milestone.escrow.contractorJob.contractor.stripeAccountId,
      milestone.escrow.contractorJob.customer.stripeCustomerId,
      customer.invoice_settings.default_payment_method as string
    );

    // Send notifications
    try {
      // Notify contractor
      await prisma.notification.create({
        data: {
          userId: milestone.escrow.contractorJob.contractor.userId,
          type: 'payment_released',
          title: 'Payment Released',
          message: `Payment of $${result.contractorAmount.toFixed(2)} has been released for milestone "${milestone.title}".`,
          actionUrl: `/contractor/jobs/${milestone.escrow.contractorJobId}`
        }
      });

      // Notify customer
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'payment_released',
          title: 'Payment Sent',
          message: `Payment of $${result.contractorAmount.toFixed(2)} has been sent to ${milestone.escrow.contractorJob.contractor.businessName} for milestone "${milestone.title}".`,
          actionUrl: `/customer/jobs/${milestone.escrow.contractorJobId}`
        }
      });
    } catch (error) {
      console.error('Failed to send notifications:', error);
    }

    return NextResponse.json({
      success: true,
      milestone: {
        id: milestone.id,
        status: 'completed',
        releasedAt: new Date()
      },
      payment: {
        contractorAmount: result.contractorAmount,
        platformFee: result.platformFee,
        transferId: result.transfer.id
      }
    });
    */
  } catch (error) {
    console.error('Error releasing payment:', error);
    return NextResponse.json(
      { 
        error: 'Failed to release payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
