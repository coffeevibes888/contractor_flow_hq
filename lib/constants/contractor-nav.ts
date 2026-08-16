import { 
  LayoutDashboard, 
  ClipboardList, 
  Calculator, 
  Palette, 
  Briefcase,
  Users,
  FolderKanban,
  FolderOpen,
  BarChart3,
  Calendar,
  Megaphone,
  Package,
  Wrench,
  Shield,
  ShoppingCart,
  FileCheck,
  Truck,
  HardHat,
  TrendingUp,
  Settings,
  CreditCard,
  UserCircle,
  DollarSign,
  Receipt,
  FileSignature,
  Tag,
  MapPin,
  Zap,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Wallet,
  LucideIcon 
} from 'lucide-react';

export interface ContractorNavLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  requiredTier?: 'pro' | 'enterprise';
  /**
   * Permissions that gate this nav item. The user needs at least one of them
   * (OR semantics). If omitted, the item is visible to anyone in the account.
   * Server-side guards on each page still enforce access — this only controls
   * what shows in the sidebar.
   */
  requiredPermissions?: string[];
  /**
   * If true, only the contractor owner sees this link. Used for billing,
   * subscription, payroll-write, and other privileged surfaces.
   */
  ownerOnly?: boolean;
  locked?: boolean;
}

export interface ContractorNavGroup {
  label: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items: ContractorNavLink[];
}

