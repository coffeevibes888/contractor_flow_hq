import { Home, Building2, Users, Calendar, TrendingUp, Palette, Settings, LucideIcon } from 'lucide-react';

export interface AgentNavLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  proOnly?: boolean;
}

export const agentNavLinks: AgentNavLink[] = [
  {
    title: 'Dashboard',
    description: 'Overview & stats',
    href: '/agent/dashboard',
    icon: Home,
  },
  {
    title: 'Listings',
    description: 'Properties for sale',
    href: '/agent/listings',
    icon: Building2,
  },
  {
    title: 'Leads',
    description: 'Buyers & sellers',
    href: '/agent/leads',
    icon: Users,
  },
  {
    title: 'Open Houses',
    description: 'Schedule & manage events',
    href: '/agent/open-houses',
    icon: Calendar,
  },
  {
    title: 'Analytics',
    description: 'Performance insights',
    href: '/agent/analytics',
    icon: TrendingUp,
    proOnly: true,
  },
  {
    title: 'Branding',
    description: 'Logo, subdomain & profile',
    href: '/agent/branding',
    icon: Palette,
  },
  {
    title: 'Settings',
    description: 'Account & preferences',
    href: '/agent/settings',
    icon: Settings,
  },
];
