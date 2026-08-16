'use client';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { homeownerNavLinks } from '@/lib/constants/homeowner-nav';
import { cn } from '@/lib/utils';

export default function HomeownerMobileDrawer() {
  const pathname = usePathname();

  return (
    <Drawer direction='left'>
      <DrawerTrigger asChild>
        <Button variant='outline' size='sm' className='md:hidden' aria-label='Open homeowner menu'>
          <MenuIcon className='h-5 w-5' />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='h-full max-w-[85vw] sm:max-w-sm bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-600 text-black'>
        <DrawerHeader>
          <DrawerTitle className='text-black text-lg'>Homeowner Dashboard</DrawerTitle>
        </DrawerHeader>
        <div className='px-3 sm:px-4 py-2 space-y-1 overflow-y-auto'>
          {homeownerNavLinks.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/homeowner/dashboard'
              ? pathname === '/homeowner/dashboard'
              : pathname.startsWith(item.href);

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
                  <div className='flex flex-col min-w-0'>
                    <span className='font-medium text-sm truncate'>{item.title}</span>
                    <span className='text-xs text-black/70 truncate'>{item.description}</span>
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
