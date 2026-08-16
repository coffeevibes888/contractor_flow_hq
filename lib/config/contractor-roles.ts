/**
 * Contractor Team Roles and Permissions Configuration
 * 
 * Comprehensive role-based access control for contractor businesses
 */

export type ContractorPermission =
  // Job Management
  | 'jobs.view'
  | 'jobs.create'
  | 'jobs.edit'
  | 'jobs.delete'
  | 'jobs.assign'
  | 'jobs.complete'
  | 'jobs.schedule'
  
  // Customer Management
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  | 'customers.contact'
  
  // Invoicing & Payments
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.edit'
  | 'invoices.delete'
  | 'invoices.send'
  | 'payments.view'
  | 'payments.process'
  
  // Estimates & Quotes
  | 'estimates.view'
  | 'estimates.create'
  | 'estimates.edit'
  | 'estimates.delete'
  | 'estimates.send'
  
  // Team Management
  | 'team.view'
  | 'team.invite'
  | 'team.edit'
  | 'team.remove'
  | 'team.manage_roles'
  
  // Time Tracking
  | 'time.view_own'
  | 'time.view_all'
  | 'time.edit_own'
  | 'time.edit_all'
  | 'time.approve'
  
  // Inventory Management
  | 'inventory.view'
  | 'inventory.create'
  | 'inventory.edit'
  | 'inventory.delete'
  | 'inventory.receive'
  | 'inventory.use'
  | 'inventory.reorder'
  
  // Equipment Management
  | 'equipment.view'
  | 'equipment.create'
  | 'equipment.edit'
  | 'equipment.delete'
  | 'equipment.assign'
  | 'equipment.maintenance'
  
  // Truck/Vehicle Management
  | 'trucks.view'
  | 'trucks.create'
  | 'trucks.edit'
  | 'trucks.delete'
  | 'trucks.load'
  | 'trucks.unload'
  | 'trucks.assign'
  
  // Financial Management
  | 'financials.view_summary'
  | 'financials.view_detailed'
  | 'financials.manage'
  | 'expenses.view'
  | 'expenses.create'
  | 'expenses.approve'
  
  // Reports & Analytics
  | 'reports.view'
  | 'reports.export'
  | 'analytics.view'
  
  // Settings & Configuration
  | 'settings.view'
  | 'settings.edit'
  | 'settings.billing'
  
  // Communications
  | 'messages.view'
  | 'messages.send'
  | 'messages.manage'
  
  // Payroll
  | 'payroll.view'
  | 'payroll.run'
  | 'payroll.edit'
  | 'payroll.mark_paid'

  // Leads & Marketing
  | 'leads.view'
  | 'leads.create'
  | 'leads.edit'
  | 'leads.convert'
  | 'marketing.view'
  | 'marketing.manage';

export interface ContractorRoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: ContractorPermission[];
  color: string; // For UI display
  icon: string; // Icon name
  isDefault?: boolean;
  canBeDeleted?: boolean;
}

/**
 * Predefined contractor roles with appropriate permissions
 */
