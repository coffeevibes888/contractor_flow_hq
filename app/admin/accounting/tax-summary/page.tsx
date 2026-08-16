import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import AccountingHelp from '../_components/accounting-help';
import TaxSummaryClient from './tax-summary-client';

export const metadata: Metadata = { title: 'Schedule E / Tax Summary' };

export default async function TaxSummaryPage() {
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
    return <AccountingUpsellPage feature='tax-summary' currentTier={gate.tier} />;
  }

  return (
    <main className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Schedule E / Tax Summary</h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>GL balances mapped to IRS Schedule E lines — one click for your CPA.</p>
      </div>

      <AccountingHelp block={{
        summary: 'Maps your GL account balances directly to IRS Schedule E (Form 1040) lines for rental income and expenses.',
        whatItShows: 'Income and expense accounts organized by their IRS tax line. Total at the bottom is your net rental income / loss for the year.',
        whenToUse: 'Pull this at year-end and hand it to your CPA. It replaces the manual spreadsheet they\'d otherwise build from your records.',
        tips: [
          'Make sure every expense account has a Tax Line assigned in Chart of Accounts.',
          'Depreciation (Line 20) requires you to post depreciation entries via the Depreciation Wizard.',
          'This is a summary view — your CPA will still need source documents for any audit.',
        ],
      }} />

      <TaxSummaryClient landlordId={landlord.id} />
    </main>
  );
}
