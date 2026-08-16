import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default async function UserProfileRentReceiptsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id as string;

  const lease = await prisma.lease.findFirst({
    where: {
      tenantId: userId,
      status: { in: ['active', 'pending_signature'] },
    },
    select: {
      id: true,
      status: true,
      rentAmount: true,
      billingDayOfMonth: true,
      startDate: true,
      endDate: true,
      tenantSignedAt: true,
      landlordSignedAt: true,
      unit: {
        select: {
          name: true,
          property: { select: { name: true } },
        },
      },
      rentPayments: {
        orderBy: { dueDate: 'desc' },
      },
    },
  });

  const pendingPayments = (lease?.rentPayments || []).filter(
    (p) => p.status === 'pending' || p.status === 'overdue'
  );

  const pastPayments = (lease?.rentPayments || []).filter((p) => p.status === 'paid');

  return (
    <div className='w-full min-h-screen px-4 py-8 md:px-8'>
      <div className='max-w-5xl mx-auto space-y-8'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-3xl md:text-4xl font-bold text-slate-800'>Payment History</h1>
            <p className='text-sm md:text-base text-slate-600 mt-1'>Your past rent payments and receipts.</p>
          </div>
          {pendingPayments.length > 0 && (
            <Link
              href='/user/pay'
              className='inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-semibold px-5 py-2.5 text-sm shadow-lg shadow-indigo-500/25 transition-all'
            >
              Pay Rent Now →
            </Link>
          )}
        </div>

        {!lease ? (
          <div className='rounded-xl border border-white/10 bg-gradient-to-r from-cyan-700 to-cyan-700 px-6 py-8 shadow-lg text-sm text-slate-300'>
            We don&apos;t see an active lease linked to your account yet. Please contact management if you believe this is a mistake.
          </div>
        ) : (
          <>
            {/* Lease Summary */}
            <div className='rounded-xl border border-white/10 bg-gradient-to-r from-cyan-700 to-cyan-700 p-6 shadow-lg'>
              <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                <div>
                  <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1'>Unit</p>
                  <p className='text-base font-semibold text-white'>
                    {lease.unit.property?.name || 'Property'} • {lease.unit.name}
                  </p>
                </div>
                <div className='md:text-right'>
                  <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1'>Monthly Rent</p>
                  <p className='text-xl font-bold text-white'>{formatCurrency(lease.rentAmount.toString())}</p>
                </div>
              </div>
              <div className='grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10 text-xs text-slate-300'>
                <div>
                  <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1'>Billing Day</p>
                  <p>Day {lease.billingDayOfMonth}</p>
                </div>
                <div>
                  <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1'>Lease Period</p>
                  <p>
                    {new Date(lease.startDate).toLocaleDateString()} –{' '}
                    {lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'Ongoing'}
                  </p>
                </div>
                <div>
                  <p className='text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1'>Status</p>
                  <p className='capitalize'>{lease.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Past Payments */}
            <div className='rounded-xl border border-white/10 bg-gradient-to-r from-cyan-700 to-cyan-700 p-6 shadow-lg'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-base font-semibold text-white'>Past Payments</h2>
                <span className='text-xs text-slate-400'>
                  {pastPayments.length} payment{pastPayments.length !== 1 ? 's' : ''}
                </span>
              </div>

              {pastPayments.length === 0 ? (
                <p className='text-sm text-slate-400 py-4 text-center'>No past payments recorded yet.</p>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='min-w-full text-xs'>
                    <thead>
                      <tr className='border-b border-white/10'>
                        <th className='pb-2 text-left font-semibold text-slate-400 uppercase tracking-widest text-[10px]'>Paid On</th>
                        <th className='pb-2 text-left font-semibold text-slate-400 uppercase tracking-widest text-[10px]'>For</th>
                        <th className='pb-2 text-left font-semibold text-slate-400 uppercase tracking-widest text-[10px]'>Amount</th>
                        <th className='pb-2 text-left font-semibold text-slate-400 uppercase tracking-widest text-[10px]'>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastPayments.map((p) => (
                        <tr key={p.id} className='border-t border-white/10'>
                          <td className='py-2.5 pr-4 text-slate-300'>
                            {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                          </td>
                          <td className='py-2.5 pr-4 text-slate-300'>
                            {new Date(p.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                          </td>
                          <td className='py-2.5 pr-4 text-slate-300 font-medium'>
                            {formatCurrency(p.amount.toString())}
                          </td>
                          <td className='py-2.5'>
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300'>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
