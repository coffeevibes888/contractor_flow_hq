'use client';

import { Users } from 'lucide-react';
import { TeamMembersTab } from '@/components/admin/team-hub/team-members-tab';

interface TeamDirectoryPageProps {
  members: any[];
  isEnterprise: boolean;
  canManageTeam: boolean;
  currentUserRole: string;
}

export function TeamDirectoryPage({ members, isEnterprise, canManageTeam, currentUserRole }: TeamDirectoryPageProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative rounded-xl sm:rounded-2xl border border-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-300" />
        <div className="relative p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 border border-white/30">
                <Users className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-black">Team Directory</h1>
                <p className="text-xs sm:text-sm text-black/70 mt-0.5">
                  Manage your team members, roles, and permissions
                </p>
              </div>
            </div>
            {isEnterprise && (
              <span className="text-[10px] text-black bg-white/30 px-2 py-1 rounded-full ring-1 ring-black/20 font-semibold">
                Enterprise
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Members Content */}
      <TeamMembersTab
        members={members}
        isEnterprise={isEnterprise}
        canManageTeam={canManageTeam}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
