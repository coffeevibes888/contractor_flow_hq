/* eslint-disable no-console */
/**
 * One-shot welcome treatment for the first real paying customer.
 *
 * What it does:
 *   1. Un-quarantines the landlord account (back to `trialing` status) so the
 *      user can pass the subscription gate AFTER verifying their email.
 *   2. Extends the trial window to 30 days from today.
 *   3. Creates/finds a Stripe customer and attaches a personal coupon
 *      (50% off for 3 months) that auto-applies at checkout.
 *   4. Tags the landlord's `trialRemindersSent` metadata with
 *      `firstRealCustomer: true` so future dashboard work can recognise them.
 *   5. Sends a warm welcome email with the verification link, the coupon
 *      code, and a direct "add your card" call to action.
 *   6. Drops an in-app Notification so the banner fires on next login.
 *
 * Run:
 *   npx tsx --env-file=.env scripts/welcome-first-customer.ts            # dry run
 *   npx tsx --env-file=.env scripts/welcome-first-customer.ts --apply    # for real
 */

import { prisma } from '../db/prisma';
import { stripe } from '../lib/stripe';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { randomBytes } from 'crypto';
import FirstCustomerWelcomeEmail from '../email/templates/first-customer-welcome';

const APPLY = process.argv.includes('--apply');
const TARGET_EMAIL = 'allenyoung37@yahoo.com';

const COUPON_PERCENT_OFF = 50;
const COUPON_DURATION_MONTHS = 3;
const EXTENDED_TRIAL_DAYS = 30;

