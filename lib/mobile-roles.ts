/**
 * Shared role-set constants for mobile API endpoints.
 *
 * The mobile login route returns a single canonical `role` on the JWT
 * (`admin`, `contractor`, `tenant`, etc.) but a single user may legitimately
 * have access to several portals. Every mobile endpoint needs to gate by
 * role using one of these sets so the rules stay consistent across files.
 *
 * Add aliases here when introducing new role keys — never sprinkle them
 * across individual route files.
 */

export const PM_ROLES = new Set<string>([
  'admin',
  'superAdmin',
  'landlord',
  'property_manager',
]);

export const CONTRACTOR_ROLES = new Set<string>([
  'contractor',
]);

export const TENANT_ROLES = new Set<string>([
  'tenant',
]);

export const HOMEOWNER_ROLES = new Set<string>([
  'homeowner',
]);

export const EMPLOYEE_ROLES = new Set<string>([
  'employee',
]);

export const AGENT_ROLES = new Set<string>([
  'agent',
]);

/** Convenience helper — true if the role belongs to any portal. */
export function isAnyKnownRole(role: string): boolean {
  return (
    PM_ROLES.has(role) ||
    CONTRACTOR_ROLES.has(role) ||
    TENANT_ROLES.has(role) ||
    HOMEOWNER_ROLES.has(role) ||
    EMPLOYEE_ROLES.has(role) ||
    AGENT_ROLES.has(role)
  );
}
