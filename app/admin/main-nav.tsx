'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { adminNavGroups, type AdminNavLink } from '@/lib/constants/admin-nav';

import { LayoutDashboard, Crown, ChevronDown } from 'lucide-react';

const MainNav = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
  const pathname = usePathname();
  const [isPro, setIsPro] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(adminNavGroups.map((g) => [g.label, g.defaultOpen ?? false]))
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/landlord/subscription', { cache: 'no-store' });
        const data = await res.json();
        const tier = data?.subscription?.tier;
        if (!cancelled) {
          setIsPro(tier === 'pro' || tier === 'enterprise');
        }
      } catch {
        if (!cancelled) setIsPro(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

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
    href === '/admin/overview'
      ? pathname === '/admin/overview'
      : pathname === href || pathname.startsWith(href);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <nav className={cn('flex flex-col gap-0.5 text-sm font-medium', className)} {...props}>
      {/* Dashboard — always visible standalone */}
      <Link
        href='/admin/overview'
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
          isActive('/admin/overview')
            ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md'
            : 'text-black hover:bg-slate-700/60 hover:text-white'
        )}
      >
        <LayoutDashboard className={cn(
          'h-4 w-4 shrink-0',
          isActive('/admin/overview') ? 'text-white' : 'text-black'
        )} />
        <span className='nav-text-content font-semibold text-sm'>Dashboard</span>
      </Link>

      {/* Grouped sections */}
      {adminNavGroups.map((group) => {
        const GroupIcon = group.icon;
        const isOpen = openGroups[group.label] ?? false;
        const hasActive = group.items.some((item) => isActive(item.href));

        return (
          <div key={group.label}>
            {/* Group header button */}
            <button
              type='button'
              onClick={() => toggleGroup(group.label)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                hasActive && !isOpen
                  ? 'text-black bg-slate-800/60'
                  : 'text-black hover:text-white hover:bg-slate-600 shadow-sm'
              )}
            >
              <GroupIcon className={cn(
                'h-4 w-4 shrink-0',
                hasActive ? 'text-black' : 'text-black'
              )} />
              <span className='nav-text-content font-semibold text-sm flex-1 text-left'>{group.label}</span>
              <ChevronDown className={cn(
                'nav-text-content h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-black',
                isOpen && 'rotate-180'
              )} />
            </button>

            {/* Group items */}
            {isOpen && (
              <div className='ml-3 pl-3 border-l border-slate-700/60 mt-0.5 mb-1 space-y-0.5'>
                {group.items.map((item: AdminNavLink) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const showProBadge = item.proOnly && !isPro;
                  const showEnterpriseBadge = item.enterpriseOnly && !isPro;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-150',
                        active
                          ? 'bg-sky-500/15 text-black border border-sky-500/20'
                          : 'text-black hover:bg-slate-700/50 hover:text-white'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300')} />
                      <span className='nav-text-content text-xs font-medium truncate flex-1'>{item.title}</span>
                      {showProBadge && (
                        <span className='shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white uppercase tracking-wide'>
                          <Crown className='h-2 w-2' />
                          Pro
                        </span>
                      )}
                      {showEnterpriseBadge && !showProBadge && (
                        <span className='shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white uppercase tracking-wide'>
                          <Crown className='h-2 w-2' />
                          Ent
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

    </nav>
  );
};

export default MainNav;
