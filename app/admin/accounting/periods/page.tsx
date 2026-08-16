import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import AccountingHelp from '../_components/accounting-help';
import PeriodsClient from './periods-client';

export const metadata: Metadata = { title: 'Fiscal Periods' };

export default async function PeriodsPage() {
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
    return <AccountingUpsellPage feature='periods' currentTier={gate.tier} />;
  }

  return (
    <main className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Fiscal Periods</h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Open, lock, and close accounting periods to protect finalized data.</p>
      </div>

      <AccountingHelp block={{
        summary: 'Periods let you protect past months so no one accidentally posts to last month\'s books.',
        whatItShows: 'Every accounting period (month) and its status: open (entries can post), locked (admin override only), or closed (permanent — no changes allowed).',
        whenToUse: 'Lock a period at month-end after you\'ve reviewed the P&L. Close it after taxes are filed. This is your books\' version of a hard stop.',
        tips: [
          'Lock periods monthly — your accountant will thank you.',
          'Closed is permanent. Only close once you\'re 100% done with a month.',
          'Open multiple periods at once if you need to backfill entries.',
        ],
      }} />

      <PeriodsClient landlordId={landlord.id} />
    </main>
  );
}
