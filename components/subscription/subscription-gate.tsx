import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { headers } from 'next/headers';

interface SubscriptionGateProps {
  role: 'landlord' | 'contractor' | 'agent';
  redirectTo?: string;
}

/**
 * Server component that checks if user has an active subscription
 * Redirects to subscription page if not subscribed.
 *
 * Tenants (user role) and homeowners do NOT require subscriptions.
 *
 * Trial flow (re-enabled): a Stripe Checkout with `trial_period_days: 14`
 * fires `customer.subscription.created` with `status: 'trialing'`. The
 * webhook copies that into `subscriptionStatus = 'trialing'`,
 * `trialStatus = 'trialing'`, and sets `trialStartDate` / `trialEndDate`
 * from `subscription.trial_start` / `subscription.trial_end`. While
 * `trialing` and the end date is in the future, this gate lets the user
 * into the dashboard. After the trial ends Stripe transitions the
 * subscription to `active` (or `past_due` / `canceled`) and the same
 * `hasActiveSubscription` branch covers continued access.
 *
 * Usage: Add to layout.tsx before rendering dashboard content
 */
export async function SubscriptionGate({ role, redirectTo }: SubscriptionGateProps) {
  const session = await auth();

  // If not logged in, redirect to sign-in
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Check if user has the correct role
  // Allow contractor employees (role='contractor_employee') to access contractor routes
  // For landlord routes, treat `property_manager` as equivalent since they share
  // the same dashboard and the role picker's "Property Manager" button sets
  // role='landlord' today but this future-proofs the gate.
  const allowedRoles = role === 'contractor'
    ? [role, 'contractor_employee', 'admin', 'superAdmin']
    : role === 'landlord'
      ? [role, 'property_manager', 'admin', 'superAdmin']
      : [role, 'admin', 'superAdmin'];

  let effectiveRole: string | undefined = session.user.role;

  if (!allowedRoles.includes(effectiveRole)) {
    // Fallback: the JWT/session role can lag behind the database right after
    // onboarding (e.g., user picked "Property Manager", DB is updated to
    // 'landlord', but this request's session still shows 'user'). Re-read
    // directly from the DB before giving up so we don't strand a legitimately
    // converted user on /unauthorized.
    const freshUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    effectiveRole = freshUser?.role;

    if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
      // Users whose role is still the signup default ('user') haven't finished
      // the role picker — send them there instead of /unauthorized so they
      // can recover without contacting support.
      if (effectiveRole === 'user' || !effectiveRole) {
        redirect('/onboarding');
      }
      redirect('/unauthorized');
    }
  }

  // NOTE: We deliberately do NOT use the Referer header to grant access.
  // `Referer: https://checkout.stripe.com/` is trivially spoofed by any HTTP
  // client and was previously used as a free pass to bypass the subscription
  // gate. Instead, when the user returns from a real Stripe Checkout the
  // admin layout syncs the subscription from Stripe before this gate runs,
  // so the DB will already have a stripeSubscriptionId or stripeCustomerId.
  // Those DB-backed checks below are the only source of truth.
  const headersList = await headers();
  // Use the full URL (path + query string) so params like ?lc= are preserved
  // when we bounce the user to /verify-email/required?next=...
  // x-url is set by middleware; fall back to x-pathname for old requests.
  const currentPath = headersList.get('x-url') || headersList.get('x-pathname') || headersList.get('x-invoke-path') || '';
  // pathOnly is still needed for the billing prefix check (no query string involved there)
  const pathOnly = headersList.get('x-pathname') || '';

  // Never gate the billing/paywall page itself — it is the destination for
  // expired-trial users and blocking it causes an infinite redirect loop.
  if (pathOnly.startsWith('/admin/billing')) {
    return null;
  }

  // Email verification status — required AFTER a card is on file (post-Stripe).
  // We don't block the path INTO Stripe checkout because that would prevent
  // anyone from paying, but once they have a customer/subscription on Stripe
  // we require the verified inbox to access dashboard data.
  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, email: true },
  });
  const isEmailVerified = !!userRow?.emailVerified;
  const userEmail = userRow?.email ?? session.user.email ?? '';

  // Helper that bounces unverified users to the verify-email gate page.
  // Audit-logs the event so we can spot abuse (someone repeatedly clicking
  // through to the dashboard with an unverified email is a fraud signal).
  const sendToVerifyGate = async (next: string) => {
    try {
      const { logAuthEvent } = await import('@/lib/security/audit-logger');
      const { requestContextFromHeaders } = await import('@/lib/security/request-context');
      const ctx = await requestContextFromHeaders();
      await logAuthEvent('TRIAL_ACCESS_BLOCKED', {
        userId: session.user.id,
        email: userEmail || undefined,
        success: false,
        failureReason: 'email_not_verified',
        ipAddress: ctx.ipAddress ?? undefined,
        userAgent: ctx.userAgent ?? undefined,
      });
    } catch {
      // never block on instrumentation failure
    }
    redirect(`/verify-email/required?next=${encodeURIComponent(next)}`);
  };

  // Role-specific subscription checks
  if (role === 'landlord') {
    // SuperAdmins have no Landlord profile but can access all /admin/* routes.
    if (effectiveRole === 'superAdmin' || effectiveRole === 'admin') {
      return null;
    }

    // Owner lookup first. If the signed-in user owns the landlord account
    // we'll check that record's subscription. Otherwise (team members
    // invited via /team/invite), find the landlord they belong to via
    // TeamMember and check that account's subscription. Same gate, just
    // resolved through the right path so invitees aren't redirected to
    // /onboarding.
    let landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
      select: {
        id: true,
        trialStatus: true,
        trialStartDate: true,
        trialEndDate: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        subscription: {
          select: {
            status: true,
            stripeSubscriptionId: true,
          },
        },
      },
    });

    if (!landlord) {
      // Team-member fallback: find their active TeamMember row, then load
      // the parent landlord. Status filter prevents removed/inactive
      // members from sneaking back in.
      const db = prisma as any;
      const teamMember = await db.teamMember?.findFirst({
        where: { userId: session.user.id, status: 'active' },
        select: { landlordId: true },
      });

      if (teamMember?.landlordId) {
        landlord = await prisma.landlord.findUnique({
          where: { id: teamMember.landlordId },
          select: {
            id: true,
            trialStatus: true,
            trialStartDate: true,
            trialEndDate: true,
            stripeSubscriptionId: true,
            stripeCustomerId: true,
            subscriptionStatus: true,
            subscription: {
              select: {
                status: true,
                stripeSubscriptionId: true,
              },
            },
          },
        });
      }
    }

    if (landlord) {
      const now = new Date();
      const trialEnded = landlord.trialEndDate && landlord.trialEndDate < now;

      // Check if they have active subscription
      const hasActiveSubscription = 
        landlord.stripeSubscriptionId ||
        landlord.subscription?.stripeSubscriptionId ||
        landlord.subscriptionStatus === 'active' ||
        landlord.subscription?.status === 'active';

      // A trial is considered valid when:
      //   1. trialStatus === 'trialing'
      //   2. trialEndDate is set and in the future
      //   3. trialStartDate is set (proves the user actively started a trial)
      // Email verification is no longer a hard gate here — it's nudged from
      // settings post-signup so we don't strand new users mid-funnel. The
      // real abuse protection is that trial creation requires going through
      // the role picker (signed-in, conscious selection) and access to
      // anything that sends mail / moves money is gated separately.
      const trialIsLegitimate =
        landlord.trialStatus === 'trialing' &&
        landlord.trialEndDate !== null &&
        landlord.trialStartDate !== null &&
        !trialEnded;

      // Check if subscription is incomplete but a real Stripe Checkout was
      // actually attempted. We require ALL THREE:
      //   - subscriptionStatus === 'incomplete'
      //   - a stripeCustomerId  (created during checkout session setup)
      //   - a stripeSubscriptionId  (only set once Stripe confirms checkout)
      // All three together prove a real card-entry attempt is in flight.
      // stripeSubscriptionId alone is sufficient since the admin layout syncs
      // from Stripe before this gate runs, so by the time we get here the DB
      // reflects the real Stripe state.
      const isIncompleteButProcessing =
        landlord.subscriptionStatus === 'incomplete' &&
        !!landlord.stripeCustomerId &&
        !!landlord.stripeSubscriptionId;

      // Allow access based only on DB-backed facts — no HTTP headers.
      // Removed `isFromStripeCheckout` (Referer header) — trivially spoofed.
      const allowAccess =
        hasActiveSubscription ||
        trialIsLegitimate ||
        isIncompleteButProcessing;

      // If suspended, redirect to billing page
      if (landlord.trialStatus === 'suspended' && !hasActiveSubscription) {
        redirect(redirectTo || '/admin/billing?reason=suspended');
      }

      // If trial expired and no subscription, update status to trial_expired
      if (trialEnded && !hasActiveSubscription && landlord.trialStatus === 'trialing') {
        await prisma.landlord.update({
          where: { id: landlord.id },
          data: { trialStatus: 'trial_expired' },
        });
      }

      if (!allowAccess) {
        // Trial expired or no trial started — send to billing page (card wall lives here now)
        redirect(redirectTo || '/admin/billing?reason=trial_ended');
      }

      // Require email verification before accessing the dashboard — applies
      // to both free-trial and paid users. Verification email is sent
      // automatically on signup; the gate page has a resend button.
      if (!isEmailVerified) {
        await sendToVerifyGate(currentPath || '/admin/overview');
      }
    } else {
      // No landlord profile, redirect to onboarding
      redirect('/onboarding');
    }
  }

  if (role === 'contractor') {
    // Resolve the contractor account this user belongs to. Owners have a
    // ContractorProfile keyed off their userId; employees are linked via
    // ContractorEmployee.userId. We prefer the employee record when present
    // because it's the authoritative source — even if the session JWT still
    // shows the old role right after they accept the invite, the
    // ContractorEmployee row is already active and points at the correct
    // contractor.
    let contractorQuery: any;

    const employeeMembership = await prisma.contractorEmployee.findFirst({
      where: { userId: session.user.id, status: 'active' },
      select: { contractorId: true },
    });

    if (employeeMembership) {
      contractorQuery = { id: employeeMembership.contractorId };
    } else if (session.user.role === 'contractor_employee') {
      // Role says employee but no active ContractorEmployee row found.
      // That's a corrupt state — fail closed.
      redirect('/unauthorized');
    } else {
      contractorQuery = { userId: session.user.id };
    }

    const contractor = await prisma.contractorProfile.findFirst({
      where: contractorQuery,
      select: {
        id: true,
        trialStatus: true,
        trialEndDate: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionTier: true,
      },
    });

    if (contractor) {
      const now = new Date();
      const trialEnded = contractor.trialEndDate && contractor.trialEndDate < now;

      const hasActiveSubscription = 
        contractor.stripeSubscriptionId ||
        contractor.subscriptionStatus === 'active' ||
        contractor.subscriptionTier === 'starter'; // Starter tier is always allowed (free tier)

      // trialEndDate being null means they never started a trial (no plan selected yet)
      const isInTrial = 
        contractor.trialStatus === 'trialing' && 
        contractor.trialEndDate !== null &&
        !trialEnded;

      const allowAccess =
        hasActiveSubscription ||
        isInTrial;

      if (contractor.trialStatus === 'suspended' && !hasActiveSubscription) {
        redirect(redirectTo || '/onboarding/contractor/subscription?reason=suspended');
      }

      if (trialEnded && !hasActiveSubscription && contractor.trialStatus === 'trialing') {
        await prisma.contractorProfile.update({
          where: { id: contractor.id },
          data: { trialStatus: 'trial_expired' },
        });
      }

      if (!allowAccess) {
        redirect(redirectTo || '/onboarding/contractor/subscription?reason=trial_ended');
      }

      const hasPaidSubscription =
        !!contractor.stripeSubscriptionId ||
        contractor.subscriptionStatus === 'active';

      // Email verification required for all contractors — trial or paid.
      if (!isEmailVerified) {
        await sendToVerifyGate(currentPath || '/contractor-dashboard');
      }
    } else {
      redirect('/onboarding');
    }
  }

  if (role === 'agent') {
    const agent = await prisma.agent.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        trialStatus: true,
        trialEndDate: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (agent) {
      const now = new Date();
      const trialEnded = agent.trialEndDate && agent.trialEndDate < now;

      const hasActiveSubscription = 
        agent.stripeSubscriptionId ||
        agent.subscriptionStatus === 'active';

      const isInTrial = 
        agent.trialStatus === 'trialing' && 
        !trialEnded;

      const allowAccess =
        hasActiveSubscription ||
        isInTrial;

      if (agent.trialStatus === 'suspended' && !hasActiveSubscription) {
        redirect(redirectTo || '/onboarding/agent/subscription?reason=suspended');
      }

      if (trialEnded && !hasActiveSubscription && agent.trialStatus === 'trialing') {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { trialStatus: 'trial_expired' },
        });
      }

      if (!allowAccess) {
        redirect(redirectTo || '/onboarding/agent/subscription?reason=trial_ended');
      }

      const hasPaidSubscription =
        !!agent.stripeSubscriptionId ||
        agent.subscriptionStatus === 'active';
      // Email verification required for all agents — trial or paid.
      if (!isEmailVerified) {
        await sendToVerifyGate(currentPath || '/agent-dashboard');
      }
    } else {
      redirect('/onboarding');
    }
  }

  // If all checks pass, return null (allow access)
  return null;
}
