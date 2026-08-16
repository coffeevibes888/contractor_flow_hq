'use client';

import { UserPlus } from 'lucide-react';
import { HiringTab } from '@/components/admin/team-hub/hiring-tab';

interface HiringPageWrapperProps {
  landlordId: string;
}

export function HiringPageWrapper({ landlordId }: HiringPageWrapperProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative rounded-xl sm:rounded-2xl border border-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-300" />
        <div className="relative p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 border border-white/30">
              <UserPlus className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-black">Hiring</h1>
              <p className="text-xs sm:text-sm text-black/70 mt-0.5">
                Post job openings and manage applicants
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hiring Content */}
      <HiringTab landlordId={landlordId} />
    </div>
  );
}
