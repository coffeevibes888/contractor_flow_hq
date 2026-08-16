'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Calendar, Clock, MessageSquare, 
  FileText, DollarSign, Umbrella, Settings
} from 'lucide-react';


const navItems = [
  {
    title: 'Dashboard',
    href: '/employee',
    icon: LayoutDashboard,
  },
  {
    title: 'My Schedule',
    href: '/employee/schedule',
    icon: Calendar,
  },
  {
    title: 'Time Clock',
    href: '/employee/time',
    icon: Clock,
  },
  {
    title: 'Team Chat',
    href: '/employee/chat',
    icon: MessageSquare,
  },
  {
    title: 'My Tasks',
    href: '/employee/tasks',
    icon: FileText,
  },
  {
    title: 'Earnings',
    href: '/employee/pay',
    icon: DollarSign,
  },
  {
    title: 'Time Off',
    href: '/employee/time-off',
    icon: Umbrella,
  },
];

export function EmployeeSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-slate-900/50 backdrop-blur-xl">
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/employee' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 transition-transform',
                isActive && 'scale-110'
              )} />
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          href="/employee/settings"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
            pathname === '/employee/settings'
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
