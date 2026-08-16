'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { homeownerNavGroups, type HomeownerNavLink } from '@/lib/constants/homeowner-nav';

import { LayoutDashboard, ChevronDown } from 'lucide-react';

const MainNav = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(homeownerNavGroups.map((g) => [g.label, g.defaultOpen ?? false]))
  );

  useEffect(() => {
    homeownerNavGroups.forEach((group) => {
      if (group.items.some((item) =>
        pathname === item.href || (item.href !== '/homeowner/dashboard' && pathname.startsWith(item.href))
      )) {
        setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
      }
    });
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/homeowner/dashboard'
      ? pathname === '/homeowner/dashboard'
      : pathname === href || pathname.startsWith(href);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <nav className={cn('flex flex-col gap-0.5 text-sm font-medium', className)} {...props}>
      {/* Dashboard — always visible standalone */}
      <Link
        href='/homeowner/dashboard'
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
          isActive('/homeowner/dashboard')
            ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md'
            : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
        )}
      >
        <LayoutDashboard className={cn(
          'h-4 w-4 shrink-0',
          isActive('/homeowner/dashboard') ? 'text-white' : 'text-sky-400'
        )} />
        <span className='nav-text-content font-semibold text-sm'>Dashboard</span>
      </Link>

      {/* Grouped sections */}
      {homeownerNavGroups.map((group) => {
        const GroupIcon = group.icon;
        const isOpen = openGroups[group.label] ?? false;
        const hasActive = group.items.some((item) => isActive(item.href));

        return (
          <div key={group.label}>
            {/* Group header */}
            <button
              type='button'
              onClick={() => toggleGroup(group.label)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                hasActive && !isOpen
                  ? 'text-sky-400 bg-slate-800/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
              )}
            >
              <GroupIcon className={cn(
                'h-4 w-4 shrink-0',
                hasActive ? 'text-sky-400' : 'text-slate-500'
              )} />
              <span className='nav-text-content font-semibold text-sm flex-1 text-left'>{group.label}</span>
              <ChevronDown className={cn(
                'nav-text-content h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-slate-500',
                isOpen && 'rotate-180'
              )} />
            </button>

            {/* Group items */}
            {isOpen && (
              <div className='ml-3 pl-3 border-l border-slate-700/60 mt-0.5 mb-1 space-y-0.5'>
                {group.items.map((item: HomeownerNavLink) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-150',
                        active
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                          : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300')} />
                      <span className='nav-text-content text-xs font-medium truncate flex-1'>{item.title}</span>
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
