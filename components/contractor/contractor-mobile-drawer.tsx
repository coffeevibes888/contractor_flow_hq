'use client';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { MenuIcon, Lock, LayoutDashboard, ChevronDown, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { contractorNavGroups, type ContractorNavLink } from '@/lib/constants/contractor-nav';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type ContractorTier = 'starter' | 'pro' | 'enterprise';
const tierOrder: Record<ContractorTier, number> = { starter: 1, pro: 2, enterprise: 3 };

export default function ContractorMobileDrawer() {
  const pathname = usePathname();
  const [tier, setTier] = useState<ContractorTier>('starter');
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(contractorNavGroups.map((g) => [g.label, g.defaultOpen ?? false]))
  );

  useEffect(() => {
    fetch('/api/contractor/subscription/usage')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tier) {
          setTier(data.tier);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch subscription tier:', err);
      })
      .finally(() => setLoading(false));

    contractorNavGroups.forEach((group) => {
      if (group.items.some((item) =>
        pathname === item.href || (item.href !== '/contractor-dashboard' && pathname.startsWith(item.href))
      )) {
        setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
      }
    });
  }, [pathname]);

  const isLocked = (item: ContractorNavLink) =>
    !item.requiredTier ? false : tierOrder[tier] < tierOrder[item.requiredTier];

  const isActive = (href: string) =>
    pathname === href || (href !== '/contractor-dashboard' && pathname.startsWith(href));

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <Drawer direction='left'>
      <DrawerTrigger asChild>
        <Button variant='outline' size='sm' className='md:hidden' aria-label='Open contractor menu'>
          <MenuIcon className='h-5 w-5' />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='h-full max-w-[80vw] sm:max-w-xs bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r border-slate-700'>
        <DrawerHeader className='border-b border-slate-700/60 pb-3'>
          <DrawerTitle className='text-white text-base font-bold'>Contractor Portal</DrawerTitle>
        </DrawerHeader>
        <div className='px-2 py-3 space-y-0.5 overflow-y-auto flex-1'>
          {/* Dashboard */}
          <DrawerClose asChild>
            <Link
              href='/contractor-dashboard'
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                isActive('/contractor-dashboard')
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900'
                  : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
              )}
            >
              <LayoutDashboard className={cn('h-4 w-4 shrink-0', isActive('/contractor-dashboard') ? 'text-slate-900' : 'text-amber-400')} />
              <span className='text-sm font-semibold'>Dashboard</span>
            </Link>
          </DrawerClose>

          {/* Messages */}
          <DrawerClose asChild>
            <Link
              href='/contractor-dashboard/messages'
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                isActive('/contractor-dashboard/messages')
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900'
                  : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
              )}
            >
              <MessageSquare className={cn('h-4 w-4 shrink-0', isActive('/contractor-dashboard/messages') ? 'text-slate-900' : 'text-amber-400')} />
              <span className='text-sm font-semibold'>Messages</span>
            </Link>
          </DrawerClose>

          {/* Groups */}
          {contractorNavGroups.map((group) => {
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
                    hasActive && !isOpen ? 'text-amber-400 bg-slate-800/60' : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                  )}
                >
                  <GroupIcon className={cn('h-4 w-4 shrink-0', hasActive ? 'text-amber-400' : 'text-slate-500')} />
                  <span className='text-sm font-semibold flex-1 text-left'>{group.label}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-slate-500 transition-transform duration-200', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className='ml-3 pl-3 border-l border-slate-700/60 mt-0.5 mb-1 space-y-0.5'>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const locked = !loading && isLocked(item);
                      const active = isActive(item.href);

                      return (
                        <DrawerClose asChild key={item.href}>
                          <Link
                            href={item.href}
                            onClick={(e) => { if (locked) e.preventDefault(); }}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
                              locked && 'opacity-50 cursor-not-allowed',
                              active
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                            )}
                          >
                            <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-amber-400' : 'text-slate-500')} />
                            <div className='flex flex-col min-w-0 flex-1'>
                              <span className='text-xs font-semibold truncate'>{item.title}</span>
                              <span className='text-[10px] text-slate-500 truncate'>{item.description}</span>
                            </div>
                            {locked && <Lock className='h-3 w-3 text-amber-500/60 shrink-0' />}
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
