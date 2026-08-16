import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { SUBSCRIPTION_TIERS, SubscriptionTier, BillingInterval } from '@/lib/config/subscription-tiers';
import { SERVER_URL } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetTier = body.tier as SubscriptionTier;
    const billingInterval: BillingInterval = body.billingInterval === 'yearly' ? 'yearly' : 'monthly';

    if (!targetTier || !SUBSCRIPTION_TIERS[targetTier]) {
      return NextResponse.json({ success: false, message: 'Invalid subscription tier' }, { status: 400 });
    }

    const tierConfig = SUBSCRIPTION_TIERS[targetTier];

    const tierToPriceEnvVar: Record<SubscriptionTier, Record<BillingInterval, string>> = {
      starter: { monthly: 'STRIPE_PRICE_CONTRACTOR_STARTER', yearly: 'STRIPE_PRICE_CONTRACTOR_STARTER_YEARLY' },
      pro: { monthly: 'STRIPE_PRICE_CONTRACTOR_PRO', yearly: 'STRIPE_PRICE_CONTRACTOR_PRO_YEARLY' },
      enterprise: { monthly: 'STRIPE_PRICE_CONTRACTOR_ENTERPRISE', yearly: 'STRIPE_PRICE_CONTRACTOR_ENTERPRISE_YEARLY' },
    };
    const expectedPriceEnvVar = tierToPriceEnvVar[targetTier][billingInterval];

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, message: 'Stripe is not configured on the server.' },
        { status: 500 }
      );
    }

    // Look up contractor-specific price IDs, falling back to the shared PM price IDs
    const contractorPriceId =
      process.env[expectedPriceEnvVar] || (billingInterval === 'yearly' ? tierConfig.yearlyPriceId : tierConfig.priceId);

    if (!contractorPriceId) {
      if (targetTier === 'enterprise') {
        return NextResponse.json(
          { success: false, message: 'Enterprise tier requires custom pricing. Please contact us.', contactRequired: true },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          message: `This tier is not available for purchase. Stripe price is not configured (missing ${expectedPriceEnvVar}).`,
          missingEnvVar: expectedPriceEnvVar,
        },
        { status: 400 }
      );
    }

    // Ensure user role is set to contractor
    if (session.user.role !== 'contractor') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: 'contractor' },
      });
    }

    // Auto-create a minimal contractor profile if one doesn't exist yet
    // (happens when user signs up directly from the pricing page)
    const userName = session.user.name || session.user.email?.split('@')[0] || 'Contractor';
    const baseSlug = userName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${session.user.id.slice(0, 6)}`;

    const profile = await prisma.contractorProfile.upsert({
      where: { userId: session.user.id },
      update: {},
      create: {
        userId: session.user.id,
        slug,
        businessName: userName,
        displayName: userName,
        email: session.user.email || '',
      },
      select: { id: true, stripeCustomerId: true, businessName: true },
    });

    const stripe = new Stripe(stripeSecretKey);

    // Validate price exists in Stripe
    try {
      await stripe.prices.retrieve(contractorPriceId);
    } catch (error) {
      const stripeMessage =
        error && typeof error === 'object' && 'message' in error
          ? String((error as any).message)
          : 'Unknown Stripe error';
      return NextResponse.json(
        {
          success: false,
          message: `Stripe could not find the price for this tier. Check ${expectedPriceEnvVar}.`,
          details: stripeMessage,
        },
        { status: 500 }
      );
    }

    let customerId = profile.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: profile.businessName,
        metadata: { contractorProfileId: profile.id, userId: session.user.id },
      });
      customerId = customer.id;

      await prisma.contractorProfile.update({
        where: { id: profile.id },
        data: { stripeCustomerId: customerId },
      });
    }

    let baseUrl = SERVER_URL;
    try {
      baseUrl = new URL(SERVER_URL).origin;
    } catch { /* keep SERVER_URL as-is if it isn't a parseable URL */ }

    // Determine redirect URL based on user role
    let successRedirectUrl = `${baseUrl}/contractor-dashboard?subscription=success&tier=${targetTier}`;
    
    // If user has multiple roles, redirect to appropriate dashboard
    if (session.user.role === 'property_manager') {
      successRedirectUrl = `${baseUrl}/admin/overview?subscription=success&tier=${targetTier}`;
    } else if (session.user.role === 'landlord') {
      successRedirectUrl = `${baseUrl}/admin/overview?subscription=success&tier=${targetTier}`;
    }

    // Meta CAPI attribution data — forwarded into subscription metadata and
    // read by the Stripe webhook to fire a deduplicated server-side Purchase event.
    const metaFbc = req.cookies.get('_fbc')?.value || '';
    const metaFbp = req.cookies.get('_fbp')?.value || '';
    const metaIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '';
    const metaUa = req.headers.get('user-agent') || '';
    const metaEventId = `purchase_${profile.id}_${Date.now()}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_collection: 'always',
      line_items: [{ price: contractorPriceId, quantity: 1 }],
      success_url: successRedirectUrl,
      cancel_url: `${baseUrl}/onboarding/contractor/subscription?canceled=true`,
      metadata: {
        contractorProfileId: profile.id,
        tier: targetTier,
        billingInterval,
        role: 'contractor',
      },
      subscription_data: {
        // 14-day free trial. See landlord checkout for the rationale.
        trial_period_days: 14,
        trial_settings: {
          end_behavior: { missing_payment_method: 'cancel' },
        },
        metadata: {
          contractorProfileId: profile.id,
          tier: targetTier,
          billingInterval,
          role: 'contractor',
          // Meta CAPI attribution
          metaFbc,
          metaFbp,
          metaIp,
          metaUa,
          metaEventId,
          metaUserEmail: session.user.email || '',
          metaUserId: session.user.id,
        },
      },
    });

    return NextResponse.json({ success: true, checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error('Contractor subscription checkout error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
