/**
 * Team Permission Utilities
 * 
 * Helper functions for checking team member permissions.
 * These utilities wrap the server actions for convenient use in components and API routes.
 */

import { 
  checkTeamMemberPermission,
  checkTeamMemberHasAnyPermission,
  checkTeamMemberHasAllPermissions,
  getCurrentUserTeamRole,
  getTeamRoleDefinitions,
  getDefaultPermissionsForRole,
  getRolesForTier,
  normalizeRole,
} from '@/lib/actions/team.actions';

import {
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
  type TeamPermission,
  type TeamMemberRole,
} from '@/lib/types/team.types';

// Re-export types and constants for convenience
export type { TeamPermission, TeamMemberRole };
export { 
  PERMISSION_DEFINITIONS, 
  ROLE_DEFINITIONS,
  getDefaultPermissionsForRole,
  getRolesForTier,
  normalizeRole,
  getTeamRoleDefinitions,
};

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  userId: string,
  landlordId: string,
  permission: TeamPermission
): Promise<boolean> {
  return await checkTeamMemberPermission(userId, landlordId, permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  landlordId: string,
  permissions: TeamPermission[]
): Promise<boolean> {
  return await checkTeamMemberHasAnyPermission(userId, landlordId, permissions);
}

/**
 * Check if a user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  landlordId: string,
  permissions: TeamPermission[]
): Promise<boolean> {
  return await checkTeamMemberHasAllPermissions(userId, landlordId, permissions);
}

/**
 * Get the current user's team role and permissions for a landlord
 */
export async function getUserTeamAccess(landlordId: string) {
  return await getCurrentUserTeamRole(landlordId);
}

/**
 * Permission categories for UI grouping
 */
export const PERMISSION_CATEGORIES = {
  properties: {
    label: 'Properties',
    description: 'Property listing and management',
  },
  tenants: {
    label: 'Tenants',
    description: 'Tenant management and applications',
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Work orders and repairs',
  },
  finances: {
    label: 'Finances',
    description: 'Financial data and payments',
  },
  team: {
    label: 'Team',
    description: 'Team management and scheduling',
  },
  reports: {
    label: 'Reports',
    description: 'Analytics and reporting',
  },
} as const;

/**
 * Get permissions grouped by category
 */
export function getPermissionsByCategory() {
  const grouped: Record<string, Array<{ id: TeamPermission; label: string; description: string }>> = {};
  
  for (const [key, value] of Object.entries(PERMISSION_DEFINITIONS)) {
    const category = value.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      id: key as TeamPermission,
      label: value.label,
      description: value.description,
    });
  }
  
  return grouped;
}

/**
 * Check if a permission is included in a role's defaults
 */
export async function isDefaultPermissionForRole(role: TeamMemberRole, permission: TeamPermission): Promise<boolean> {
  const defaults = await getDefaultPermissionsForRole(role);
  return defaults.includes(permission);
}

/**
 * Get a human-readable label for a role
 */
export function getRoleLabel(role: TeamMemberRole): string {
  return ROLE_DEFINITIONS[role]?.label || role;
}

/**
 * Get a human-readable label for a permission
 */
export function getPermissionLabel(permission: TeamPermission): string {
  return PERMISSION_DEFINITIONS[permission]?.label || permission;
}

/**
 * Check if a role is available for a given subscription tier
 */
export async function isRoleAvailableForTier(role: TeamMemberRole, tier: 'starter' | 'pro' | 'enterprise'): Promise<boolean> {
  if (role === 'owner') return tier !== 'starter';
  const availableRoles = await getRolesForTier(tier);
  return availableRoles.includes(role);
}
