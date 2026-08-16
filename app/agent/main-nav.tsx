'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import React from 'react';
import { agentNavLinks } from '@/lib/constants/agent-nav';


const AgentMainNav = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'flex flex-col gap-1 text-base text-black font-medium',
        className
      )}
      {...props}
    >
      {agentNavLinks.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.title}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
              isActive 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-violet-500/20' 
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            )}
          >
            <Icon className={cn(
              'h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110',
              isActive ? 'text-white' : 'text-slate-400'
            )} />
            <div className='flex flex-col min-w-0 nav-text-content'>
              <span className={cn(
                'font-semibold text-sm truncate',
                isActive ? 'text-white' : 'text-slate-200'
              )}>{item.title}</span>
              <span className={cn(
                'text-[11px] truncate',
                isActive ? 'text-violet-200' : 'text-slate-500'
              )}>{item.description}</span>
            </div>
          </Link>
        );
      })}

    </nav>
  );
};

export default AgentMainNav;
