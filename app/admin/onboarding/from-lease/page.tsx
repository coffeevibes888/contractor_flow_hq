import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import FromLeaseSetupClient from './from-lease-setup-client';

export const dynamic = 'force-dynamic';

export default async function FromLeaseSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ lc?: string }>;
}) {
  const session = await auth();
  const { lc } = await searchParams;

  // Build the canonical destination for this page (with lc if present).
  // Used in both the sign-in redirect and the verify-email redirect so
  // the full chain is preserved: sign-up → verify → back here → property created.
  const selfUrl = lc
    ? `/admin/onboarding/from-lease?lc=${encodeURIComponent(lc)}`
    : `/admin/onboarding/from-lease`;

  // ── Must be signed in ────────────────────────────────────────────────────
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(selfUrl)}`);
  }

  // ── Must have verified email — NO EXCEPTIONS ─────────────────────────────
  // Email verification is non-negotiable for any dashboard access, including
  // this bootstrap page. We check directly from the DB (not the JWT) so a
  // freshly-verified user isn't trapped if their session cookie is stale.
  //
  // The verification email sent at sign-up already embeds selfUrl as ?next=
  // (via signUpUser → sendVerificationEmailToken(email, verifyNext)).
  // So clicking the link returns them here with lc intact.
  //
  // If they're on this page without having verified yet, we send them to
  // the "check your inbox" gate page with selfUrl as the ?next= destination.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });

  if (!user?.emailVerified) {
    redirect(`/verify-email/required?next=${encodeURIComponent(selfUrl)}`);
  }

  return <FromLeaseSetupClient lcParam={lc ?? ''} userName={session.user.name || ''} />;
}
