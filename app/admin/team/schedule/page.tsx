import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getCurrentLandlordSubscription } from '@/lib/actions/subscription.actions';
import Link from 'next/link';
import { Lock, Zap } from 'lucide-react';
import { SchedulePageWrapper } from '@/components/admin/team-pages/schedule-page';

export const metadata: Metadata = {
  title: 'Team Scheduling',
};

export default async function SchedulePage() {
  await requireAdmin();

  const subscriptionData = await getCurrentLandlordSubscription();
  const hasTeamAccess = subscriptionData.success && subscriptionData.features?.teamManagement === true;
  const tier = subscriptionData.success ? subscriptionData.currentTier : 'starter';
  const isPro = tier === 'pro' || tier === 'enterprise';

  if (!hasTeamAccess || !isPro) {
    return (
      <main className="w-full px-4 py-10 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 text-center">
            <Lock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Team Scheduling</h1>
            <p className="text-slate-300 mb-6">
              Team scheduling is available on the Pro plan. Upgrade to create shifts and manage your team calendar.
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

  return (
    <main className="w-full pb-8">
      <SchedulePageWrapper />
    </main>
  );
}
