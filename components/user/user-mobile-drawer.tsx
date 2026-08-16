'use client';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { MenuIcon, User, FileText, FileSignature, ReceiptText, MessageCircle, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

export default function UserMobileDrawer() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

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
      title: 'Rent Receipts',
      description: 'Download payment receipts',
      href: '/user/profile/rent-receipts',
      icon: ReceiptText,
    },
    {
      title: 'Create Ticket',
      description: 'Submit a maintenance request',
      href: '/user/profile/ticket',
      icon: MessageCircle,
    },
  ];

  return (
    <Drawer direction='left'>
      <DrawerTrigger asChild>
        <Button variant='outline' size='sm' className='md:hidden' aria-label='Open menu'>
          <MenuIcon className='h-5 w-5' />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='h-full max-w-sm bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-600 text-black'>
        <DrawerHeader>
          <DrawerTitle className='text-black text-lg'>Resident Portal</DrawerTitle>
        </DrawerHeader>
        <div className='px-4 py-2 space-y-1 overflow-y-auto'>
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <DrawerClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 transition-colors',
                    isActive 
                      ? 'bg-white/30 text-black border border-white/40' 
                      : 'text-black hover:bg-white/20'
                  )}
                >
                  <Icon className='h-5 w-5 shrink-0' />
                  <div className='flex flex-col'>
                    <span className='font-medium text-sm'>{item.title}</span>
                    <span className='text-xs text-black/70'>{item.description}</span>
                  </div>
                </Link>
              </DrawerClose>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