export const CONTRACTOR_ROLES: Record<string, ContractorRoleDefinition> = {
  owner: {
    id: 'owner',
    name: 'Owner',
    description: 'Full access to all features and settings',
    permissions: [
      // All permissions
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.delete', 'jobs.assign', 'jobs.complete', 'jobs.schedule',
      'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.contact',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.send',
      'payments.view', 'payments.process',
      'estimates.view', 'estimates.create', 'estimates.edit', 'estimates.delete', 'estimates.send',
      'team.view', 'team.invite', 'team.edit', 'team.remove', 'team.manage_roles',
      'time.view_own', 'time.view_all', 'time.edit_own', 'time.edit_all', 'time.approve',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.receive', 'inventory.use', 'inventory.reorder',
      'equipment.view', 'equipment.create', 'equipment.edit', 'equipment.delete', 'equipment.assign', 'equipment.maintenance',
      'trucks.view', 'trucks.create', 'trucks.edit', 'trucks.delete', 'trucks.load', 'trucks.unload', 'trucks.assign',
      'financials.view_summary', 'financials.view_detailed', 'financials.manage',
      'expenses.view', 'expenses.create', 'expenses.approve',
      'payroll.view', 'payroll.run', 'payroll.edit', 'payroll.mark_paid',
      'reports.view', 'reports.export', 'analytics.view',
      'settings.view', 'settings.edit', 'settings.billing',
      'messages.view', 'messages.send', 'messages.manage',
      'leads.view', 'leads.create', 'leads.edit', 'leads.convert',
      'marketing.view', 'marketing.manage',
    ],
    color: 'purple',
    icon: 'Crown',
    isDefault: true,
    canBeDeleted: false,
  },

  manager: {
    id: 'manager',
    name: 'Operations Manager',
    description:
      'Right hand to the owner. Runs day-to-day operations, dispatches crews, approves POs, sees summary financials.',
    permissions: [
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.assign', 'jobs.complete', 'jobs.schedule',
      'customers.view', 'customers.create', 'customers.edit', 'customers.contact',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.send',
      'payments.view',
      'estimates.view', 'estimates.create', 'estimates.edit', 'estimates.send',
      'team.view', 'team.invite', 'team.edit',
      'time.view_all', 'time.edit_all', 'time.approve',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.receive', 'inventory.use', 'inventory.reorder',
      'equipment.view', 'equipment.create', 'equipment.edit', 'equipment.assign', 'equipment.maintenance',
      'trucks.view', 'trucks.edit', 'trucks.load', 'trucks.unload', 'trucks.assign',
      'financials.view_summary',
      'expenses.view', 'expenses.create', 'expenses.approve',
      // Payroll: Operations Manager can VIEW payroll data but not run/edit/mark paid
      'payroll.view',
      'reports.view', 'reports.export', 'analytics.view',
      'settings.view',
      'messages.view', 'messages.send', 'messages.manage',
      'leads.view', 'leads.create', 'leads.edit', 'leads.convert',
      'marketing.view',
    ],
    color: 'blue',
    icon: 'Briefcase',
    isDefault: true,
    canBeDeleted: false,
  },

  foreman: {
    id: 'foreman',
    name: 'Field Lead / Foreman',
    description:
      'On-site supervisor. Leads the crew, drives the truck, logs time, photographs progress, reports problems. Operational view only — no financials.',
    permissions: [
      'jobs.view', 'jobs.edit', 'jobs.assign', 'jobs.complete', 'jobs.schedule',
      'customers.view', 'customers.contact',
      'estimates.view',
      // Field leads now see who's on the team (so the crew map and team
      // schedule actually work) and can approve their crew's time.
      'team.view',
      'time.view_all', 'time.edit_own', 'time.approve',
      // Inventory, equipment, trucks, labels — every tool a foreman touches
      // pulling parts off the shelf or loading the truck.
      'inventory.view', 'inventory.use', 'inventory.reorder',
      'equipment.view', 'equipment.assign',
      'trucks.view', 'trucks.load', 'trucks.unload',
      // Expenses they create themselves (gas, supplies on the way)
      'expenses.view', 'expenses.create',
      'reports.view',
      'messages.view', 'messages.send',
      'leads.view',
    ],
    color: 'orange',
    icon: 'HardHat',
    isDefault: true,
    canBeDeleted: false,
  },

  technician: {
    id: 'technician',
    name: 'Technician / Tradesperson',
    description:
      'Skilled worker who performs the actual work on assigned jobs. Sees their own jobs and time tracking only.',
    permissions: [
      'jobs.view', 'jobs.complete',
      'customers.view',
      'time.view_own', 'time.edit_own',
      'inventory.view', 'inventory.use',
      'equipment.view',
      'trucks.view', 'trucks.load', 'trucks.unload',
      'expenses.view', 'expenses.create',
      'messages.view', 'messages.send',
    ],
    color: 'green',
    icon: 'Wrench',
    isDefault: true,
    canBeDeleted: false,
  },

  helper: {
    id: 'helper',
    name: 'Helper / Laborer',
    description:
      'Assists technicians on the job. Read-only on most things — sees their jobs, logs their hours.',
    permissions: [
      'jobs.view',
      'time.view_own', 'time.edit_own',
      'inventory.view', 'inventory.use',
      'equipment.view',
      'trucks.view', 'trucks.load', 'trucks.unload',
      'messages.view', 'messages.send',
    ],
    color: 'slate',
    icon: 'Users',
    isDefault: true,
    canBeDeleted: false,
  },

  driver: {
    id: 'driver',
    name: 'Driver / Mover',
    description:
      'Operates vehicles, transports materials, manages truck inventory. Touches inventory transfers and labels every day.',
    permissions: [
      'jobs.view', 'jobs.complete',
      'customers.view',
      'time.view_own', 'time.edit_own',
      // Drivers see inventory because they're the ones moving it between
      // warehouse, truck, and job sites.
      'inventory.view', 'inventory.use',
      'equipment.view',
      'trucks.view', 'trucks.load', 'trucks.unload', 'trucks.assign',
      'expenses.view', 'expenses.create',
      'messages.view', 'messages.send',
    ],
    color: 'cyan',
    icon: 'Truck',
    isDefault: true,
    canBeDeleted: false,
  },

  sales: {
    id: 'sales',
    name: 'Estimator / Salesperson',
    description:
      'Brings in new work. Visits prospects, writes estimates, manages the leads pipeline.',
    permissions: [
      'jobs.view', 'jobs.create',
      'customers.view', 'customers.create', 'customers.edit', 'customers.contact',
      'estimates.view', 'estimates.create', 'estimates.edit', 'estimates.send',
      // Estimators need pricing context to sell
      'invoices.view',
      'reports.view',
      'messages.view', 'messages.send',
      'leads.view', 'leads.create', 'leads.edit', 'leads.convert',
      'marketing.view',
    ],
    color: 'violet',
    icon: 'TrendingUp',
    isDefault: true,
    canBeDeleted: false,
  },

  office_admin: {
    id: 'office_admin',
    name: 'Office Admin / Coordinator',
    description:
      'Front desk. Schedules appointments, sends invoices, follows up on payment. Does NOT see margin data.',
    permissions: [
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.schedule',
      'customers.view', 'customers.create', 'customers.edit', 'customers.contact',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.send',
      'payments.view',
      'estimates.view', 'estimates.create', 'estimates.edit', 'estimates.send',
      'team.view',
      'time.view_all',
      'inventory.view',
      'equipment.view',
      'trucks.view',
      // Office admin sees expenses to file/categorize them, but no margin/P&L
      'expenses.view',
      'reports.view', 'reports.export',
      'settings.view',
      'messages.view', 'messages.send', 'messages.manage',
      'leads.view', 'leads.create', 'leads.edit', 'leads.convert',
      'marketing.view',
    ],
    color: 'pink',
    icon: 'FileText',
    isDefault: true,
    canBeDeleted: false,
  },

  bookkeeper: {
    id: 'bookkeeper',
    name: 'Bookkeeper / Accountant',
    description:
      'Handles money. Reconciles, sends invoices, chases payments, prepares 1099s. Full financial access, view-only on payroll.',
    permissions: [
      'jobs.view',
      'customers.view',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.send',
      'payments.view', 'payments.process',
      'estimates.view',
      'time.view_all',
      'inventory.view',
      'equipment.view',
      'financials.view_summary', 'financials.view_detailed',
      'expenses.view', 'expenses.create', 'expenses.approve',
      'payroll.view',
      'reports.view', 'reports.export', 'analytics.view',
      'messages.view', 'messages.send',
    ],
    color: 'emerald',
    icon: 'Calculator',
    isDefault: true,
    canBeDeleted: false,
  },

  warehouse: {
    id: 'warehouse',
    name: 'Warehouse Manager',
    description:
      'Manages inventory, receives shipments, prints labels, preps job loads. Crew-map visibility for dispatch coordination.',
    permissions: [
      'jobs.view',
      'team.view',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.receive', 'inventory.use', 'inventory.reorder',
      'equipment.view', 'equipment.create', 'equipment.edit', 'equipment.assign', 'equipment.maintenance',
      'trucks.view', 'trucks.load', 'trucks.unload',
      'expenses.view', 'expenses.create',
      'reports.view',
      'messages.view', 'messages.send',
    ],
    color: 'amber',
    icon: 'Package',
    isDefault: true,
    canBeDeleted: false,
  },

  payroll_manager: {
    id: 'payroll_manager',
    name: 'Payroll Manager',
    description:
      'Runs payroll, manages paychecks, views financial summaries. Enterprise-tier role.',
    permissions: [
      'jobs.view',
      'team.view',
      'time.view_all',
      'financials.view_summary', 'financials.view_detailed',
      'expenses.view',
      'payroll.view', 'payroll.run', 'payroll.edit', 'payroll.mark_paid',
      'reports.view', 'reports.export', 'analytics.view',
      'messages.view', 'messages.send',
    ],
    color: 'teal',
    icon: 'DollarSign',
    isDefault: false,
    canBeDeleted: true,
  },

  subcontractor: {
    id: 'subcontractor',
    name: 'Subcontractor (1099)',
    description:
      'Outside crew, paid per-job. Sees only their own assigned jobs and time entries.',
    permissions: [
      'jobs.view', 'jobs.complete',
      'customers.view',
      'time.view_own', 'time.edit_own',
      'messages.view', 'messages.send',
    ],
    color: 'rose',
    icon: 'HardHat',
    isDefault: true,
    canBeDeleted: false,
  },
};

