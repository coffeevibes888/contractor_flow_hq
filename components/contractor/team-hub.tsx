'use client';

import { useState, type ComponentProps } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, Users, Calendar, Briefcase, 
  Clock, FileText, DollarSign, Crown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TeamChat } from '@/components/team/team-chat';
import { TeamMembersTab } from './team-hub/team-members-tab';
import { HiringTab } from './team-hub/hiring-tab';

// Lazy load enterprise-only components
import dynamic from 'next/dynamic';

const ScheduleTab = dynamic(() => import('./team-ops/schedule-tab'), { 
  loading: () => <TabLoadingState />,
  ssr: false 
});
const TimeTrackingTab = dynamic(() => import('./team-ops/time-tracking-tab'), { 
  loading: () => <TabLoadingState />,
  ssr: false 
});
const TimesheetsTab = dynamic(() => import('./team-ops/timesheets-tab'), { 
  loading: () => <TabLoadingState />,
  ssr: false 
});
// Payroll commented out until third-party payroll API integration
// const PayrollTab = dynamic(() => import('./team-ops/payroll-tab'), { 
//   loading: () => <TabLoadingState />,
//   ssr: false 
// });

function TabLoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );
}

interface TeamMemberData {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'property_manager' | 'leasing_agent' | 'showing_agent' | 'maintenance_tech' | 'accountant' | 'employee';
  status: 'pending' | 'active' | 'inactive';
  invitedEmail?: string;
  permissions: string[];
  joinedAt?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  } | null;
}

interface TeamHubProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  contractorId: string;
  teamMembers: TeamMemberData[];
  subscriptionTier: 'starter' | 'pro' | 'enterprise';
  currentUserRole?: string;
  canManageTeam?: boolean;
  features?: {
    teamManagement?: boolean;
    teamCommunications?: boolean;
    teamOperations?: boolean;
  };
}

export function TeamHub({ 
  currentUser, 
  contractorId, 
  teamMembers, 
  subscriptionTier,
  currentUserRole = 'member',
  canManageTeam = false,
}: TeamHubProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const isEnterprise = subscriptionTier === 'enterprise';
  const isPro = subscriptionTier === 'pro' || subscriptionTier === 'enterprise';
  const activeMembers = teamMembers.filter(m => m.status === 'active');
  const isOwner = currentUserRole === 'owner';

  const handleRolesClick = () => {
    setActiveTab('members');
  };

  return (
    <div className="flex flex-col bg-slate-900/40 rounded-2xl border border-white/10">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">Team Hub</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {isEnterprise 
                ? 'Manage unlimited team members, communicate, and run operations'
                : isPro
                ? 'Manage up to 6 team members (5 + owner), communicate, and track operations'
                : 'Manage your team, communicate, and collaborate'
              }
            </p>
          </div>
          {isEnterprise && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 self-start sm:self-auto">
              <Crown className="h-3 w-3 mr-1" />
              Enterprise
            </Badge>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-slate-900/30 overflow-x-auto">
          <TabsList className="inline-flex h-auto p-1 bg-slate-800/60 border border-white/10 rounded-xl gap-1 min-w-max">
            {/* Always available tabs */}
            <TabsTrigger
              value="chat"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg text-slate-300 text-sm"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </TabsTrigger>
            
            <TabsTrigger
              value="members"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg text-slate-300 text-sm"
            >
              <Users className="h-4 w-4" />
              <span>Members</span>
              <Badge variant="secondary" className="ml-1 bg-white/10 text-xs">
                {activeMembers.length}
              </Badge>
            </TabsTrigger>

            {/* Pro+ tabs */}
            {isPro && (
              <>
                <div className="w-px h-6 bg-white/10 mx-1 self-center hidden sm:block" />
                
                <TabsTrigger
                  value="schedule"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg text-slate-300 text-sm"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Schedule</span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="time"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg text-slate-300 text-sm"
                >
                  <Clock className="h-4 w-4" />
                  <span>Time</span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="timesheets"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg text-slate-300 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span>Timesheets</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          <TabsContent value="chat" className="h-full mt-0 flex flex-col">
            <div className="flex-1 min-h-0">
              <TeamChat
                currentUser={currentUser}
                landlordId={contractorId}
                isFullPage={true}
                // The contractor side uses a richer role union than TeamChat's
                // built-in TeamMemberData (TeamChat was originally written for
                // landlord-side roles). Cast at the boundary; the chat only
                // displays the role label, it doesn't branch on the value.
                teamMembers={teamMembers as unknown as ComponentProps<typeof TeamChat>['teamMembers']}
                canManageTeam={canManageTeam}
                onRolesClick={handleRolesClick}
                apiPrefix="contractor"
              />
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <div className="p-4 sm:p-6">
              <TeamMembersTab 
                members={teamMembers} 
                isEnterprise={isEnterprise}
                canManageTeam={canManageTeam}
                currentUserRole={currentUserRole}
              />
            </div>
          </TabsContent>

          {isPro && (
            <>
              <TabsContent value="schedule" className="mt-0">
                <div className="p-3 sm:p-6">
                  <ScheduleTab />
                </div>
              </TabsContent>

              <TabsContent value="time" className="mt-0">
                <div className="p-4 sm:p-6">
                  <TimeTrackingTab />
                </div>
              </TabsContent>

              <TabsContent value="timesheets" className="mt-0">
                <div className="p-4 sm:p-6">
                  <TimesheetsTab />
                </div>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
