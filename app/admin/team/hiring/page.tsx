import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getCurrentLandlordSubscription } from '@/lib/actions/subscription.actions';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import Link from 'next/link';
import { Lock, Zap } from 'lucide-react';
import { HiringPageWrapper } from '@/components/admin/team-pages/hiring-page';

export const metadata: Metadata = {
  title: 'Hiring',
};

export default async function HiringPage() {
  await requireAdmin();

  const [subscriptionData, landlordResult] = await Promise.all([
    getCurrentLandlordSubscription(),
    getOrCreateCurrentLandlord(),
  ]);

  const hasTeamAccess = subscriptionData.success && subscriptionData.features?.teamManagement === true;

  if (!hasTeamAccess) {
    return (
      <main className="w-full px-4 py-10 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 text-center">
            <Lock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Hiring</h1>
            <p className="text-slate-300 mb-6">
              Hiring tools are available on the Pro plan. Upgrade to post jobs and manage applicants.
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

  const landlordId = landlordResult.success && landlordResult.landlord ? landlordResult.landlord.id : '';

  return (
    <main className="w-full pb-8">
      <HiringPageWrapper landlordId={landlordId} />
    </main>
  );
}
