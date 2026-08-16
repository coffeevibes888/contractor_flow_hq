import { Building2, FileText, CreditCard, Wallet, Palette, TrendingUp, ScanText, Users, HardHat, LucideIcon, Settings, LayoutDashboard, Briefcase, MessageCircle, Wrench, Calendar, Clock, FileSpreadsheet, DollarSign, UserPlus, Home, Sparkles, Globe, Star, Receipt, GraduationCap, BookOpen, PieChart, UsersRound, ListChecks, ScrollText, Banknote, UserCheck, GitBranch, BarChart3, Calculator, Shield, Settings2, Layers, Zap } from 'lucide-react';

export interface AdminNavLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  proOnly?: boolean;
  enterpriseOnly?: boolean;
}

export interface AdminNavGroup {
  label: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items: AdminNavLink[];
}

export const adminNavGroups: AdminNavGroup[] = [
  // ─── PM-specific groups commented out for ContractorFlowHQ ───────────────────
  // {
  //   label: 'Properties',
  //   icon: Building2,
  //   defaultOpen: true,
  //   items: [
  //     {
  //       title: 'Properties',
  //       description: 'Manage buildings and units',
  //       href: '/admin/dashboard/properties',
  //       icon: Building2,
  //     },
  //     {
  //       title: 'Tenants',
  //       description: 'Manage tenants and lease information',
  //       href: '/admin/tenants',
  //       icon: UserCheck,
  //     },
  //     {
  //       title: 'Applications',
  //       description: 'Review rental applications',
  //       href: '/admin/applications',
  //       icon: FileText,
  //     },
  //     {
  //       title: 'Documents',
  //       description: 'Manage leases, applications, and more',
  //       href: '/admin/documents',
  //       icon: ScanText,
  //     },
  //     {
  //       title: 'Bulk Import',
  //       description: 'Import from Excel, CSV, or other platforms',
  //       href: '/admin/import',
  //       icon: FileSpreadsheet,
  //     },
  //   ],
  // },
  // {
  //   label: 'Operations',
  //   icon: HardHat,
  //   defaultOpen: false,
  //   items: [
  //     {
  //       title: 'Messages',
  //       description: 'Inbox & tenant communications',
  //       href: '/admin/messages',
  //       icon: MessageCircle,
  //     },
  //     {
  //       title: 'Maintenance',
  //       description: 'View and manage work requests',
  //       href: '/admin/maintenance',
  //       icon: Wrench,
  //     },
  //     {
  //       title: 'Contractor Work',
  //       description: 'Hire, invoice & pay contractors',
  //       href: '/admin/contractors',
  //       icon: HardHat,
  //     },
  //   ],
  // },
  // {
  //   label: 'Financials',
  //   icon: CreditCard,
  //   defaultOpen: false,
  //   items: [
  //     {
  //       title: 'Rents',
  //       description: 'Monthly rent collection status',
  //       href: '/admin/revenue',
  //       icon: CreditCard,
  //     },
  //     {
  //       title: 'Wallet',
  //       description: 'Property Flow Wallet (Treasury) + rent collection',
  //       href: '/admin/wallet',
  //       icon: Wallet,
  //     },
  //     {
  //       title: 'Invoices',
  //       description: 'Tenant invoices and billing',
  //       href: '/admin/invoices',
  //       icon: Receipt,
  //     },
  //     {
  //       title: 'Analytics',
  //       description: 'Financial reports & property performance insights',
  //       href: '/admin/analytics',
  //       icon: TrendingUp,
  //     },
  //   ],
  // },
  // {
  //   label: 'Accounting',
  //   icon: BookOpen,
  //   defaultOpen: false,
  //   items: [
  //     ... (all accounting items - PM focused)
  //   ],
  // },
  {
    label: 'Team',
    icon: Users,
    defaultOpen: false,
    items: [
      {
        title: 'Directory',
        description: 'Team members & roles',
        href: '/admin/team/directory',
        icon: Users,
        proOnly: true,
      },
      {
        title: 'Scheduling',
        description: 'Shifts & calendar',
        href: '/admin/team/schedule',
        icon: Calendar,
        proOnly: true,
      },
      {
        title: 'Time & Attendance',
        description: 'Clock in/out & tracking',
        href: '/admin/team/time',
        icon: Clock,
        proOnly: true,
      },
      {
        title: 'Timesheets',
        description: 'Approvals & payroll',
        href: '/admin/team/timesheets',
        icon: FileSpreadsheet,
        proOnly: true,
      },
      {
        title: 'Hiring',
        description: 'Job postings & applicants',
        href: '/admin/team/hiring',
        icon: UserPlus,
        proOnly: true,
      },
      {
        title: 'Payroll',
        description: 'Payments & integrations',
        href: '/admin/team/payroll',
        icon: DollarSign,
        enterpriseOnly: true,
      },
    ],
  },
  // Short-Term Rentals — hidden until channel API keys are configured
  // {
  //   label: 'Short-Term Rentals',
  //   icon: Home,
  //   defaultOpen: false,
  //   items: [
  //     { title: 'STR Dashboard', description: 'Overview & performance', href: '/admin/str', icon: Home, proOnly: true },
  //     { title: 'Listings', description: 'Manage rental properties', href: '/admin/str/listings', icon: Building2, proOnly: true },
  //     { title: 'Reservations', description: 'Bookings & check-ins', href: '/admin/str/reservations', icon: Calendar, proOnly: true },
  //     { title: 'Calendar', description: 'Availability & pricing', href: '/admin/str/calendar', icon: Calendar, proOnly: true },
  //     { title: 'Guests', description: 'Guest profiles & reviews', href: '/admin/str/guests', icon: Users, proOnly: true },
  //     { title: 'Inbox', description: 'Guest messaging', href: '/admin/str/inbox', icon: MessageCircle, proOnly: true },
  //     { title: 'Earnings', description: 'Revenue & payouts', href: '/admin/str/earnings', icon: DollarSign, proOnly: true },
  //     { title: 'Cleaning', description: 'Turnover schedules', href: '/admin/str/cleaning', icon: Sparkles, proOnly: true },
  //     { title: 'Channel Manager', description: 'Airbnb, VRBO & more', href: '/admin/str/channels', icon: Globe, proOnly: true },
  //     { title: 'Reviews', description: 'Ratings & responses', href: '/admin/str/reviews', icon: Star, proOnly: true },
  //     { title: 'Analytics', description: 'Occupancy & insights', href: '/admin/str/analytics', icon: TrendingUp, proOnly: true },
  //   ],
  // },
  {
    label: 'Settings',
    icon: Briefcase,
    defaultOpen: false,
    items: [
      {
        title: 'Branding',
        description: 'Logo, subdomain & custom domain',
        href: '/admin/branding',
        icon: Palette,
      },
      {
        title: 'Settings',
        description: 'Profile, fees & preferences',
        href: '/admin/settings',
        icon: Settings,
      },
      {
        title: 'Subscription',
        description: 'Manage your plan, trial & billing',
        href: '/admin/subscription',
        icon: Zap,
      },
    ],
  },
  {
    label: 'University',
    icon: GraduationCap,
    defaultOpen: false,
    items: [
      {
        title: 'Contractor University',
        description: 'Guides, tutorials & help',
        href: '/admin/university',
        icon: GraduationCap,
      },
    ],
  },
];

export const adminNavLinks: AdminNavLink[] = [
  {
    title: 'Dashboard',
    description: 'Overview & quick actions',
    href: '/admin/overview',
    icon: LayoutDashboard,
  },
  ...adminNavGroups.flatMap((g) => g.items),
];
