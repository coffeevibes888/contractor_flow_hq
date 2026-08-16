'use client';

import { UserPlus } from 'lucide-react';
import { HiringTab } from '@/components/contractor/team-hub/hiring-tab';

interface Props {
  contractorId: string;
}

export function ContractorHiringPageWrapper({ contractorId }: Props) {
  return (
    <div className="space-y-6">
      <div className="relative rounded-xl sm:rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.12),_transparent_60%)]" />
        <div className="relative p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <UserPlus className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Hiring</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Post job openings and manage applicants</p>
            </div>
          </div>
        </div>
      </div>
      <HiringTab landlordId={contractorId} />
    </div>
  );
}
