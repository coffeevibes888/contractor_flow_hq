'use client';

/**
 * Contractor earnings sections under the core Wallet UI.
 *
 *   - Total Earnings / Pending Payout / Total Paid KPIs
 *   - Job-level payment history
 *
 * Treasury wallet onboarding (the "Start verification" banner at the top
 * of the wallet) covers all KYC for receiving payments. There is no
 * separate Stripe Connect Express onboarding here — payments arrive in
 * the Treasury wallet and Cash Out moves them to a linked external bank.
 */

import { Wallet, DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { OnboardingSuccessAlert } from '@/components/contractor/onboarding-success-alert';

const usd = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

export interface ContractorPaymentRow {
  id: string;
  title: string;
  amount: number;
  status: string;
  completedAt: string | null;
  propertyName: string;
  landlordName: string;
}

interface Props {
  showOnboardingSuccess?: boolean;
  totalEarnings: number;
  pendingPayout: number;
  totalPaid: number;
  payments: ContractorPaymentRow[];
}

export function ContractorEarningsSections({
  showOnboardingSuccess = false,
  totalEarnings,
  pendingPayout,
  totalPaid,
  payments,
}: Props) {
  return (
    <div className='space-y-6 pt-4'>
      {showOnboardingSuccess && <OnboardingSuccessAlert />}

      {/* KPI cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-blue-400 to-indigo-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Total Earnings</p>
              <p className='text-2xl font-bold text-gray-900 mt-0.5'>
                {usd(totalEarnings)}
              </p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white'>
              <TrendingUp className='h-4 w-4' />
            </div>
          </div>
        </div>

        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-amber-400 to-orange-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Pending Payout</p>
              <p className='text-2xl font-bold text-amber-600 mt-0.5'>
                {usd(pendingPayout)}
              </p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white'>
              <Wallet className='h-4 w-4' />
            </div>
          </div>
        </div>

        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-emerald-400 to-cyan-400 opacity-10 rounded-bl-full' />
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-xs text-gray-500 font-medium'>Total Paid</p>
              <p className='text-2xl font-bold text-emerald-600 mt-0.5'>
                {usd(totalPaid)}
              </p>
            </div>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white'>
              <DollarSign className='h-4 w-4' />
            </div>
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>Payment History</h3>
          <span className='text-xs text-gray-400'>{payments.length} orders</span>
        </div>
        {payments.length === 0 ? (
          <div className='p-10 text-center'>
            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center'>
              <Wallet className='h-7 w-7 text-gray-300' />
            </div>
            <h3 className='text-base font-bold text-gray-800 mb-1'>
              No payments yet
            </h3>
            <p className='text-sm text-gray-500'>
              Complete work orders to start earning
            </p>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {payments.map((order) => (
              <div key={order.id} className='flex items-center gap-3 px-4 py-3'>
                <div className='h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0'>
                  <Building2 className='h-4 w-4 text-blue-500' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-semibold text-gray-800 truncate'>
                    {order.title}
                  </p>
                  <p className='text-[10px] text-gray-500'>
                    {order.propertyName} · {order.landlordName}
                  </p>
                  <p className='text-[10px] text-gray-400'>
                    {order.completedAt
                      ? new Date(order.completedAt).toLocaleDateString()
                      : 'Pending'}
                  </p>
                </div>
                <div className='text-right shrink-0'>
                  <p className='text-xs font-bold text-emerald-600'>
                    {usd(order.amount)}
                  </p>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      order.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {order.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
