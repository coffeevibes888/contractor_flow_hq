'use client';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { MenuIcon, LayoutDashboard, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavGroups, type AdminNavLink } from '@/lib/constants/admin-nav';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function AdminMobileDrawer() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(adminNavGroups.map((g) => [g.label, g.defaultOpen ?? false]))
  );

  useEffect(() => {
    adminNavGroups.forEach((group) => {
      if (group.items.some((item) =>
        pathname === item.href || (item.href !== '/admin/overview' && pathname.startsWith(item.href))
      )) {
        setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
      }
    });
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin/overview' && pathname.startsWith(href));

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <Drawer direction='left'>
      <DrawerTrigger asChild>
        <Button variant='outline' size='sm' className='md:hidden' aria-label='Open admin menu'>
          <MenuIcon className='h-5 w-5' />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='h-full max-w-[80vw] sm:max-w-xs bg-gradient-to-b from-sky-600 to-cyan-600 text-white border-r border-cyan-500/30'>
        <DrawerHeader className='border-b border-cyan-400/30 pb-3'>
          <DrawerTitle className='text-white text-base font-bold'>Admin Dashboard</DrawerTitle>
        </DrawerHeader>
        <div className='px-2 py-3 space-y-0.5 overflow-y-auto flex-1'>
          {/* Dashboard */}
          <DrawerClose asChild>
            <Link
              href='/admin/overview'
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                isActive('/admin/overview')
                  ? 'bg-white/30 text-white border border-white/40'
                  : 'text-cyan-100 hover:bg-white/20 hover:text-white'
              )}
            >
              <LayoutDashboard className={cn('h-4 w-4 shrink-0', isActive('/admin/overview') ? 'text-white' : 'text-cyan-200')} />
              <span className='text-sm font-semibold'>Dashboard</span>
            </Link>
          </DrawerClose>

          {/* Groups */}
          {adminNavGroups.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = openGroups[group.label] ?? false;
            const hasActive = group.items.some((item) => isActive(item.href));

            return (
              <div key={group.label}>
                <button
                  type='button'
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                    hasActive && !isOpen ? 'text-white bg-white/20' : 'text-cyan-200 hover:text-white hover:bg-white/10'
                  )}
                >
                  <GroupIcon className={cn('h-4 w-4 shrink-0', hasActive ? 'text-white' : 'text-cyan-300')} />
                  <span className='text-sm font-semibold flex-1 text-left'>{group.label}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-cyan-300 transition-transform duration-200', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className='ml-3 pl-3 border-l border-cyan-400/30 mt-0.5 mb-1 space-y-0.5'>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <DrawerClose asChild key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
                              active
                                ? 'bg-white/20 text-white border border-white/30'
                                : 'text-cyan-200 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-white' : 'text-cyan-300')} />
                            <div className='flex flex-col min-w-0 flex-1'>
                              <span className='text-xs font-semibold truncate'>{item.title}</span>
                              <span className='text-[10px] text-cyan-200/70 truncate'>{item.description}</span>
                            </div>
                            {item.proOnly && (
                              <span className='text-[9px] font-bold bg-cyan-400/30 text-white px-1.5 py-0.5 rounded-full shrink-0'>Pro</span>
                            )}
                            {item.enterpriseOnly && (
                              <span className='text-[9px] font-bold bg-cyan-400/30 text-white px-1.5 py-0.5 rounded-full shrink-0'>Ent</span>
                            )}
                          </Link>
                        </DrawerClose>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
