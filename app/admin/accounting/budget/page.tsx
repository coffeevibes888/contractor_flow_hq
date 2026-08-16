import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import AccountingHelp from '../_components/accounting-help';
import BudgetClient from './budget-client';

export const metadata: Metadata = { title: 'Budget vs. Actual' };

export default async function BudgetPage() {
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
    return <AccountingUpsellPage feature='budget' currentTier={gate.tier} />;
  }

  return (
    <main className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Budget vs. Actual</h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Set monthly budgets per GL account and track variance in real time.</p>
      </div>

      <AccountingHelp block={{
        summary: 'Set a monthly spending target per account and see exactly where you\'re over or under.',
        whatItShows: 'Budget vs. actual side-by-side per account for the selected month. Progress bars show % of budget consumed. Red = over budget.',
        whenToUse: 'Set budgets at the start of each year or month. Review mid-month to catch overspending before it happens.',
        tips: [
          'Click any budget cell to edit — it saves instantly.',
          'Start with your biggest expense accounts: Repairs, Utilities, Insurance, Property Taxes.',
          'Compare to prior months to spot trends in your spending.',
        ],
      }} />

      <BudgetClient landlordId={landlord.id} />
    </main>
  );
}
