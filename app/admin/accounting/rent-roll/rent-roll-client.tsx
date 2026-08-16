'use client';

import React from 'react';
import ReportShell from '../_components/report-shell';
import { fmtCurrency, fmtDate, fmtPct } from '../_components/format';

interface RentRollRow {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitLabel: string;
  tenantId: string | null;
  tenantName: string | null;
  leaseId: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  status: 'occupied' | 'vacant' | 'notice';
  marketRent: number;
  actualRent: number;
  balanceOwed: number;
  lastPaymentAt: string | null;
}

interface RentRollResponse {
  rows: RentRollRow[];
  summary: {
    totalUnits: number;
    occupied: number;
    occupancyRate: number;
    totalActualRent: number;
    totalMarketRent: number;
    rentUpside: number;
    totalBalanceOwed: number;
  };
  asOf: string;
}

const statusBadge: Record<RentRollRow['status'], string> = {
  occupied: 'bg-emerald-100 text-emerald-700',
  vacant: 'bg-gray-100 text-gray-600',
  notice: 'bg-amber-100 text-amber-700',
};

export default function RentRollClient({ landlordId }: { landlordId: string }) {
  return (
    <ReportShell
      landlordId={landlordId}
      title='Rent Roll'
      subtitle='A per-unit snapshot of what you are charging, who is in there, and what they owe right now.'
      help={{
        summary: 'A per-unit status board: market rent vs. what you are actually charging, occupancy, and any balance tenants still owe.',
        whatItShows: 'One row per unit in your portfolio. For each one: who the tenant is, their lease dates, whether it is occupied or vacant, the market-rate rent for that unit, the rent you are actually collecting, and any unpaid balance the tenant owes.',
        whenToUse: 'Use this when you are planning rent increases (compare market to actual), deciding whether to invest in a property (look at vacancy + balance owed), or pulling a snapshot for a bank, investor, or insurance company.',
        tips: [
          '"Upside" in the Market card means how much more you would collect per month if every unit rented at market — useful for projecting growth.',
          'A vacant unit shows market rent in the Actual column at $0, which is why actual rent can look low. That is expected.',
          'For the "this month\'s collection" view, use the Rents Overview page instead — it focuses on what came in this month, not point-in-time status.',
        ],
      }}
      buildUrl={() => `/api/admin/accounting/rent-roll?landlordId=${landlordId}`}
    >
      {({ data }) => {
        const r = data as RentRollResponse;
        if (!r?.rows?.length) {
          return (
            <div className='rounded-lg border border-gray-200 bg-white p-8 text-center'>
              <p className='text-sm text-gray-700 font-medium'>No properties or units found.</p>
              <p className='text-xs text-gray-500 mt-2 max-w-md mx-auto'>
                Add a property and at least one unit in the Properties section, and they will show up here automatically.
              </p>
            </div>
          );
        }
        const { summary } = r;
        return (
          <div className='space-y-6'>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              <div className='bg-white border border-gray-200 rounded-lg p-3'>
                <p className='text-[10px] text-gray-500 uppercase tracking-wide'>Units</p>
                <p className='text-xl font-bold mt-0.5'>{summary.totalUnits}</p>
                <p className='text-xs text-gray-500'>{summary.occupied} occupied · {fmtPct(summary.occupancyRate)}</p>
              </div>
              <div className='bg-white border border-gray-200 rounded-lg p-3'>
                <p className='text-[10px] text-gray-500 uppercase tracking-wide'>Actual Rent</p>
                <p className='text-xl font-bold mt-0.5 text-emerald-700'>{fmtCurrency(summary.totalActualRent)}</p>
                <p className='text-xs text-gray-500'>/mo</p>
              </div>
              <div className='bg-white border border-gray-200 rounded-lg p-3'>
                <p className='text-[10px] text-gray-500 uppercase tracking-wide'>Market Rent</p>
                <p className='text-xl font-bold mt-0.5 text-gray-700'>{fmtCurrency(summary.totalMarketRent)}</p>
                <p className='text-xs text-gray-500'>Upside: {fmtCurrency(summary.rentUpside)}</p>
              </div>
              <div className='bg-white border border-gray-200 rounded-lg p-3'>
                <p className='text-[10px] text-gray-500 uppercase tracking-wide'>Balance Owed</p>
                <p className={`text-xl font-bold mt-0.5 ${summary.totalBalanceOwed > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {fmtCurrency(summary.totalBalanceOwed)}
                </p>
              </div>
            </div>

            <div className='bg-white border border-gray-200 rounded-lg overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 text-gray-600 text-xs uppercase tracking-wide'>
                  <tr>
                    <th className='text-left px-4 py-2.5'>Property</th>
                    <th className='text-left px-4 py-2.5'>Unit</th>
                    <th className='text-left px-4 py-2.5'>Tenant</th>
                    <th className='text-left px-4 py-2.5'>Status</th>
                    <th className='text-right px-4 py-2.5'>Market</th>
                    <th className='text-right px-4 py-2.5'>Actual</th>
                    <th className='text-right px-4 py-2.5'>Owed</th>
                    <th className='text-left px-4 py-2.5'>Last Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.unitId} className='border-t border-gray-100 hover:bg-gray-50/50'>
                      <td className='px-4 py-2'>{row.propertyName}</td>
                      <td className='px-4 py-2 font-medium'>{row.unitLabel}</td>
                      <td className='px-4 py-2 text-gray-700'>{row.tenantName ?? <span className='text-gray-400'>—</span>}</td>
                      <td className='px-4 py-2'>
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${statusBadge[row.status]}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className='px-4 py-2 text-right tabular-nums'>{fmtCurrency(row.marketRent)}</td>
                      <td className='px-4 py-2 text-right tabular-nums font-medium'>{fmtCurrency(row.actualRent)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums font-medium ${row.balanceOwed > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {fmtCurrency(row.balanceOwed)}
                      </td>
                      <td className='px-4 py-2 text-gray-600 text-xs'>{row.lastPaymentAt ? fmtDate(row.lastPaymentAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    </ReportShell>
  );
}
