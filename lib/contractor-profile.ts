/**
 * Helpers for resolving the ContractorProfile that a given user belongs to.
 *
 * The legacy pattern across the contractor dashboard is:
 *
 *   const profile = await prisma.contractorProfile.findUnique({
 *     where: { userId: session.user.id },
 *     select: { ... },
 *   });
 *
 * That only ever matches the OWNER's profile (the userId column on
 * ContractorProfile points to the account owner). Employees on the same
 * team have NO row matching their userId — they're connected through the
 * ContractorEmployee table. Using the legacy pattern for an employee
 * silently returns `null` and the page typically redirects them to
 * /onboarding/contractor, which kicks them out of the dashboard entirely.
 *
 * `getContractorProfileForUser` resolves both cases by going through
 * `resolveContractorAuth`, which already knows how to find the right
 * contractor for an owner OR an active employee.
 */

import 'server-only';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';
import type { Prisma } from '@prisma/client';

/**
 * Resolve the ContractorProfile that the given user belongs to.
 *
 * Returns null if the user has neither a ContractorProfile they own nor an
 * active ContractorEmployee record.
 *
 * @example
 *   const profile = await getContractorProfileForUser(session.user.id, {
 *     id: true,
 *     businessName: true,
 *     subscriptionTier: true,
 *   });
 *   if (!profile) redirect('/onboarding/contractor');
 */
export async function getContractorProfileForUser<
  T extends Prisma.ContractorProfileSelect
>(
  userId: string,
  select: T
): Promise<Prisma.ContractorProfileGetPayload<{ select: T }> | null> {
  const auth = await resolveContractorAuth(userId);
  if (!auth) return null;
  return prisma.contractorProfile.findUnique({
    where: { id: auth.contractorId },
    select,
  } as any) as Promise<Prisma.ContractorProfileGetPayload<{ select: T }> | null>;
}

/**
 * Convenience: resolve just the contractor ID for a user. Useful when the
 * caller doesn't need any other profile fields.
 */
export async function getContractorIdForUser(userId: string): Promise<string | null> {
  const auth = await resolveContractorAuth(userId);
  return auth?.contractorId ?? null;
}

/**
 * Resolve the OWNER's user ID for the contractor business that the given
 * user belongs to. Useful when querying the legacy `Contractor` model
 * (landlord-contractor service relationships) which keys off the owner's
 * userId rather than the ContractorProfile id.
 *
 * For the owner this is just their own userId. For an active employee it's
 * the userId of the owner of the ContractorProfile they belong to.
 */
export async function getContractorOwnerUserIdForUser(userId: string): Promise<string | null> {
  const auth = await resolveContractorAuth(userId);
  if (!auth) return null;
  if (auth.isOwner) return userId;
  const profile = await prisma.contractorProfile.findUnique({
    where: { id: auth.contractorId },
    select: { userId: true },
  });
  return profile?.userId ?? null;
}
