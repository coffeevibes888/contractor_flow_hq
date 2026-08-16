import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import AccountingHelp from '../_components/accounting-help';
import DepreciationClient from './depreciation-client';

export const metadata: Metadata = { title: 'Depreciation Wizard' };

export default async function DepreciationPage() {
  await requireAdmin();
  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success) throw new Error(landlordResult.message ?? 'Unable to determine landlord');
  const landlord = landlordResult.landlord;

  const userRole = await getCurrentUserTeamRole(landlord.id);
  const canView = userRole.isOwner || (userRole.permissions as string[]).includes('view_financials');
  if (!canView) {
    return (
      <main className='w-full px-4 py-10'>
        <div className='max-w-lg mx-auto text-center space-y-4'>
          <div className='mx-auto w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-red-400' />
          </div>
          <h1 className='text-xl font-semibold text-black'>Access Restricted</h1>
          <p className='text-gray-500 text-sm'>Your role does not have permission to view financial reports.</p>
        </div>
      </main>
    );
  }

  const gate = await getAccountingGateStatus(landlord.id);
  if (!gate.canManage) {
    return <AccountingUpsellPage feature='depreciation' currentTier={gate.tier} />;
  }

  return (
    <main className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Depreciation Wizard</h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Calculate and post straight-line depreciation for your properties — IRS Publication 527 compliant.</p>
      </div>

      <AccountingHelp block={{
        summary: 'Calculates monthly straight-line depreciation and posts the journal entry automatically.',
        whatItShows: 'A wizard to enter asset cost, salvage value, and useful life. The system calculates monthly depreciation and posts: Debit 5900 (Depreciation Expense) / Credit 1420 (Accumulated Depreciation).',
        whenToUse: 'Post once per month per property. Run it the last day of each month to match your fiscal period.',
        tips: [
          'IRS useful life: 27.5 years for residential rental, 39 years for commercial.',
          'Salvage value is almost always $0 for real estate.',
          'Depreciation shows up on your P&L (reducing income) and Schedule E Line 20.',
        ],
      }} />

      <DepreciationClient landlordId={landlord.id} />
    </main>
  );
}
