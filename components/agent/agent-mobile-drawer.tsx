'use client';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { agentNavLinks } from '@/lib/constants/agent-nav';
import { cn } from '@/lib/utils';

export default function AgentMobileDrawer() {
  const pathname = usePathname();

  return (
    <Drawer direction='left'>
      <DrawerTrigger asChild>
        <Button variant='outline' size='sm' className='md:hidden' aria-label='Open agent menu'>
          <MenuIcon className='h-5 w-5' />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='h-full max-w-[85vw] sm:max-w-sm bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-600 text-white'>
        <DrawerHeader>
          <DrawerTitle className='text-white text-lg'>Agent Dashboard</DrawerTitle>
        </DrawerHeader>
        <div className='px-3 sm:px-4 py-2 space-y-1 overflow-y-auto'>
          {agentNavLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/agent/dashboard' && pathname.startsWith(item.href));

            return (
              <DrawerClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 transition-colors',
                    isActive 
                      ? 'bg-white/30 text-white border border-white/40' 
                      : 'text-white hover:bg-white/20'
                  )}
                >
                  <Icon className='h-5 w-5 shrink-0' />
                  <div className='flex flex-col min-w-0'>
                    <span className='text-sm font-semibold truncate'>{item.title}</span>
                    <span className='text-xs text-white/80 truncate'>{item.description}</span>
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
