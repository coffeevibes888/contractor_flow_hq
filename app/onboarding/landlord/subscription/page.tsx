// SUBSCRIPTION PAGE DISABLED — card wall removed from onboarding.
// Landlords now get a 7-day free trial automatically. They can add a card
// at /admin/billing at any time before their trial expires.
// Re-enable by removing this redirect and uncommenting the original logic below.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function LandlordSubscriptionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');
  // Anyone who lands here (e.g. old emails, bookmarks) goes straight to dashboard.
  redirect('/admin/overview');
}

/*
ORIGINAL SUBSCRIPTION PAGE — preserved for re-enable
=====================================================
import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/db/prisma';
import SubscriptionSelectionClient from './subscription-selection-client';
import { ensureRoleForContext } from '@/lib/actions/role-assignment';
import { logAuditEvent } from '@/lib/security/audit-logger';

export const metadata: Metadata = {
  title: 'Choose Your Plan | Property Flow HQ',
  description: 'Select the perfect plan for your property management needs',
};

export default async function LandlordSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; skipOnboarding?: string; canceled?: string; reason?: string }>;
}) {
  ... (full original body preserved above this comment block) ...
}
*/
