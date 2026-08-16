import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * Contractor Stripe Connect Onboarding
 * 
 * Creates an Express Connect account for contractors to receive payments.
 * This is required for the direct payment model where money goes
 * directly from platform to contractor's bank.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, message: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    // Find contractor profile for this user
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json(
        { success: false, message: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    let connectAccountId = contractor.stripeConnectAccountId || undefined;

    // Create Connect account if doesn't exist
    if (!connectAccountId) {
      // Use explicit `controller` properties (newer Connect API) instead
      // of the legacy `type: 'express'` shorthand. This makes our platform
      // own loss + fee responsibility on the account itself, which is
      // required to issue Express-style dashboard sessions on platforms
      // where the dashboard "loss liability" toggle isn't surfaced.
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: 'application' },
          fees: { payer: 'application' },
          stripe_dashboard: { type: 'express' },
          requirement_collection: 'stripe',
        },
        country: 'US',
        email: contractor.email || session.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '1520', // General contractors
          product_description: 'Contractor services for property management',
        },
        metadata: {
          contractorId: contractor.id,
          userId: session.user.id,
        },
      });

      connectAccountId = account.id;

      // Update contractor with Connect account ID
      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: {
          stripeConnectAccountId: connectAccountId,
          stripeOnboardingStatus: 'pending',
        },
      });
    }

    // Create account session for embedded onboarding
    const accountSession = await stripe.accountSessions.create({
      account: connectAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      accountId: connectAccountId,
      clientSecret: accountSession.client_secret,
      onboardingStatus: contractor.stripeOnboardingStatus || 'pending',
    });
  } catch (error: any) {
    console.error('Error creating contractor onboarding:', error);
    
    let message = 'Failed to start payment setup. Please try again.';
    if (error?.type === 'StripeInvalidRequestError') {
      message = error?.message || message;
    }
    
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

/**
 * POST - Create onboarding link (alternative to embedded)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { returnUrl, refreshUrl } = await req.json();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json(
        { success: false, message: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    let connectAccountId = contractor.stripeConnectAccountId;

    if (!connectAccountId) {
      // Same `controller`-based account creation as the GET path so the
      // platform owns loss + fee responsibility regardless of which
      // entry point is used.
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: 'application' },
          fees: { payer: 'application' },
          stripe_dashboard: { type: 'express' },
          requirement_collection: 'stripe',
        },
        country: 'US',
        email: contractor.email || session.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          contractorId: contractor.id,
        },
      });

      connectAccountId = account.id;

      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: {
          stripeConnectAccountId: connectAccountId,
          stripeOnboardingStatus: 'pending',
        },
      });
    }

    // Create account link for redirect-based onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: refreshUrl || `${process.env.NEXT_PUBLIC_APP_URL}/contractor/settings`,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/contractor/settings?onboarding=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
    });
  } catch (error: any) {
    console.error('Error creating contractor onboarding link:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}
