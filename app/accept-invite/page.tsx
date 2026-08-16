import { Metadata } from 'next';
import { Suspense } from 'react';
import AcceptInviteClient from './accept-invite-client';

export const metadata: Metadata = { title: 'Accept Team Invitation' };

/**
 * /accept-invite?token=XXX
 *
 * Public landing page for contractor team invites. Designed to live OUTSIDE
 * the protected /contractor-dashboard layout (which has a SubscriptionGate
 * that would otherwise block invitees who don't yet have a subscription).
 *
 * Flow:
 *   - Unauthenticated → redirect to /sign-up with callbackUrl back here
 *   - Authenticated   → POST to /api/contractor/team/invite/accept, then
 *                       redirect to /contractor-dashboard
 */
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AcceptInviteClient />
    </Suspense>
  );
}
