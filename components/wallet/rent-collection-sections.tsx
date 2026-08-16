'use client';

/**
 * Rent collection sections under the core Wallet UI.
 *
 *   - This-Month / In-Transit / Total-Received KPI cards
 *   - Recent rent payments table (move-in payments consolidated)
 *
 * Treasury wallet onboarding (the "Start verification" banner at the top
 * of the wallet) covers all KYC for receiving rent — there is no separate
 * Stripe Connect Express onboarding here. Rent flows directly into the
 * Treasury account whose routing/account numbers appear in the wallet's
 * "Add Funds" / account-number panels.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Building2,
} from 'lucide-react';
import {
  consolidateMoveInPayments,
  getStatusLabel,
  type GroupedPayment,
} from '@/lib/utils/payment-grouping';

export interface RentPayment {
  id: string;
  amount: number;
  status: string;
  paidAt: string | null;
  paymentMethod: string | null;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  estimatedArrival: string | null;
  metadata?: Record<string, unknown> | null;
  dueDate?: string | null;
}

interface Props {
  recentPayments: RentPayment[];
  totalReceived: number;
  pendingAmount: number;
  thisMonthAmount: number;
}

const usd = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

function StatusBadge({
  status,
  estimatedArrival,
}: {
  status: string;
  estimatedArrival: string | null;
}) {
  const label = getStatusLabel(status);
  switch (status) {
    case 'paid':
      return (
        <div className='text-right'>
          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700'>
            <CheckCircle2 className='h-3 w-3' />
            Deposited
          </span>
        </div>
      );
    case 'processing':
      return (
        <div className='text-right'>
          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700'>
            <Clock className='h-3 w-3' />
            {label}
          </span>
          {estimatedArrival && (
            <p className='text-xs text-slate-500 mt-1'>Est. {estimatedArrival}</p>
          )}
        </div>
      );
    case 'pending':
      return (
        <div className='text-right'>
          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700'>
            <Clock className='h-3 w-3' />
            {label}
          </span>
        </div>
      );
    case 'failed':
      return (
        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'>
          <AlertCircle className='h-3 w-3' />
          Failed
        </span>
      );
    default:
      return (
        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700'>
          {label}
        </span>
      );
  }
}

function PaymentMethodIcon({ method }: { method: string | null }) {
  if (method === 'us_bank_account' || method === 'ach') {
    return <Building2 className='h-5 w-5 text-slate-500' />;
  }
  return <CreditCard className='h-5 w-5 text-slate-500' />;
}

export function RentCollectionSections({
  recentPayments,
  totalReceived,
  pendingAmount,
  thisMonthAmount,
}: Props) {
  return (
    <div className='space-y-6 pt-4'>
      {/* KPI cards */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0'>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-emerald-100 text-sm font-medium'>This Month</p>
                <p className='text-3xl font-bold mt-1'>{usd(thisMonthAmount)}</p>
                <p className='text-emerald-200 text-xs mt-1'>Rent collected</p>
              </div>
              <div className='h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center'>
                <DollarSign className='h-6 w-6' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-slate-500 text-sm font-medium'>In Transit</p>
                <p className='text-2xl font-bold mt-1 text-blue-600'>
                  {usd(pendingAmount)}
                </p>
                <p className='text-slate-400 text-xs mt-1'>Processing — tenant paid, arriving soon</p>
              </div>
              <div className='h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center'>
                <Clock className='h-6 w-6 text-blue-600' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-slate-500 text-sm font-medium'>Total Received</p>
                <p className='text-2xl font-bold mt-1'>{usd(totalReceived)}</p>
                <p className='text-slate-400 text-xs mt-1'>All time</p>
              </div>
              <div className='h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center'>
                <TrendingUp className='h-6 w-6 text-violet-600' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent rent payments */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Recent Rent Payments</CardTitle>
          <CardDescription>Rent payments from your tenants</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className='text-center py-12 text-slate-500'>
              <DollarSign className='h-12 w-12 mx-auto mb-3 opacity-30' />
              <p className='text-sm font-medium'>No payments yet</p>
              <p className='text-xs mt-1'>
                When tenants pay rent, payments will appear here
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              {consolidateMoveInPayments(
                recentPayments.map((p) => ({
                  id: p.id,
                  amount: p.amount,
                  status: p.status,
                  dueDate: p.dueDate || undefined,
                  paidAt: p.paidAt,
                  metadata: p.metadata,
                  tenantName: p.tenantName,
                  propertyName: p.propertyName,
                  unitName: p.unitNumber,
                  paymentMethod: p.paymentMethod,
                }))
              ).map((grouped: GroupedPayment) => (
                <div
                  key={grouped.id}
                  className='flex items-center justify-between p-4 rounded-lg border bg-slate-50/50'
                >
                  <div className='flex items-center gap-4'>
                    <div className='h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center'>
                      <PaymentMethodIcon method={grouped.paymentMethod || null} />
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <p className='font-semibold text-sm'>{usd(grouped.amount)}</p>
                        {grouped.type === 'move_in' && (
                          <span className='text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700'>
                            Move-in
                          </span>
                        )}
                      </div>
                      <p className='text-sm text-slate-600'>{grouped.tenantName}</p>
                      <div className='flex items-center gap-2 text-xs text-slate-500 mt-0.5'>
                        <span>{grouped.propertyName}</span>
                        {grouped.unitName && (
                          <>
                            <span>•</span>
                            <span>Unit {grouped.unitName}</span>
                          </>
                        )}
                        {grouped.paidAt && (
                          <>
                            <span>•</span>
                            <span>
                              {new Date(grouped.paidAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                      {grouped.type === 'move_in' && grouped.breakdown && (
                        <div className='text-[10px] text-slate-500 mt-1'>
                          {grouped.breakdown.firstMonth && (
                            <span>1st mo: {usd(grouped.breakdown.firstMonth)}</span>
                          )}
                          {grouped.breakdown.lastMonth && (
                            <span> • Last mo: {usd(grouped.breakdown.lastMonth)}</span>
                          )}
                          {grouped.breakdown.securityDeposit && (
                            <span>
                              {' '}
                              • Deposit: {usd(grouped.breakdown.securityDeposit)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={grouped.status} estimatedArrival={null} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
