import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getTeamMembers } from '@/lib/actions/team.actions';
import { getCurrentLandlordSubscription } from '@/lib/actions/subscription.actions';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { auth } from '@/auth';
import Link from 'next/link';
import { Lock, Zap } from 'lucide-react';
import { normalizeTier } from '@/lib/config/subscription-tiers';
import { TeamDirectoryPage } from '@/components/admin/team-pages/team-directory-page';

export const metadata: Metadata = {
  title: 'Team Directory',
};

export default async function DirectoryPage() {
  await requireAdmin();

  const session = await auth();

  const [subscriptionData, teamData, landlordResult] = await Promise.all([
    getCurrentLandlordSubscription(),
    getTeamMembers(),
    getOrCreateCurrentLandlord(),
  ]);

  const hasTeamAccess = subscriptionData.success && subscriptionData.features?.teamManagement === true;

  if (!hasTeamAccess) {
    return (
      <main className="w-full px-4 py-10 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 text-center">
            <Lock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Team Directory</h1>
            <p className="text-slate-300 mb-6">
              Team management is available on the Pro plan. Upgrade to invite team members and manage your team.
            </p>
            <Link
              href="/admin/settings/subscription"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-full font-semibold transition-colors"
            >
              <Zap className="h-5 w-5" />
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const tier = subscriptionData.success ? subscriptionData.currentTier : 'starter';
  const isEnterprise = tier === 'enterprise';

  const { getCurrentUserTeamRole } = await import('@/lib/actions/team.actions');
  const userRoleData = landlordResult.success && landlordResult.landlord
    ? await getCurrentUserTeamRole(landlordResult.landlord.id)
    : { success: false, role: null, canManageTeam: false };

  return (
    <main className="w-full pb-8">
      <TeamDirectoryPage
        members={teamData.success && teamData.members ? teamData.members : []}
        isEnterprise={isEnterprise}
        canManageTeam={userRoleData.canManageTeam || false}
        currentUserRole={userRoleData.role || 'member'}
      />
    </main>
  );
}
