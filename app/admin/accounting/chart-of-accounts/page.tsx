import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import AccountingHelp from '../_components/accounting-help';
import ChartOfAccountsClient from './chart-of-accounts-client';

export const metadata: Metadata = { title: 'Chart of Accounts' };

export default async function ChartOfAccountsPage() {
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
    return <AccountingUpsellPage feature='chart-of-accounts' currentTier={gate.tier} />;
  }

  return (
    <main className='w-full space-y-5'>
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Chart of Accounts</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Your GL accounts — add custom accounts, map tax lines, deactivate unused ones.
          </p>
        </div>
      </div>

      <AccountingHelp block={{
        summary: 'Every dollar goes to a GL account. This is the master list of all accounts in your books.',
        whatItShows: 'All 1000–5999 accounts in your chart: assets, liabilities, equity, income, and expenses. System accounts are pre-configured and match IRS Schedule E lines. You can add custom accounts (e.g. "Pool Maintenance") and deactivate ones you don\'t use.',
        whenToUse: 'Set this up once when you start. Add new accounts as your property types grow. System accounts (like "Rental Income" or "Repairs") should not be renamed — they drive the tax export.',
        tips: [
          'Keep codes in the right range: 1000s = assets, 2000s = liabilities, 3000s = equity, 4000s = income, 5000s = expenses.',
          'Assign a Tax Line (e.g. sch_e_14) to any custom account you want included in the Schedule E export.',
          'Deactivating an account hides it from the picker but keeps all its history intact.',
        ],
      }} />

      <ChartOfAccountsClient landlordId={landlord.id} />
    </main>
  );
}
