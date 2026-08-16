import {
  HousePlus,
  Briefcase,
  Wrench,
  Settings,
  Scale,
  LayoutDashboard,
  CreditCard,
  MessageCircle,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

export interface HomeownerNavLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export interface HomeownerNavGroup {
  label: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items: HomeownerNavLink[];
}

export const homeownerNavGroups: HomeownerNavGroup[] = [
  {
    label: 'Jobs',
    icon: Briefcase,
    defaultOpen: true,
    items: [
      {
        title: 'My Jobs',
        description: 'Posted jobs and bids',
        href: '/homeowner/jobs',
        icon: Briefcase,
      },
      {
        title: 'Quote Requests',
        description: 'Recent contractor matches',
        href: '/homeowner/requests',
        icon: ClipboardList,
      },
      {
        title: 'Quotes',
        description: 'Compare contractor quotes',
        href: '/homeowner/quotes',
        icon: MessageCircle,
      },
    ],
  },
  {
    label: 'Contractors',
    icon: Wrench,
    defaultOpen: false,
    items: [
      {
        title: 'Find Contractors',
        description: 'Browse the marketplace',
        href: '/contractors',
        icon: Wrench,
      },
      {
        title: 'Disputes',
        description: 'Open issues and resolutions',
        href: '/homeowner/disputes',
        icon: Scale,
      },
    ],
  },
  {
    label: 'My Home',
    icon: HousePlus,
    defaultOpen: false,
    items: [
      {
        title: 'Settings',
        description: 'Home profile & preferences',
        href: '/homeowner/settings',
        icon: Settings,
      },
      {
        title: 'Payment Methods',
        description: 'Manage saved cards & banks',
        href: '/homeowner/settings/payment',
        icon: CreditCard,
      },
    ],
  },
];

export const homeownerNavLinks: HomeownerNavLink[] = [
  {
    title: 'Dashboard',
    description: 'Overview & quick actions',
    href: '/homeowner/dashboard',
    icon: LayoutDashboard,
  },
  ...homeownerNavGroups.flatMap((g) => g.items),
];
