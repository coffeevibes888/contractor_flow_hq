import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;

/**
 * Stripe client.
 * Instantiation is deferred until the key is present so that importing this
 * module during `next build` (where env vars may be absent) does not throw
 * "Neither apiKey nor config.authenticator provided".
 */
export const stripe: Stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia', typescript: true })
  : (new Proxy({} as Stripe, {
      get(_target, prop) {
        throw new Error(
          `Stripe is not configured. Set STRIPE_SECRET_KEY in your environment before calling stripe.${String(prop)}()`
        );
      },
    }) as unknown as Stripe);
