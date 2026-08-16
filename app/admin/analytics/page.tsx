import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { Metadata } from 'next';
import AnalyticsDashboard from './analytics-dashboard';
import { Lock } from 'lucide-react';
import AccountingUpsellBanner from '@/components/accounting/accounting-upsell-banner';

export const metadata: Metadata = {
  title: 'Financial Analytics',
};

const AdminAnalyticsPage = async () => {
  await requireAdmin();

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success) {
    throw new Error(landlordResult.message || 'Unable to determine landlord');
  }
  const landlord = landlordResult.landlord;

  // Gate: only roles with view_financials permission can see this page
  const userRole = await getCurrentUserTeamRole(landlord.id);
  const canViewFinancials =
    userRole.isOwner ||
    (userRole.permissions as string[]).includes('view_financials');

  if (!canViewFinancials) {
    return (
      <main className="w-full px-4 py-10">
        <div className="max-w-lg mx-auto text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
            <Lock className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-black">Access Restricted</h1>
          <p className="text-gray-500 text-sm">
            Your role does not have permission to view financial analytics.
            Contact your account owner to request access.
          </p>
        </div>
      </main>
    );
  }

  const gate = await getAccountingGateStatus(landlord.id);
  const { tier } = gate;

  return (
    <main className='w-full'>
      <div className='max-w-7xl space-y-6'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Financial Analytics</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Track your property performance, ROI, and generate comprehensive financial reports.
          </p>
        </div>

        {/* Contextual upsell banners — always show users what's above them */}
        {tier === 'starter' && (
          <AccountingUpsellBanner
            currentTier='starter'
            message='Upgrade to Pro to unlock the full accounting suite: P&L, Balance Sheet, Tenant Ledger, Owner Statements, AR Aging, and Bank Reconciliation.'
            upgradeHref='/admin/settings/subscription?upgrade=pro'
            upgradeLabel='Unlock full accounting — $99/mo'
          />
        )}
        {tier === 'pro' && (
          <AccountingUpsellBanner
            currentTier='pro'
            message='Upgrade to Enterprise to unlock Journal Entries, AP/Bills management, Budget vs Actual, Depreciation Wizard, and Schedule E Tax Export.'
            upgradeHref='/admin/settings/subscription?upgrade=enterprise'
            upgradeLabel='Unlock enterprise tools — $199/mo'
          />
        )}

        <AnalyticsDashboard landlordId={landlord.id} />
      </div>
    </main>
  );
};

export default AdminAnalyticsPage;
