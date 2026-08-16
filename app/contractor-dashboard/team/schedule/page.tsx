import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Lock, Zap } from 'lucide-react';
import { ContractorSchedulePageWrapper } from '@/components/contractor/team-pages/schedule-page';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = { title: 'Team Scheduling' };

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const profile = await getContractorProfileForUser(session.user.id, {
    subscriptionTier: true,
  });
  if (!profile) redirect('/onboarding/contractor');

  const tier = profile.subscriptionTier || 'starter';
  const hasAccess = tier === 'pro' || tier === 'enterprise';

  if (!hasAccess) {
    return (
      <main className="w-full px-4 py-10 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 text-center">
            <Lock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Team Scheduling</h1>
            <p className="text-slate-300 mb-6">Team scheduling is available on the Pro plan.</p>
            <Link href="/contractor-dashboard/settings/subscription" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-full font-semibold transition-colors">
              <Zap className="h-5 w-5" /> Upgrade to Pro
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full pb-8">
      <ContractorSchedulePageWrapper />
    </main>
  );
}
