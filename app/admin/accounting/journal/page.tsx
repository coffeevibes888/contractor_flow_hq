import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { prisma } from '@/db/prisma';
import { ensureChartOfAccounts } from '@/lib/accounting/gl';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import { formatCurrency } from '@/lib/utils';
import AccountingHelp from '../_components/accounting-help';
import NewJournalEntryButton from './new-journal-entry-button';

export const metadata: Metadata = { title: 'Journal Entries' };

const SOURCE_LABELS: Record<string, string> = {
  rent_payment:       'Rent Payment',
  expense:            'Expense',
  maintenance:        'Maintenance',
  owner_distribution: 'Owner Distribution',
  owner_payout:       'Owner Payout',
  opening_balance:    'Opening Balance',
  manual_adjustment:  'Manual Adjustment',
  system:             'System',
  tenant_credit:      'Tenant Credit',
};

export default async function JournalPage() {
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
    return <AccountingUpsellPage feature='journal' currentTier={gate.tier} />;
  }

  // Ensure accounts exist so the new-entry form has options to show
  await ensureChartOfAccounts(landlord.id).catch(() => {});

  const accounts = await prisma.chartOfAccount.findMany({
    where: { landlordId: landlord.id, isActive: true },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, type: true },
  });

  const entries = await prisma.journalEntry.findMany({
    where: { landlordId: landlord.id },
    orderBy: { effectiveDate: 'desc' },
    take: 250,
    include: {
      lines: {
        include: {
          account: { select: { code: true, name: true, type: true } },
        },
      },
      period: { select: { startDate: true, endDate: true, status: true } },
    },
  });

  const totalDebits = entries.reduce((sum, e) =>
    sum + e.lines.reduce((s, l) => s + Number(l.debit), 0), 0
  );

  return (
    <main className='w-full space-y-5'>
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Journal Entries</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            View, post, and void entries in the general ledger.
          </p>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          <span className='text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full'>
            {entries.length} entries shown
          </span>
          <NewJournalEntryButton landlordId={landlord.id} accounts={accounts} />
        </div>
      </div>

      <AccountingHelp block={{ summary: 'Every financial event as a double-entry record.', whatItShows: 'Every rent payment, expense, and adjustment as a debit/credit pair. Debits always equal credits so the books stay balanced.', whenToUse: 'Use to trace where a dollar went, verify a payment was posted correctly, or review all activity in a period before closing it.' }} defaultOpen={false} />

      {/* KPIs */}
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs text-gray-500 font-medium'>Total Entries</p>
          <p className='text-xl font-bold text-gray-900 mt-1'>{entries.length.toLocaleString()}</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>Last 250 shown</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs text-gray-500 font-medium'>Total Activity</p>
          <p className='text-xl font-bold text-gray-900 mt-1'>{formatCurrency(totalDebits)}</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>Sum of all debits</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs text-gray-500 font-medium'>Sources</p>
          <p className='text-xl font-bold text-gray-900 mt-1'>
            {new Set(entries.map((e) => e.source)).size}
          </p>
          <p className='text-[10px] text-gray-400 mt-0.5'>Unique entry types</p>
        </div>
      </div>

      {/* Entries table */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {entries.length === 0 ? (
          <div className='p-10 text-center'>
            <p className='text-sm text-gray-500'>No journal entries yet. Run the seed script or record rent payments and expenses to generate entries.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Date</th>
                  <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Source</th>
                  <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Memo</th>
                  <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Period</th>
                  <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Debits</th>
                  <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Credits</th>
                  <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Lines</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50'>
                {entries.map((entry) => {
                  const debitTotal = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
                  const creditTotal = entry.lines.reduce((s, l) => s + Number(l.credit), 0);
                  const periodLabel = entry.period
                    ? new Date(entry.period.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : '—';
                  const periodStatus = entry.period?.status;
                  const memo = (entry.memo ?? '').replace(/^ENT_DEMO_/, '');

                  return (
                    <tr key={entry.id} className='hover:bg-gray-50/50 transition-colors'>
                      <td className='px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap'>
                        {new Date(entry.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className='px-4 py-2.5'>
                        <span className='inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700'>
                          {SOURCE_LABELS[entry.source] ?? entry.source}
                        </span>
                      </td>
                      <td className='px-4 py-2.5 text-xs text-gray-600 max-w-[220px] truncate'>
                        {memo || '—'}
                      </td>
                      <td className='px-4 py-2.5 text-xs text-gray-500'>
                        <span className='inline-flex items-center gap-1'>
                          {periodLabel}
                          {periodStatus === 'closed' && (
                            <span className='text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full'>closed</span>
                          )}
                          {periodStatus === 'locked' && (
                            <span className='text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full'>locked</span>
                          )}
                        </span>
                      </td>
                      <td className='px-4 py-2.5 text-right text-xs font-medium text-gray-800'>
                        {formatCurrency(debitTotal)}
                      </td>
                      <td className='px-4 py-2.5 text-right text-xs font-medium text-gray-800'>
                        {formatCurrency(creditTotal)}
                      </td>
                      <td className='px-4 py-2.5 text-right text-xs text-gray-400'>
                        {entry.lines.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
