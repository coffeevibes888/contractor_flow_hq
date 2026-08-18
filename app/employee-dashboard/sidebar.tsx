'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  Umbrella,
  Briefcase,
  MessageSquare,
  Shield,
  Wrench,
  User,
  ChevronLeft,
  ChevronRight,
  Hammer,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  employeeName: string;
  companyName: string;
  employeeRole: string;
}

const NAV_ITEMS = [
  { title: 'Dashboard', href: '/employee-dashboard', icon: LayoutDashboard },
  { title: 'Clock In/Out', href: '/employee-dashboard/clock', icon: Clock },
  { title: 'My Schedule', href: '/employee-dashboard/schedule', icon: Calendar },
  { title: 'Timesheets', href: '/employee-dashboard/timesheets', icon: FileText },
  { title: 'Time Off', href: '/employee-dashboard/time-off', icon: Umbrella },
  { title: 'My Jobs', href: '/employee-dashboard/jobs', icon: Briefcase },
  { title: 'Messages', href: '/employee-dashboard/messages', icon: MessageSquare },
  { title: 'Safety', href: '/employee-dashboard/safety', icon: Shield },
  { title: 'Equipment', href: '/employee-dashboard/equipment', icon: Wrench },
  { title: 'Earnings', href: '/employee-dashboard/earnings', icon: DollarSign },
];

export function EmployeeDashboardSidebar({ employeeName, companyName, employeeRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/employee-dashboard' && pathname.startsWith(href));

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Company branding */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
            <Hammer className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{companyName || 'Your Team'}</p>
              <p className="text-xs text-slate-500 truncate">{employeeRole || 'Team Member'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl transition-all duration-200',
                collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-2.5',
                active
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'scale-110')} />
              {!collapsed && <span className="font-medium text-sm">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Profile + collapse toggle */}
      <div className="border-t border-slate-200 p-3 space-y-2">
        <Link
          href="/employee-dashboard/profile"
          title={collapsed ? 'Profile' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl transition-colors',
            collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-2.5',
            pathname === '/employee-dashboard/profile'
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Profile</span>}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