async function main() {
  console.log(
    `\n${APPLY ? '🚀 APPLY MODE' : '👀 DRY RUN'} — target: ${TARGET_EMAIL}\n`
  );

  const user = await prisma.user.findFirst({
    where: { email: { equals: TARGET_EMAIL, mode: 'insensitive' } },
  });

  if (!user) {
    console.error(`User not found: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: user.id },
  });

  if (!landlord) {
    console.error(`No Landlord row for user ${user.email}`);
    process.exit(1);
  }

  console.log(`User: ${user.email} (${user.id})`);
  console.log(
    `Landlord: ${landlord.subdomain} (${landlord.id}) — trialStatus=${landlord.trialStatus}`
  );

  // ── 1 & 2. Un-quarantine + extend trial ─────────────────────────────────
  const newTrialEnd = new Date();
  newTrialEnd.setDate(newTrialEnd.getDate() + EXTENDED_TRIAL_DAYS);

  const existingMeta =
    (landlord.trialRemindersSent as Record<string, unknown> | null) ?? {};
  const updatedMeta = {
    ...existingMeta,
    firstRealCustomer: true,
    welcomeExtendedAt: new Date().toISOString(),
    welcomeExtendedTo: newTrialEnd.toISOString(),
    welcomeCouponPercent: COUPON_PERCENT_OFF,
    welcomeCouponMonths: COUPON_DURATION_MONTHS,
  };

  console.log(`\nPlanned landlord updates:`);
  console.log(`  trialStatus       → trialing`);
  console.log(`  subscriptionStatus → trialing`);
  console.log(`  trialEndDate      → ${newTrialEnd.toISOString()}`);
  console.log(`  metadata patch    → ${JSON.stringify(updatedMeta)}`);

  // ── 3. Stripe customer + coupon ─────────────────────────────────────────
  // We create a Stripe customer (if there isn't one yet) so the coupon lands
  // on *their* customer record — not as a loose promo code anyone could use.
  const couponId = `welcome-allen-${Date.now().toString(36)}`;
  const promoCode = `WELCOME${COUPON_PERCENT_OFF}${randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;

  console.log(`\nPlanned Stripe work:`);
  console.log(`  Ensure customer for ${user.email}`);
  console.log(
    `  Create coupon ${couponId}: ${COUPON_PERCENT_OFF}% off for ${COUPON_DURATION_MONTHS} months`
  );
  console.log(
    `  Create promotion code ${promoCode} (restricted to this customer)`
  );

  // ── 4. Welcome email ─────────────────────────────────────────────────────
  const appUrl =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.SERVER_URL ||
    'https://www.propertyflowhq.com';

  const verificationUrl = `${appUrl}/resend-verification?email=${encodeURIComponent(
    user.email
  )}`;
  const billingUrl = `${appUrl}/onboarding/landlord/subscription?promo=${encodeURIComponent(
    promoCode
  )}`;

  console.log(`\nPlanned email:`);
  console.log(`  from: ${process.env.SENDER_EMAIL ?? 'noreply@propertyflowhq.com'}`);
  console.log(`  to:   ${user.email}`);
  console.log(`  verification URL: ${verificationUrl}`);
  console.log(`  billing URL:      ${billingUrl}`);

  if (!APPLY) {
    console.log(`\nDRY RUN — re-run with --apply to execute.\n`);
    return;
  }

  // ── Apply ────────────────────────────────────────────────────────────────
  await prisma.landlord.update({
    where: { id: landlord.id },
    data: {
      trialStatus: 'trialing',
      subscriptionStatus: 'trialing',
      trialStartDate: landlord.trialStartDate ?? new Date(),
      trialEndDate: newTrialEnd,
      trialRemindersSent: updatedMeta,
    },
  });

  // Stripe customer
  let customerId = landlord.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: {
        landlordId: landlord.id,
        userId: user.id,
        firstRealCustomer: 'true',
      },
    });
    customerId = customer.id;
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { stripeCustomerId: customerId },
    });
    console.log(`  ✓ Stripe customer created: ${customerId}`);
  } else {
    console.log(`  ✓ Stripe customer already existed: ${customerId}`);
  }

  // Coupon: percent off, repeating for N months
  const coupon = await stripe.coupons.create({
    id: couponId,
    percent_off: COUPON_PERCENT_OFF,
    duration: 'repeating',
    duration_in_months: COUPON_DURATION_MONTHS,
    name: `First Customer ${COUPON_PERCENT_OFF}% Off`,
    metadata: { landlordId: landlord.id, reason: 'first_real_customer' },
  });
  console.log(`  ✓ Coupon created: ${coupon.id}`);

  // Promotion code restricted to this customer, single-use, expires in 60d.
  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: promoCode,
    customer: customerId,
    max_redemptions: 1,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 60,
    metadata: { landlordId: landlord.id },
  });
  console.log(`  ✓ Promotion code created: ${promo.code}`);

  // Send welcome email
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn(
      '  ⚠️  RESEND_API_KEY not set — skipping welcome email. Customer still set up in DB + Stripe.'
    );
  } else {
    const resend = new Resend(resendKey);
    const senderEmail =
      process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';

    const html = await render(
      FirstCustomerWelcomeEmail({
        recipientName: user.name ?? 'there',
        verificationUrl,
        billingUrl,
        couponCode: promoCode,
        couponPercentOff: COUPON_PERCENT_OFF,
        couponDurationMonths: COUPON_DURATION_MONTHS,
        trialEndsAt: newTrialEnd.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      })
    );

    const emailRes = await resend.emails.send({
      from: `Property Flow HQ <${senderEmail}>`,
      to: user.email,
      replyTo: process.env.ADMIN_NOTIFICATION_EMAIL || senderEmail,
      subject: "You're our first real customer — here's a little welcome",
      html,
    });

    if (emailRes.error) {
      console.error('  ❌ Email send failed:', emailRes.error);
    } else {
      console.log(`  ✓ Email sent: ${emailRes.data?.id}`);
    }
  }

  // In-app notification (fires on next login)
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'system',
      title: 'Welcome — we owe you one',
      message: `Your trial is now 30 days, and your personal coupon ${promoCode} (${COUPON_PERCENT_OFF}% off for ${COUPON_DURATION_MONTHS} months) is waiting on checkout. Verify your email to get started.`,
      actionUrl: billingUrl,
      metadata: {
        kind: 'first_customer_welcome',
        promoCode,
        couponPercentOff: COUPON_PERCENT_OFF,
        couponDurationMonths: COUPON_DURATION_MONTHS,
      },
    },
  });
  console.log(`  ✓ In-app notification queued`);

  console.log('\n✅ All done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
