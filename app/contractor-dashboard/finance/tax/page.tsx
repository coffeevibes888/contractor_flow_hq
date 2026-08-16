import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Lock, Zap } from 'lucide-react';
import Link from 'next/link';
import { resolveContractorAuth, can, meetsMinTier } from '@/lib/contractor-auth';
import { TaxDashboard } from '@/components/contractor/finance/tax-dashboard';

export const metadata: Metadata = { title: 'Tax & Financial Summary' };

export default async function TaxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractorAuth = await resolveContractorAuth(session.user.id);
  if (!contractorAuth) redirect('/onboarding/contractor');

  const hasAccess = meetsMinTier(contractorAuth, 'pro') && can(contractorAuth, 'financials.view_summary');

  if (!hasAccess) {
    return (
      <main className="w-full px-4 py-10 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 text-center">
            <Lock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Tax & Financial Summary</h1>
            <p className="text-slate-300 mb-6">
              P&L reports, tax category breakdowns, and 1099 prep are available on the Pro plan.
            </p>
            <Link
              href="/contractor-dashboard/settings/subscription"
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

  const canExport = can(contractorAuth, 'reports.export');
  const canViewDetailed = can(contractorAuth, 'financials.view_detailed');

  return (
    <main className="w-full pb-8">
      <TaxDashboard
        canExport={canExport}
        canViewDetailed={canViewDetailed}
        initialYear={new Date().getFullYear()}
      />
    </main>
  );
}
