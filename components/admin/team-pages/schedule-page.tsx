'use client';

import { Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';

const ScheduleTab = dynamic(() => import('@/components/admin/team-ops/schedule-tab'), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full" />
    </div>
  ),
  ssr: false,
});

export function SchedulePageWrapper() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative rounded-xl sm:rounded-2xl border border-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-300" />
        <div className="relative p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 border border-white/30">
              <Calendar className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-black">Team Scheduling</h1>
              <p className="text-xs sm:text-sm text-black/70 mt-0.5">
                Create and manage shifts, view your team calendar
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      <ScheduleTab />
    </div>
  );
}
