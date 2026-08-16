/**
 * GET /api/landlord/payout-setup-status
 *
 * Lightweight endpoint that powers the "set up payouts before tenants pay
 * rent" reminder popup. Returns enough info for the client to decide
 * whether to show the modal without leaking other Stripe details.
 *
 * Response:
 *   {
 *     shouldRemind: boolean,        // True when the popup should appear
 *     hasProperties: boolean,       // True when ≥1 active property exists
 *     activePropertyCount: number,  // For copy ("you have 3 active properties")
 *     stripeStatus: 'not_started' | 'pending' | 'pending_verification' |
 *                   'action_required' | 'active',
 *     onboardUrl: string,           // Where to send the user to finish setup
 *   }
 *
 * The client persists dismissals in `localStorage` so we don't need a
 * schema migration for what is essentially a UI nudge. If the user clears
 * storage or signs in on another device, they'll see the reminder again,
 * which is fine for this category of message.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import Stripe from 'stripe';

type StripeStatus =
  | 'not_started'
  | 'pending'
  | 'pending_verification'
  | 'action_required'
  | 'active';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Anyone who isn't a landlord/PM should silently get a "no reminder"
    // response — this endpoint is mounted globally so role-mismatched users
    // (super admins, contractors, agents) just see nothing.
    const role = session.user.role;
    const allowedRoles = new Set(['landlord', 'admin', 'superAdmin', 'property_manager']);
    if (!role || !allowedRoles.has(role)) {
      return NextResponse.json({
        shouldRemind: false,
        hasProperties: false,
        activePropertyCount: 0,
        stripeStatus: 'not_started' satisfies StripeStatus,
        onboardUrl: '/admin/onboarding/payouts',
      });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({
        shouldRemind: false,
        hasProperties: false,
        activePropertyCount: 0,
        stripeStatus: 'not_started' satisfies StripeStatus,
        onboardUrl: '/admin/onboarding/payouts',
      });
    }

    const landlord = landlordResult.landlord;

    // ── Property count ────────────────────────────────────────────────────
    // The reminder is keyed off active properties — drafts and archived
    // ones don't count, since tenants only ever see active inventory.
    const activePropertyCount = await prisma.property.count({
      where: {
        landlordId: landlord.id,
        status: 'active',
      },
    });

    const hasProperties = activePropertyCount > 0;

    // ── Stripe Connect status ────────────────────────────────────────────
    // If the landlord has never started Connect onboarding we know the
    // answer without calling Stripe.
    let stripeStatus: StripeStatus = 'not_started';

    if (landlord.stripeConnectAccountId) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const account = await stripe.accounts.retrieve(landlord.stripeConnectAccountId);
        const isOnboarded = account.details_submitted || false;
        const canReceivePayouts = account.payouts_enabled || false;

        if (isOnboarded && canReceivePayouts) {
          stripeStatus = 'active';
        } else if (isOnboarded && !canReceivePayouts) {
          stripeStatus = 'pending_verification';
        } else if (account.requirements?.currently_due?.length) {
          stripeStatus = 'action_required';
        } else {
          stripeStatus = 'pending';
        }
      } catch (err) {
        // Stripe API failure shouldn't block the dashboard. Treat as
        // pending so the user still sees the nudge.
        console.error('payout-setup-status: stripe accounts.retrieve failed', err);
        stripeStatus = 'pending';
      }
    }

    // Reminder fires only when the landlord has activated property AND
    // Stripe is not in the `active` state. This is the exact gap the user
    // asked about: tenants try to pay and can't.
    const shouldRemind = hasProperties && stripeStatus !== 'active';

    return NextResponse.json({
      shouldRemind,
      hasProperties,
      activePropertyCount,
      stripeStatus,
      onboardUrl: '/admin/onboarding/payouts',
    });
  } catch (err) {
    console.error('payout-setup-status:', err);
    // Never crash the dashboard — return a "no reminder" response so the
    // popup component just no-ops on error.
    return NextResponse.json({
      shouldRemind: false,
      hasProperties: false,
      activePropertyCount: 0,
      stripeStatus: 'not_started' satisfies StripeStatus,
      onboardUrl: '/admin/onboarding/payouts',
    });
  }
}
