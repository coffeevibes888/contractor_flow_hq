import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import Stripe from 'stripe';

/**
 * Debug endpoint to check Stripe Connect configuration
 */
export async function GET() {
  try {
    const session = await auth();
    
    const debug = {
      timestamp: new Date().toISOString(),
      auth: {
        isAuthenticated: !!session?.user?.id,
        userId: session?.user?.id,
        role: session?.user?.role,
      },
      env: {
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
        hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
      contractor: null as any,
      stripeAccount: null as any,
    };

    if (!session?.user?.id) {
      return NextResponse.json(debug);
    }

    // Find contractor
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        email: true,
        businessName: true,
        stripeConnectAccountId: true,
        stripeOnboardingStatus: true,
        isPaymentReady: true,
      },
    });

    debug.contractor = contractor;

    // Check Stripe account if exists
    if (contractor?.stripeConnectAccountId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const account = await stripe.accounts.retrieve(contractor.stripeConnectAccountId);
        
        debug.stripeAccount = {
          id: account.id,
          type: account.type,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          capabilities: account.capabilities,
        };
      } catch (error: any) {
        debug.stripeAccount = {
          error: error.message,
          code: error.code,
        };
      }
    }

    return NextResponse.json(debug, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
