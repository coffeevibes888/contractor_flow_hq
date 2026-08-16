import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, bidId, amount, contractorId } = body;

    if (!jobId || !bidId || !amount || !contractorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the job and bid belong to the user
    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return NextResponse.json(
        { error: 'Homeowner profile not found' },
        { status: 404 }
      );
    }

    const workOrder = await prisma.homeownerWorkOrder.findFirst({
      where: {
        id: jobId,
        homeownerId: homeowner.id,
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const bid = await prisma.homeownerWorkOrderBid.findFirst({
      where: {
        id: bidId,
        workOrderId: jobId,
        status: 'accepted',
      },
    });

    if (!bid) {
      return NextResponse.json(
        { error: 'Bid not found or not accepted' },
        { status: 404 }
      );
    }

    // Calculate amounts
    const bidAmount = Math.round(Number(amount) * 100); // Convert to cents
    const platformFee = 100; // $1 flat platform fee (in cents)
    const totalAmount = bidAmount + platformFee;

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    let stripeCustomerId = user?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
          homeownerId: homeowner.id,
        },
      });

      stripeCustomerId = customer.id;

      // Save customer ID
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        jobId,
        bidId,
        contractorId,
        homeownerId: homeowner.id,
        userId: session.user.id,
        bidAmount: bidAmount.toString(),
        platformFee: platformFee.toString(),
      },
      description: `Payment for job: ${workOrder.title}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // TODO: Store payment intent in database for tracking

    // Send notification to contractor
    try {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorId },
        include: { user: true },
      });

      if (contractor?.user) {
        await MarketplaceNotifications.notifyPaymentReceived({
          contractorId: contractor.user.id,
          jobId,
          jobTitle: workOrder.title,
          amount: Number(amount),
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
