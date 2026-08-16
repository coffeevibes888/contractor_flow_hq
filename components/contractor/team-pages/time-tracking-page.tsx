'use client';

import { Clock } from 'lucide-react';
import dynamic from 'next/dynamic';

const TimeTrackingTab = dynamic(() => import('@/components/contractor/team-ops/time-tracking-tab'), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
    </div>
  ),
  ssr: false,
});

/**
 * Hero shell for /contractor-dashboard/team/time.
 *
 * The previous version used a dark slate hero — that part still reads
 * fine because everything inside was set on a dark gradient. The body
 * underneath, however, is rendered on the light dashboard background, so
 * the rest of the page (TimeTrackingTab) now uses light surfaces with
 * gray text.
 */
export function ContractorTimeTrackingPageWrapper() {
  return (
    <div className="space-y-6">
      <div className="relative rounded-xl sm:rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.12),_transparent_60%)]" />
        <div className="relative p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Time &amp; Attendance</h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Track clock in/out, view who&apos;s working, and manage time entries
              </p>
            </div>
          </div>
        </div>
      </div>
      <TimeTrackingTab />
    </div>
  );
}
