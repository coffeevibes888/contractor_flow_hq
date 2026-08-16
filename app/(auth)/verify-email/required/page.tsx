/**
 * Verify-email required gate.
 *
 * SubscriptionGate redirects users here when they have an active trial
 * (card on file, Stripe says trialing) but haven't clicked the
 * verification link in their email yet. The page:
 *
 *   1. Confirms the user is signed in (otherwise → /sign-in).
 *   2. Shows their email address with a "Resend" button.
 *   3. Bumps a cooldown so they can't hammer the resend.
 *   4. After a successful click in their inbox, the existing
 *      `/verify-email?token=...` page lands them here briefly, sees
 *      `emailVerified` is now set on the session, and the next dashboard
 *      navigation passes through cleanly.
 *
 * Why a dedicated page instead of just blocking the dashboard inline:
 * a hard redirect to a clean "check your inbox" page is far less
 * confusing than a half-rendered dashboard with an overlay. It also
 * makes the audit trail (`TRIAL_ACCESS_BLOCKED`) much cleaner — every
 * hit is a deterministic redirect, not a UI race.
 */
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import VerifyEmailRequiredClient from './client';

interface VerifyEmailRequiredPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function VerifyEmailRequiredPage({
  searchParams,
}: VerifyEmailRequiredPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Re-check verification on the server in case the session JWT is stale —
  // a freshly verified user shouldn't be stuck on this page just because
  // their cookie hasn't refreshed yet.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true, createdAt: true },
  });
  if (!user) redirect('/sign-in');

  const params = await searchParams;
  const next = sanitizeNextPath(params.next) ?? '/admin/overview';

  if (user.emailVerified) {
    redirect(next);
  }

  // If the account was created within the last 2 minutes, sign-up already
  // sent a verification email — skip the auto-send on mount so the user
  // doesn't receive two identical emails back-to-back.
  const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
  const justSignedUp = accountAgeMs < 2 * 60 * 1000;

  return <VerifyEmailRequiredClient email={user.email} next={next} justSignedUp={justSignedUp} />;
}

/**
 * Only allow `next` to be a relative path on our own host. Prevents the
 * page from being weaponized as an open redirect.
 */
function sanitizeNextPath(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null; // protocol-relative
  return raw;
}
