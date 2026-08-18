'use client';

import Link from 'next/link';
import {
  Clock,
  Calendar,
  FileText,
  Umbrella,
  Briefcase,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface Props {
  employee: {
    firstName: string;
    lastName: string;
    role: string;
    companyName: string;
    hireDate: string;
  };
  stats: {
    todayShifts: number;
    isClockedIn: boolean;
    clockedInSince: string | null;
    pendingTimeOff: number;
    unreadMessages: number;
  };
}

export default function EmployeeDashboardHome({ employee, stats }: Props) {
  const greeting = getGreeting();
  const clockedDuration = stats.clockedInSince
    ? getElapsedTime(new Date(stats.clockedInSince))
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {employee.firstName}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {employee.role} at {employee.companyName}
          </p>
        </div>
        <Link
          href="/employee-dashboard/clock"
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
            stats.isClockedIn
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
              : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-orange-500/20'
          }`}
        >
          <Clock className="h-4 w-4" />
          {stats.isClockedIn ? 'Clock Out' : 'Clock In'}
        </Link>
      </div>

      {/* Status banner */}
      {stats.isClockedIn && clockedDuration && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Currently clocked in — {clockedDuration}
            </p>
            <p className="text-xs text-emerald-600">
              Since {new Date(stats.clockedInSince!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="h-5 w-5 text-blue-500" />}
          label="Today's Shifts"
          value={String(stats.todayShifts)}
          href="/employee-dashboard/schedule"
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          label="Status"
          value={stats.isClockedIn ? 'Clocked In' : 'Clocked Out'}
          href="/employee-dashboard/clock"
          color="orange"
        />
        <StatCard
          icon={<Umbrella className="h-5 w-5 text-violet-500" />}
          label="Pending Time Off"
          value={String(stats.pendingTimeOff)}
          href="/employee-dashboard/time-off"
          color="violet"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-emerald-500" />}
          label="Messages"
          value={stats.unreadMessages > 0 ? `${stats.unreadMessages} new` : 'All read'}
          href="/employee-dashboard/messages"
          color="emerald"
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickAction
          icon={<Briefcase className="h-5 w-5" />}
          title="View My Jobs"
          desc="See assigned jobs, materials, and details"
          href="/employee-dashboard/jobs"
          color="from-blue-500 to-cyan-500"
        />
        <QuickAction
          icon={<FileText className="h-5 w-5" />}
          title="My Timesheets"
          desc="View hours, overtime, and pay history"
          href="/employee-dashboard/timesheets"
          color="from-violet-500 to-purple-500"
        />
        <QuickAction
          icon={<Umbrella className="h-5 w-5" />}
          title="Request Time Off"
          desc="Submit PTO, sick, or personal days"
          href="/employee-dashboard/time-off"
          color="from-emerald-500 to-teal-500"
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, href, color }: { icon: React.ReactNode; label: string; value: string; href: string; color: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        {icon}
        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </Link>
  );
}

function QuickAction({ icon, title, desc, href, color }: { icon: React.ReactNode; title: string; desc: string; href: string; color: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-900 text-sm group-hover:text-slate-700">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getElapsedTime(since: Date): string {
  const now = new Date();
  const diff = now.getTime() - since.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
