import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

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
        { success: false, message: 'Payout verification is not configured on the server.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const landlordResult = await getOrCreateCurrentLandlord();

    if (!landlordResult.success) {
      return NextResponse.json(
        { success: false, message: landlordResult.message || 'Unable to determine landlord.' },
        { status: 400 }
      );
    }

    const landlord = landlordResult.landlord;

    const componentParam = req.nextUrl.searchParams.get('component');
    const component: 'account_onboarding' | 'payouts' =
      componentParam === 'payouts' ? 'payouts' : 'account_onboarding';

    let connectAccountId = landlord.stripeConnectAccountId || undefined;

    if (connectAccountId) {
      try {
        const existing = await stripe.accounts.retrieve(connectAccountId);
        const hasCardPayments =
          existing.capabilities?.card_payments === 'active' ||
          existing.capabilities?.card_payments === 'pending';
        if (!hasCardPayments) {
          try {
            await stripe.accounts.update(connectAccountId, {
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
            });
          } catch (updateError: any) {
            connectAccountId = undefined;
            await prisma.landlord.update({
              where: { id: landlord.id },
              data: { stripeConnectAccountId: null, stripeOnboardingStatus: 'not_started' },
            });
          }
        }
      } catch (retrieveError: any) {
        if (retrieveError?.code === 'account_invalid') {
          connectAccountId = undefined;
          await prisma.landlord.update({
            where: { id: landlord.id },
            data: { stripeConnectAccountId: null, stripeOnboardingStatus: 'not_started' },
          });
        } else {
          throw retrieveError;
        }
      }
    }

    if (!connectAccountId) {
      // Newer Connect APIs prefer explicit `controller` properties over
      // the legacy `type: 'express' | 'standard' | 'custom'` shorthand.
      // Setting these explicitly bypasses the platform-level "loss
      // liability" dashboard toggle (which Stripe has removed from many
      // dashboards) and tells Stripe directly:
      //
      //   - losses.payments = 'application'  → our platform owns negative
      //     balances and dispute losses on this account. Required on
      //     Express-equivalent accounts so Stripe will issue an
      //     Express-style dashboard session.
      //   - fees.payer = 'application'       → our platform pays Stripe
      //     processing fees and collects from the connected account via
      //     application fees. Stripe requires fees + losses to match.
      //   - stripe_dashboard.type = 'express' → keeps the same lightweight
      //     hosted dashboard the old `type: 'express'` gave us.
      //   - requirement_collection = 'stripe' → Stripe handles KYC just
      //     like before.
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: 'application' },
          fees: { payer: 'application' },
          stripe_dashboard: { type: 'express' },
          requirement_collection: 'stripe',
        },
        country: 'US',
        email: session.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Property management software with rent collection and payouts',
        },
        metadata: {
          landlordId: landlord.id,
        },
      });

      connectAccountId = account.id;

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          stripeConnectAccountId: connectAccountId,
          stripeOnboardingStatus: 'pending',
        },
      });
    }

    const accountSession = await stripe.accountSessions.create({
      account: connectAccountId,
      components:
        component === 'payouts'
          ? {
              payouts: {
                enabled: true,
                features: {
                  external_account_collection: true,
                  edit_payout_schedule: true,
                  instant_payouts: true,
                  standard_payouts: true,
                },
              },
            }
          : {
              account_onboarding: {
                enabled: true,
                features: {
                  external_account_collection: true,
                },
              },
            },
    });

    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        stripeOnboardingStatus: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      accountId: connectAccountId,
      onboardingStatus: landlord.stripeOnboardingStatus || 'pending',
      component,
      clientSecret: accountSession.client_secret,
    });
  } catch (error: any) {
    console.error('Error creating payout onboarding link:', error);
    
    // Provide more specific error messages
    let message = 'Failed to start verification. Please try again.';
    
    if (error?.type === 'StripeInvalidRequestError') {
      message = error?.message || message;
      
      // If the account is invalid, it might be a test account with live keys
      if (error?.code === 'account_invalid') {
        message = 'Your payout account needs to be reconnected. Please try again.';
      }
    }
    
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