/**
 * Get role by ID
 */
export function getContractorRole(roleId: string): ContractorRoleDefinition | undefined {
  return CONTRACTOR_ROLES[roleId];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(roleId: string, permission: ContractorPermission): boolean {
  const role = getContractorRole(roleId);
  return role?.permissions.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(roleId: string, permissions: ContractorPermission[]): boolean {
  return permissions.some(permission => hasPermission(roleId, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(roleId: string, permissions: ContractorPermission[]): boolean {
  return permissions.every(permission => hasPermission(roleId, permission));
}

/**
 * Get all available roles as an array
 */
export function getAllContractorRoles(): ContractorRoleDefinition[] {
  return Object.values(CONTRACTOR_ROLES);
}

/**
 * Get roles suitable for selection (excluding owner)
 */
export function getSelectableContractorRoles(): ContractorRoleDefinition[] {
  return Object.values(CONTRACTOR_ROLES).filter(role => role.id !== 'owner');
}

/**
 * Permission categories for UI grouping
 */
/**
 * Industry-specific role templates.
 *
 * When a contractor signs up with a specialty (e.g. "Plumbing"), we suggest
 * the roles that actually make sense for that trade. The role IDs reference
 * the predefined CONTRACTOR_ROLES above.
 *
 * Every industry always gets: owner, manager, office_admin, bookkeeper.
 * The field/trade-specific roles vary.
 */
export const INDUSTRY_ROLE_TEMPLATES: Record<string, string[]> = {
  // Trades — most have helpers, foremen, and 1099 subs on big jobs
  Plumbing:           ['owner', 'manager', 'foreman', 'technician', 'helper', 'office_admin', 'bookkeeper', 'subcontractor'],
  Electrical:         ['owner', 'manager', 'foreman', 'technician', 'helper', 'office_admin', 'bookkeeper', 'subcontractor'],
  HVAC:               ['owner', 'manager', 'foreman', 'technician', 'helper', 'office_admin', 'bookkeeper', 'subcontractor'],
  'General Contracting': ['owner', 'manager', 'foreman', 'technician', 'helper', 'driver', 'warehouse', 'office_admin', 'bookkeeper', 'sales', 'subcontractor'],
  Carpentry:          ['owner', 'manager', 'foreman', 'technician', 'helper', 'office_admin', 'bookkeeper', 'subcontractor'],
  Painting:           ['owner', 'manager', 'foreman', 'technician', 'helper', 'office_admin', 'bookkeeper', 'subcontractor'],
  Roofing:            ['owner', 'manager', 'foreman', 'technician', 'helper', 'driver', 'office_admin', 'bookkeeper', 'sales', 'subcontractor'],
  Flooring:           ['owner', 'manager', 'foreman', 'technician', 'helper', 'office_admin', 'bookkeeper', 'subcontractor'],
  Landscaping:        ['owner', 'manager', 'foreman', 'technician', 'helper', 'driver', 'office_admin', 'bookkeeper', 'subcontractor'],
  // Specialty / mobile services
  'Appliance Repair': ['owner', 'manager', 'technician', 'office_admin', 'bookkeeper'],
  'Garage Door Repair': ['owner', 'manager', 'technician', 'office_admin', 'bookkeeper'],
  'Pool Maintenance': ['owner', 'manager', 'technician', 'helper', 'office_admin', 'bookkeeper'],
  'Pest Control':     ['owner', 'manager', 'technician', 'driver', 'office_admin', 'bookkeeper'],
  'Tree Service':     ['owner', 'manager', 'foreman', 'technician', 'helper', 'driver', 'office_admin', 'bookkeeper', 'subcontractor'],
  Locksmith:          ['owner', 'manager', 'technician', 'office_admin', 'bookkeeper'],
  // Remodeling — bigger crews, more sales, lots of subs
  'Kitchen Remodeling':   ['owner', 'manager', 'foreman', 'technician', 'helper', 'sales', 'office_admin', 'bookkeeper', 'subcontractor'],
  'Bathroom Remodeling':  ['owner', 'manager', 'foreman', 'technician', 'helper', 'sales', 'office_admin', 'bookkeeper', 'subcontractor'],
  // Property maintenance / cleaning / restoration — common for real-estate-adjacent contractors
  'Property Maintenance': ['owner', 'manager', 'foreman', 'technician', 'helper', 'driver', 'office_admin', 'bookkeeper', 'subcontractor'],
  'Cleaning Services':    ['owner', 'manager', 'foreman', 'technician', 'helper', 'office_admin', 'bookkeeper'],
  Restoration:            ['owner', 'manager', 'foreman', 'technician', 'helper', 'driver', 'sales', 'office_admin', 'bookkeeper', 'subcontractor'],
  // General / fallback
  'General Repairs':  ['owner', 'manager', 'foreman', 'technician', 'helper', 'driver', 'office_admin', 'bookkeeper'],
};

/** Fallback roles if the contractor's specialty isn't in the map */
export const DEFAULT_INDUSTRY_ROLES = ['owner', 'manager', 'foreman', 'technician', 'helper', 'office_admin', 'bookkeeper'];

/**
 * Get the recommended role IDs for a given industry/specialty.
 */
export function getRolesForIndustry(specialty: string): string[] {
  return INDUSTRY_ROLE_TEMPLATES[specialty] || DEFAULT_INDUSTRY_ROLES;
}

export const PERMISSION_CATEGORIES = {
  'Job Management': [
    'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.delete', 
    'jobs.assign', 'jobs.complete', 'jobs.schedule'
  ],
  'Customer Management': [
    'customers.view', 'customers.create', 'customers.edit', 
    'customers.delete', 'customers.contact'
  ],
  'Financial': [
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.send',
    'payments.view', 'payments.process',
    'estimates.view', 'estimates.create', 'estimates.edit', 'estimates.delete', 'estimates.send',
    'financials.view_summary', 'financials.view_detailed', 'financials.manage',
    'expenses.view', 'expenses.create', 'expenses.approve'
  ],
  'Team Management': [
    'team.view', 'team.invite', 'team.edit', 'team.remove', 'team.manage_roles',
    'time.view_own', 'time.view_all', 'time.edit_own', 'time.edit_all', 'time.approve'
  ],
  'Inventory & Equipment': [
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
    'inventory.receive', 'inventory.use', 'inventory.reorder',
    'equipment.view', 'equipment.create', 'equipment.edit', 'equipment.delete',
    'equipment.assign', 'equipment.maintenance',
    'trucks.view', 'trucks.create', 'trucks.edit', 'trucks.delete',
    'trucks.load', 'trucks.unload', 'trucks.assign'
  ],
  'Reports & Analytics': [
    'reports.view', 'reports.export', 'analytics.view'
  ],
  'Settings & Configuration': [
    'settings.view', 'settings.edit', 'settings.billing'
  ],
  'Communications': [
    'messages.view', 'messages.send', 'messages.manage'
  ],
  'Sales & Marketing': [
    'leads.view', 'leads.create', 'leads.edit', 'leads.convert',
    'marketing.view', 'marketing.manage'
  ],
  'Payroll': [
    'payroll.view', 'payroll.run', 'payroll.edit', 'payroll.mark_paid'
  ],
} as const;
