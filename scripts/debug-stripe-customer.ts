/**
 * Debug script: list every Stripe customer for an email along with all of
 * their subscriptions and recent checkout sessions. Use this when a contractor
 * or landlord finished checkout in the browser but the dashboard still shows
 * the wrong tier.
 *
 * Usage:
 *   npx tsx scripts/debug-stripe-customer.ts user@email.com
 */

import 'dotenv/config';
import Stripe from 'stripe';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: npx tsx scripts/debug-stripe-customer.ts user@email.com');
    process.exit(1);
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY is not set');
    process.exit(1);
  }
  const mode = stripeSecretKey.startsWith('sk_live_') ? 'LIVE' : stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN';
  console.log(`🔎 Stripe ${mode} mode\n`);

  const stripe = new Stripe(stripeSecretKey);
  const customers = await stripe.customers.list({ email, limit: 100 });

  if (customers.data.length === 0) {
    console.log(`❌ No Stripe customers found with email ${email}`);
    process.exit(0);
  }

  console.log(`📇 Found ${customers.data.length} customer(s) for ${email}\n`);

  for (const customer of customers.data) {
    console.log('━'.repeat(70));
    console.log(`🆔 ${customer.id}`);
    console.log(`   created:   ${new Date(customer.created * 1000).toISOString()}`);
    console.log(`   name:      ${customer.name ?? '(none)'}`);
    console.log(`   metadata:  ${JSON.stringify(customer.metadata)}`);

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 20,
    });
    console.log(`   📦 ${subs.data.length} subscription(s)`);
    for (const s of subs.data) {
      console.log(`      • ${s.id}`);
      console.log(`          status:        ${s.status}`);
      console.log(`          created:       ${new Date(s.created * 1000).toISOString()}`);
      console.log(`          metadata.tier: ${s.metadata?.tier ?? '(none)'}`);
      console.log(`          metadata.role: ${s.metadata?.role ?? '(none)'}`);
      console.log(`          price:         ${s.items.data[0]?.price?.id ?? '(none)'}`);
      console.log(`          trial_end:     ${s.trial_end ? new Date(s.trial_end * 1000).toISOString() : '(none)'}`);
    }

    const sessions = await stripe.checkout.sessions.list({
      customer: customer.id,
      limit: 20,
    });
    console.log(`   🧾 ${sessions.data.length} checkout session(s)`);
    for (const s of sessions.data) {
      console.log(`      • ${s.id}`);
      console.log(`          status:           ${s.status}`);
      console.log(`          payment_status:   ${s.payment_status}`);
      console.log(`          mode:             ${s.mode}`);
      console.log(`          created:          ${new Date(s.created * 1000).toISOString()}`);
      console.log(`          subscription:     ${typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? '(none)'}`);
      console.log(`          metadata.tier:    ${s.metadata?.tier ?? '(none)'}`);
      console.log(`          metadata.role:    ${s.metadata?.role ?? '(none)'}`);
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
