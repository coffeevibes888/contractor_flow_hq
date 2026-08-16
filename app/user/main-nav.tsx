'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import React from 'react';
import {
  User,
  FileText,
  FileSignature,
  ReceiptText,
  MessageCircle,
  LayoutDashboard,
  Wallet,
  Inbox,
} from 'lucide-react';
import { useSession } from 'next-auth/react';


const MainNav = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Determine dashboard label and link based on role
  let dashboardLabel = 'Dashboard';
  let dashboardLink = '/';
  
  if (userRole === 'tenant') {
    dashboardLabel = 'Tenant Dashboard';
    dashboardLink = '/user/dashboard';
  } else if (userRole === 'landlord' || userRole === 'admin' || userRole === 'superAdmin') {
    dashboardLabel = 'Landlord Dashboard';
    dashboardLink = '/admin/overview';
  } else if (userRole === 'property_manager') {
    dashboardLabel = 'Property Manager Dashboard';
    dashboardLink = '/admin/overview';
  }

  const links = [
    {
      title: dashboardLabel,
      description: 'View your dashboard',
      href: dashboardLink,
      icon: LayoutDashboard,
    },
    {
      title: 'Pay Rent',
      description: 'Make a rent payment',
      href: '/user/pay',
      icon: Wallet,
    },
    {
      title: 'Profile',
      description: 'Manage your personal details',
      href: '/user/profile',
      icon: User,
    },
    {
      title: 'Applications',
      description: 'View and complete your applications',
      href: '/user/applications',
      icon: FileText,
    },
    {
      title: 'Lease',
      description: 'Review lease documents',
      href: '/user/profile/lease',
      icon: FileSignature,
    },
    {
      title: 'Payment History',
      description: 'View past payments',
      href: '/user/profile/rent-receipts',
      icon: ReceiptText,
    },
    {
      title: 'Maintenance',
      description: 'Submit a maintenance request',
      href: '/user/profile/ticket',
      icon: MessageCircle,
    },
    {
      title: 'Messages',
      description: 'View messages from management',
      href: '/user/profile/inbox',
      icon: Inbox,
    },
  ];

  return (
    <nav
      className={cn(
        'flex flex-col gap-0.5 text-sm font-medium',
        className
      )}
      {...props}
    >
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 transition-all duration-200 bg-transparent border-l-2',
              isActive
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-indigo-400' : 'text-slate-500')} />
            <div className='flex flex-col'>
              <span className='font-medium text-xs'>{item.title}</span>
              <span className={cn('text-xs', isActive ? 'text-indigo-400' : 'text-slate-400')}>{item.description}</span>
            </div>
          </Link>
        );
      })}

    </nav>
  );
};

export default MainNav;
