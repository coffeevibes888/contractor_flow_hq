'use client';

import { Users, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamMembersTab } from '@/components/contractor/team-hub/team-members-tab';
import { RolesPermissionsTab } from '@/components/contractor/team-hub/roles-permissions-tab';

interface Props {
  members: any[];
  isEnterprise: boolean;
  canManageTeam: boolean;
  currentUserRole: string;
  /** Whether the signed-in user owns the contractor account. Owner-only
   *  features (like editing role permissions) are gated on this. */
  isOwner: boolean;
}

export function ContractorTeamDirectoryPage({
  members,
  isEnterprise,
  canManageTeam,
  currentUserRole,
  isOwner,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
              <Users className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Team Directory</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Manage your team members, roles, and permissions
              </p>
            </div>
          </div>
          {isEnterprise && (
            <span className="text-[10px] bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-2.5 py-1 rounded-full font-bold shadow-sm">
              ENTERPRISE
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="bg-white border border-gray-200 shadow-sm">
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-gray-600"
          >
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-gray-600"
          >
            <Shield className="h-4 w-4 mr-2" />
            Roles &amp; Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <TeamMembersTab
            members={members}
            isEnterprise={isEnterprise}
            canManageTeam={canManageTeam}
            currentUserRole={currentUserRole}
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RolesPermissionsTab isOwner={isOwner} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
