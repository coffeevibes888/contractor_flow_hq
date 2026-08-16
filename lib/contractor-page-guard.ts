/**
 * Server-side page guard for contractor dashboard routes.
 *
 * Centralizes the auth + permission resolution we want every sensitive
 * page (payroll, finance, billing, team management, etc.) to perform
 * BEFORE rendering. This is the security backstop — even if a nav link
 * leaks to an unauthorized user, the page itself will still bounce them.
 */

import 'server-only';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  resolveContractorAuth,
  type ContractorAuthResult,
} from '@/lib/contractor-auth';
import { type ContractorPermission } from '@/lib/config/contractor-roles';

export interface ContractorPageGuardResult {
  userId: string;
  contractorAuth: ContractorAuthResult;
}

/**
 * Require the caller to be authenticated and resolved as a contractor user
 * (owner or active employee). Optionally require a specific permission and/or
 * owner-only access. Redirects on failure — never returns null.
 */
export async function requireContractorPage(options: {
  permission?: ContractorPermission;
  ownerOnly?: boolean;
  unauthorizedRedirect?: string;
} = {}): Promise<ContractorPageGuardResult> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorAuth = await resolveContractorAuth(session.user.id);

  if (!contractorAuth) {
    // Not part of any contractor account — kick to onboarding.
    redirect('/onboarding/contractor');
  }

  const fallback = options.unauthorizedRedirect || '/contractor-dashboard';

  if (options.ownerOnly && !contractorAuth.isOwner) {
    redirect(fallback);
  }

  if (options.permission && !contractorAuth.permissions.includes(options.permission)) {
    redirect(fallback);
  }

  return { userId: session.user.id, contractorAuth };
}

/**
 * Non-redirecting variant — returns null when unauthorized so the caller
 * can render an inline "no access" panel instead of bouncing the user.
 */
export async function tryContractorPage(): Promise<ContractorPageGuardResult | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const contractorAuth = await resolveContractorAuth(session.user.id);
  if (!contractorAuth) return null;

  return { userId: session.user.id, contractorAuth };
}
