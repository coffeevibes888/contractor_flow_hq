import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import AccountingHelp from '../_components/accounting-help';
import BillsClient from './bills-client';

export const metadata: Metadata = { title: 'Bills & Accounts Payable' };

export default async function BillsPage() {
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
    return <AccountingUpsellPage feature='bills' currentTier={gate.tier} />;
  }

  return (
    <main className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Bills & Accounts Payable</h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Vendor bills from draft to payment — track every dollar you owe.</p>
      </div>

      <AccountingHelp block={{
        summary: 'Every vendor bill, utility charge, and service invoice — from receipt to payment.',
        whatItShows: 'All outstanding and historical bills. Status flows: Draft → Approved → Paid. Overdue bills are flagged automatically.',
        whenToUse: 'Use when you receive a vendor invoice. Mark it Approved when you\'re ready to pay, then Paid once sent. This keeps your AP Aging report accurate.',
        tips: [
          'Always enter a Due Date — it powers the overdue flag.',
          'Link a bill to a specific property for accurate per-property P&L.',
          'Use Draft status for bills you\'ve received but not yet authorized.',
        ],
      }} />

      <BillsClient landlordId={landlord.id} />
    </main>
  );
}
