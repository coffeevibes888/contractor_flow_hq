'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Bell,
  Menu,
  X,
  Clock,
  Calendar,
  FileText,
  Umbrella,
  Briefcase,
  MessageSquare,
  Shield,
  Wrench,
  DollarSign,
  User,
  LogOut,
  LayoutDashboard,
  Hammer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  employeeName: string;
  companyName: string;
}

const MOBILE_NAV = [
  { title: 'Dashboard', href: '/employee-dashboard', icon: LayoutDashboard },
  { title: 'Clock In/Out', href: '/employee-dashboard/clock', icon: Clock },
  { title: 'Schedule', href: '/employee-dashboard/schedule', icon: Calendar },
  { title: 'Timesheets', href: '/employee-dashboard/timesheets', icon: FileText },
  { title: 'Time Off', href: '/employee-dashboard/time-off', icon: Umbrella },
  { title: 'Jobs', href: '/employee-dashboard/jobs', icon: Briefcase },
  { title: 'Messages', href: '/employee-dashboard/messages', icon: MessageSquare },
  { title: 'Safety', href: '/employee-dashboard/safety', icon: Shield },
  { title: 'Equipment', href: '/employee-dashboard/equipment', icon: Wrench },
  { title: 'Earnings', href: '/employee-dashboard/earnings', icon: DollarSign },
  { title: 'Profile', href: '/employee-dashboard/profile', icon: User },
];

export function EmployeeDashboardHeader({ employeeName, companyName }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/employee-dashboard' && pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left — Mobile menu + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-orange-500 hidden sm:block" />
              <div>
                <p className="text-sm font-bold text-slate-900">{companyName || 'Employee Portal'}</p>
                <p className="text-xs text-slate-500 hidden sm:block">Team Member Dashboard</p>
              </div>
            </div>
          </div>

          {/* Right — Notifications + User */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 relative">
              <Bell className="h-5 w-5" />
              {/* TODO: notification badge */}
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
                  {employeeName?.charAt(0)?.toUpperCase() || 'E'}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[120px] truncate">
                  {employeeName || 'Employee'}
                </span>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50 py-2">
                    <Link
                      href="/employee-dashboard/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="h-4 w-4" /> Profile & Settings
                    </Link>
                    <hr className="my-1 border-slate-100" />
                    <button
                      onClick={() => signOut({ callbackUrl: '/sign-in' })}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                  <Hammer className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-slate-900 text-sm">{companyName || 'Team Portal'}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {MOBILE_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                      active
                        ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium text-sm">{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
