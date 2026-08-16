/**
 * Team Member Roles
 * 
 * Pro Plan Roles:
 * - owner: Business owner with full access (cannot be changed)
 * - admin: Office manager / Operations director
 * - property_manager: Regional or property manager
 * - leasing_agent: Leasing consultant
 * - showing_agent: Showing coordinator
 * 
 * Enterprise-Only Roles:
 * - maintenance_tech: Maintenance technician
 * - accountant: Bookkeeper / Accountant
 * - employee: Hourly staff (clock in/out only)
 */
export type TeamMemberRole = 
  | 'owner' 
  | 'admin' 
  | 'property_manager' 
  | 'leasing_agent' 
  | 'showing_agent' 
  | 'maintenance_tech' 
  | 'accountant' 
  | 'employee';

// Legacy role mapping for backwards compatibility
export const LEGACY_ROLE_MAP: Record<string, TeamMemberRole> = {
  'manager': 'property_manager',
  'member': 'maintenance_tech',
};

/**
 * Team Permissions
 * 
 * These permissions control access to different features.
 * Each team member has a role with default permissions,
 * but permissions can be customized per member.
 */
export type TeamPermission = 
  | 'view_properties'       // View property listings and details
  | 'manage_properties'     // Add, edit, delete properties
  | 'manage_tenants'        // Add, edit tenant information
  | 'process_applications'  // Review and approve/deny rental applications
  | 'schedule_showings'     // Schedule and manage property showings
  | 'manage_maintenance'    // Create and manage maintenance requests/work orders
  | 'view_financials'       // View financial reports and data (read-only)
  | 'manage_finances'       // Full financial access (payments, refunds, etc.)
  | 'manage_team'           // Invite, remove, and manage team members
  | 'manage_schedule'       // Create and manage team schedules/shifts
  | 'approve_timesheets'    // Review and approve employee timesheets
  | 'view_reports';         // Access analytics and reporting dashboards

/**
 * All available permissions with metadata
 */
export const PERMISSION_DEFINITIONS: Record<TeamPermission, {
  label: string;
  description: string;
  category: 'properties' | 'tenants' | 'maintenance' | 'finances' | 'team' | 'reports';
}> = {
  view_properties: {
    label: 'View Properties',
    description: 'View property listings, units, and details',
    category: 'properties',
  },
  manage_properties: {
    label: 'Manage Properties',
    description: 'Add, edit, and delete properties and units',
    category: 'properties',
  },
  manage_tenants: {
    label: 'Manage Tenants',
    description: 'Add, edit, and manage tenant information',
    category: 'tenants',
  },
  process_applications: {
    label: 'Process Applications',
    description: 'Review, approve, or deny rental applications',
    category: 'tenants',
  },
  schedule_showings: {
    label: 'Schedule Showings',
    description: 'Schedule and manage property showings',
    category: 'tenants',
  },
  manage_maintenance: {
    label: 'Manage Maintenance',
    description: 'Create and manage maintenance requests and work orders',
    category: 'maintenance',
  },
  view_financials: {
    label: 'View Financials',
    description: 'View financial reports and payment history (read-only)',
    category: 'finances',
  },
  manage_finances: {
    label: 'Manage Finances',
    description: 'Process payments, refunds, and manage financial settings',
    category: 'finances',
  },
  manage_team: {
    label: 'Manage Team',
    description: 'Invite, remove, and manage team member roles and permissions',
    category: 'team',
  },
  manage_schedule: {
    label: 'Manage Schedule',
    description: 'Create and manage team schedules and shifts',
    category: 'team',
  },
  approve_timesheets: {
    label: 'Approve Timesheets',
    description: 'Review and approve employee timesheets for payroll',
    category: 'team',
  },
  view_reports: {
    label: 'View Reports',
    description: 'Access analytics dashboards and reporting',
    category: 'reports',
  },
};

/**
 * Role definitions with metadata
 */
export const ROLE_DEFINITIONS: Record<TeamMemberRole, {
  label: string;
  description: string;
  tier: 'pro' | 'enterprise';
  canCustomizePermissions: boolean;
}> = {
  owner: {
    label: 'Owner',
    description: 'Business owner with full access to all features',
    tier: 'pro',
    canCustomizePermissions: false, // Owner always has all permissions
  },
  admin: {
    label: 'Admin',
    description: 'Office manager with full operational access',
    tier: 'pro',
    canCustomizePermissions: true,
  },
  property_manager: {
    label: 'Property Manager',
    description: 'Manages properties, tenants, and day-to-day operations',
    tier: 'pro',
    canCustomizePermissions: true,
  },
  leasing_agent: {
    label: 'Leasing Agent',
    description: 'Handles tenant applications and leasing process',
    tier: 'pro',
    canCustomizePermissions: true,
  },
  showing_agent: {
    label: 'Showing Agent',
    description: 'Conducts property showings for prospective tenants',
    tier: 'pro',
    canCustomizePermissions: true,
  },
  maintenance_tech: {
    label: 'Maintenance Tech',
    description: 'Handles maintenance requests and repairs',
    tier: 'enterprise',
    canCustomizePermissions: true,
  },
  accountant: {
    label: 'Accountant',
    description: 'Manages financial records and reporting',
    tier: 'enterprise',
    canCustomizePermissions: true,
  },
  employee: {
    label: 'Employee',
    description: 'Hourly staff with time clock access',
    tier: 'enterprise',
    canCustomizePermissions: true,
  },
};

/**
 * Default permissions for each role
 * These are applied when a team member is first assigned a role,
 * but can be customized afterwards by owner/admin/property_manager
 */
export const DEFAULT_PERMISSIONS: Record<TeamMemberRole, TeamPermission[]> = {
  owner: [
    'view_properties', 'manage_properties', 'manage_tenants', 'process_applications',
    'schedule_showings', 'manage_maintenance', 'view_financials', 'manage_finances',
    'manage_team', 'manage_schedule', 'approve_timesheets', 'view_reports'
  ],
  admin: [
    'view_properties', 'manage_properties', 'manage_tenants', 'process_applications',
    'schedule_showings', 'manage_maintenance', 'view_financials', 'manage_finances',
    'manage_team', 'manage_schedule', 'approve_timesheets', 'view_reports'
  ],
  property_manager: [
    'view_properties', 'manage_properties', 'manage_tenants', 'process_applications',
    'schedule_showings', 'manage_maintenance', 'view_financials', 'manage_schedule',
    'approve_timesheets', 'view_reports'
  ],
  leasing_agent: [
    'view_properties', 'manage_tenants', 'process_applications', 'schedule_showings'
  ],
  showing_agent: [
    'view_properties', 'schedule_showings'
  ],
  maintenance_tech: [
    'view_properties', 'manage_maintenance'
  ],
  accountant: [
    'view_properties', 'view_financials', 'manage_finances', 'view_reports'
  ],
  employee: [
    'view_properties'
  ],
};