export const contractorNavGroups: ContractorNavGroup[] = [
  {
    label: 'Work',
    icon: FolderKanban,
    defaultOpen: true,
    items: [
      {
        title: 'Jobs',
        description: 'Manage your projects',
        href: '/contractor-dashboard/jobs',
        icon: FolderKanban,
        requiredPermissions: ['jobs.view'],
      },
      {
        title: 'Work Orders',
        description: 'View and manage jobs',
        href: '/contractor-dashboard/work-orders',
        icon: ClipboardList,
        requiredPermissions: ['jobs.view'],
      },
      {
        title: 'Estimates',
        description: 'Create and send quotes',
        href: '/contractor-dashboard/estimates',
        icon: Calculator,
        requiredPermissions: ['estimates.view'],
      },
      {
        title: 'Calendar',
        description: 'Schedule & dispatch',
        href: '/contractor-dashboard/calendar',
        icon: Calendar,
        requiredPermissions: ['jobs.view', 'jobs.schedule'],
      },
    ],
  },
  {
    label: 'People',
    icon: Users,
    defaultOpen: false,
    items: [
      {
        title: 'Customers',
        description: 'Customer CRM',
        href: '/contractor-dashboard/customers',
        icon: Users,
        requiredPermissions: ['customers.view'],
      },
      {
        title: 'Subcontractors',
        description: 'Subcontractor network',
        href: '/contractor-dashboard/subcontractors',
        icon: HardHat,
        requiredTier: 'pro',
        requiredPermissions: ['team.view'],
      },
      {
        title: 'Morning Briefing',
        description: 'Daily crew & job overview',
        href: '/contractor-dashboard/dispatch',
        icon: Truck,
        requiredTier: 'pro',
        requiredPermissions: ['jobs.assign', 'jobs.schedule'],
      },
    ],
  },
  {
    label: 'Team',
    icon: Users,
    defaultOpen: true,
    items: [
      {
        title: 'Directory',
        description: 'Team members & roles',
        href: '/contractor-dashboard/team/directory',
        icon: Users,
        requiredTier: 'pro',
        requiredPermissions: ['team.view'],
      },
      {
        title: 'Scheduling',
        description: 'Shifts & calendar',
        href: '/contractor-dashboard/team/schedule',
        icon: Calendar,
        requiredTier: 'pro',
        requiredPermissions: ['team.view', 'jobs.schedule'],
      },
      {
        title: 'Time & Attendance',
        description: 'Clock in/out & tracking',
        href: '/contractor-dashboard/team/time',
        icon: ClipboardList,
        requiredTier: 'pro',
        requiredPermissions: ['time.view_own', 'time.view_all'],
      },
      {
        title: 'Live Crew Map',
        description: 'See where your crew is right now',
        href: '/contractor-dashboard/crew-map',
        icon: MapPin,
        requiredTier: 'pro',
        requiredPermissions: ['team.view', 'jobs.assign'],
      },
      {
        title: 'Timesheets',
        description: 'Approvals & payroll',
        href: '/contractor-dashboard/team/timesheets',
        icon: FileCheck,
        requiredTier: 'pro',
        requiredPermissions: ['time.approve', 'time.view_all'],
      },
      {
        title: 'Hiring',
        description: 'Job postings & applicants',
        href: '/contractor-dashboard/team/hiring',
        icon: Users,
        requiredTier: 'pro',
        requiredPermissions: ['team.invite'],
      },
    ],
  },
  {
    label: 'Resources',
    icon: Package,
    defaultOpen: false,
    items: [
      {
        title: 'Inventory',
        description: 'Materials & supplies',
        href: '/contractor-dashboard/inventory',
        icon: Package,
        requiredPermissions: ['inventory.view'],
      },
      {
        title: 'Equipment',
        description: 'Tools & machinery',
        href: '/contractor-dashboard/equipment',
        icon: Wrench,
        requiredPermissions: ['equipment.view'],
      },
      {
        title: 'Purchase Orders',
        description: 'Material orders',
        href: '/contractor-dashboard/purchase-orders',
        icon: ShoppingCart,
        requiredPermissions: ['inventory.create', 'expenses.create'],
      },
      {
        title: 'Receiving Dock',
        description: 'Log incoming materials',
        href: '/contractor-dashboard/receiving',
        icon: Truck,
        requiredPermissions: ['inventory.receive'],
      },
      {
        title: 'Shipping',
        description: 'Ship materials to job sites',
        href: '/contractor-dashboard/shipping',
        icon: Package,
        requiredPermissions: ['trucks.load', 'inventory.use'],
      },
      {
        title: 'Label Center',
        description: 'Print & manage labels',
        href: '/contractor-dashboard/labels',
        icon: Tag,
        requiredPermissions: ['inventory.view'],
      },
      {
        title: 'Find Inventory',
        description: 'Locate items by name or label',
        href: '/contractor-dashboard/inventory/locate',
        icon: MapPin,
        requiredPermissions: ['inventory.view'],
      },
      {
        title: 'Equipment Shop',
        description: 'Scanners, label printers & supplies',
        href: '/contractor-dashboard/shop',
        icon: ShoppingBag,
      },
    ],
  },
  {
    label: 'Growth',
    icon: TrendingUp,
    defaultOpen: false,
    items: [
      {
        title: 'Marketing',
        description: 'Marketing tools',
        href: '/contractor-dashboard/marketing',
        icon: Megaphone,
        requiredPermissions: ['marketing.view'],
      },
      {
        title: 'Reports',
        description: 'Analytics & insights',
        href: '/contractor-dashboard/reports',
        icon: BarChart3,
        requiredPermissions: ['reports.view', 'analytics.view'],
      },
    ],
  },
  {
    label: 'Business',
    icon: Briefcase,
    defaultOpen: false,
    items: [
      {
        title: 'My Business',
        description: 'Portfolio & relationships',
        href: '/contractor-dashboard/business',
        icon: Briefcase,
      },
      {
        title: 'Wallet',
        description: 'Balance, cash out, debit card & earnings',
        href: '/contractor-dashboard/wallet',
        icon: Wallet,
        ownerOnly: true,
      },
      {
        title: 'Public Profile',
        description: 'Marketplace profile & branding',
        href: '/contractor-dashboard/profile/branding',
        icon: Palette,
      },
      {
        title: 'Marketplace Visibility',
        description: 'How you rank & boost impressions',
        href: '/contractor-dashboard/profile/visibility',
        icon: TrendingUp,
      },
      {
        title: 'Warranties',
        description: 'Agreements & claims',
        href: '/contractor-dashboard/warranties',
        icon: FileCheck,
      },
      {
        title: 'Safety',
        description: 'OSHA checklists',
        href: '/contractor-dashboard/safety',
        icon: Shield,
      },
      {
        title: 'Payroll',
        description: 'Run payroll & pay stubs',
        href: '/contractor-dashboard/payroll',
        icon: DollarSign,
        requiredTier: 'pro',
        requiredPermissions: ['payroll.view'],
      },
      {
        title: 'Tax & Financials',
        description: 'P&L report & 1099 prep',
        href: '/contractor-dashboard/finance/tax',
        icon: Receipt,
        requiredPermissions: ['financials.view_summary'],
      },
      {
        title: 'Documents',
        description: 'Contracts, receipts & templates',
        href: '/contractor-dashboard/documents',
        icon: FolderOpen,
      },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    defaultOpen: false,
    items: [
      {
        title: 'Account',
        description: 'Profile, avatar & password',
        href: '/contractor-dashboard/settings/account',
        icon: UserCircle,
      },
      {
        title: 'Billing',
        description: 'Payment method & invoices',
        href: '/contractor-dashboard/settings/billing',
        icon: CreditCard,
        ownerOnly: true,
      },
      {
        title: 'Integrations',
        description: 'QuickBooks, API & webhooks',
        href: '/contractor-dashboard/settings/integrations',
        icon: Zap,
        requiredTier: 'pro' as const,
        ownerOnly: true,
      },
      {
        title: 'API & Webhooks',
        description: 'Automate with API keys & webhooks',
        href: '/contractor-dashboard/settings/api',
        icon: Zap,
        requiredTier: 'enterprise' as const,
        ownerOnly: true,
      },
      {
        title: 'Subscription',
        description: 'Plan, usage & upgrades',
        href: '/contractor-dashboard/settings/subscription',
        icon: TrendingUp,
        ownerOnly: true,
      },
    ],
  },
  // Beta Program nav intentionally hidden — see admin-nav.ts for rationale.
];

export const contractorNavLinks: ContractorNavLink[] = [
  {
    title: 'Dashboard',
    description: 'Overview of your work',
    href: '/contractor-dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Messages',
    description: 'Customer conversations',
    href: '/contractor-dashboard/messages',
    icon: MessageSquare,
  },
  ...contractorNavGroups.flatMap((g) => g.items),
];
