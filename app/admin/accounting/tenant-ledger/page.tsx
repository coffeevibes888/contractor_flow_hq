import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { prisma } from '@/db/prisma';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import AccountingHelp from '../_components/accounting-help';

export const metadata: Metadata = { title: 'Tenant Ledger' };

export default async function TenantLedgerPage() {
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
  if (!gate.canViewLedger) {
    return <AccountingUpsellPage feature='tenant-ledger' currentTier={gate.tier} />;
  }

  // Load all active leases with their tenant ledger summary
  const leases = await prisma.lease.findMany({
    where: {
      unit: { property: { landlordId: landlord.id } },
      status: { in: ['active', 'ended'] },
    },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      unit: { select: { name: true, property: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  // Get the latest running balance per lease from the ledger
  const ledgerSummaries = await prisma.tenantLedgerEntry.groupBy({
    by: ['leaseId', 'tenantId'],
    where: {
      landlordId: landlord.id,
    },
    _count: { id: true },
    _max: { postedAt: true },
    orderBy: { _max: { postedAt: 'desc' } },
  });

  // Get the last entry per lease for the running balance
  const leaseIds = leases.map((l) => l.id);
  const lastEntries = leaseIds.length > 0
    ? await Promise.all(
        leaseIds.map((lid) =>
          prisma.tenantLedgerEntry.findFirst({
            where: { leaseId: lid },
            orderBy: { postedAt: 'desc' },
            select: { leaseId: true, runningBalance: true, postedAt: true },
          })
        )
      )
    : [];

  const balanceByLease = new Map(
    lastEntries.filter(Boolean).map((e) => [e!.leaseId, Number(e!.runningBalance)])
  );
  const entryCountByLease = new Map(
    ledgerSummaries.map((s) => [s.leaseId, s._count.id])
  );

  const totalOutstanding = Array.from(balanceByLease.values())
    .filter((b) => b > 0)
    .reduce((sum, b) => sum + b, 0);

  const totalCredit = Array.from(balanceByLease.values())
    .filter((b) => b < 0)
    .reduce((sum, b) => sum + Math.abs(b), 0);

  return (
    <main className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Tenant Ledger</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Per-tenant charge and payment history with running balance.
          </p>
        </div>
      </div>

      <AccountingHelp block={{ summary: 'Per-tenant charge and payment history with running balance.', whatItShows: 'Every charge (rent, late fees) and payment posted for each lease, plus a running balance. Positive = tenant owes you. Negative = they have a credit.', whenToUse: 'Use to see which tenants have outstanding balances, verify payments were applied correctly, or prepare for a security deposit dispute.' }} defaultOpen={false} />

      {/* Summary KPIs */}
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs text-gray-500 font-medium'>Total Outstanding</p>
          <p className='text-xl font-bold text-red-600 mt-1'>{formatCurrency(totalOutstanding)}</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>Owed by tenants</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs text-gray-500 font-medium'>Total Credits</p>
          <p className='text-xl font-bold text-emerald-600 mt-1'>{formatCurrency(totalCredit)}</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>Tenant overpayments</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-xs text-gray-500 font-medium'>Active Leases</p>
          <p className='text-xl font-bold text-gray-900 mt-1'>{leases.filter(l => l.status === 'active').length}</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>With ledger entries</p>
        </div>
      </div>

      {/* Ledger table */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {leases.length === 0 ? (
          <div className='p-10 text-center'>
            <p className='text-sm text-gray-500'>No leases found. Add tenants and leases to start tracking the ledger.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Tenant</th>
                  <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Property · Unit</th>
                  <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Status</th>
                  <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Rent/mo</th>
                  <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Entries</th>
                  <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Balance</th>
                  <th className='px-4 py-3'></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50'>
                {leases.map((lease) => {
                  const balance = balanceByLease.get(lease.id) ?? null;
                  const entries = entryCountByLease.get(lease.id) ?? 0;
                  const unitLabel = [lease.unit?.property?.name, lease.unit?.name].filter(Boolean).join(' · ');
                  return (
                    <tr key={lease.id} className='hover:bg-gray-50/50 transition-colors'>
                      <td className='px-4 py-3'>
                        <p className='font-medium text-gray-900 text-xs'>{lease.tenant?.name || '—'}</p>
                        <p className='text-[10px] text-gray-400'>{lease.tenant?.email || ''}</p>
                      </td>
                      <td className='px-4 py-3 text-xs text-gray-600'>{unitLabel || '—'}</td>
                      <td className='px-4 py-3'>
                        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          lease.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {lease.status}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-right text-xs font-medium text-gray-700'>
                        {formatCurrency(Number(lease.rentAmount))}
                      </td>
                      <td className='px-4 py-3 text-right text-xs text-gray-500'>{entries}</td>
                      <td className='px-4 py-3 text-right'>
                        {balance === null ? (
                          <span className='text-xs text-gray-400'>—</span>
                        ) : (
                          <span className={`text-xs font-bold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <Link
                          href={`/admin/accounting/tenant-ledger/${lease.id}`}
                          className='text-[10px] font-medium text-violet-600 hover:text-violet-700 hover:underline'
                        >
                          View detail →
                        </Link>
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
