/**
 * Contractor permission helpers
 *
 * Resolves the effective permissions for a user acting on a contractor's
 * account — either as the owner (ContractorProfile.userId) or as an employee
 * with an assigned role / custom permissions.
 */

import { prisma } from '@/db/prisma';
import { type ContractorPermission, CONTRACTOR_ROLES } from '@/lib/config/contractor-roles';

export interface ContractorAuthResult {
  contractorId: string;
  isOwner: boolean;
  permissions: ContractorPermission[];
  tier: string;
  employeeId?: string;   // Set when user is an employee (not owner)
  roleName?: string;     // The display name of their assigned role
}

/**
 * Resolve the contractor context for the current user.
 * Returns null if the user has no contractor profile and is not an employee.
 */
export async function resolveContractorAuth(userId: string): Promise<ContractorAuthResult | null> {
  // 1. Owner path — user owns a ContractorProfile
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true, subscriptionTier: true },
  });

  if (profile) {
    const ownerRole = CONTRACTOR_ROLES['owner'];
    return {
      contractorId: profile.id,
      isOwner: true,
      permissions: ownerRole ? [...ownerRole.permissions] : [],
      tier: profile.subscriptionTier || 'starter',
    };
  }

  // 2. Employee path — user is a ContractorEmployee with a userId link
  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId, status: 'active' },
    select: {
      id: true,
      contractorId: true,
      customPermissions: true,
      assignedRole: {
        select: { name: true, permissions: true },
      },
      contractor: {
        select: { subscriptionTier: true },
      },
    },
  });

  if (!employee) return null;

  // Merge role permissions with any custom overrides
  const rolePerms: ContractorPermission[] = Array.isArray(employee.assignedRole?.permissions)
    ? (employee.assignedRole!.permissions as ContractorPermission[])
    : [];

  const customPerms: ContractorPermission[] = Array.isArray(employee.customPermissions)
    ? (employee.customPermissions as ContractorPermission[])
    : [];

  // Custom permissions override (replace) role permissions when present
  const effective = customPerms.length > 0 ? customPerms : rolePerms;

  return {
    contractorId: employee.contractorId,
    isOwner: false,
    permissions: effective,
    tier: employee.contractor?.subscriptionTier || 'starter',
    employeeId: employee.id,
    roleName: employee.assignedRole?.name || undefined,
  };
}

/**
 * Check if the resolved auth has the given permission.
 */
export function can(auth: ContractorAuthResult, permission: ContractorPermission): boolean {
  return auth.permissions.includes(permission);
}

/**
 * Require a minimum subscription tier.
 * starter < pro < enterprise
 */
export function meetsMinTier(auth: ContractorAuthResult, required: 'starter' | 'pro' | 'enterprise'): boolean {
  const order: Record<string, number> = { starter: 1, pro: 2, enterprise: 3 };
  return (order[auth.tier] ?? 0) >= (order[required] ?? 0);
}
