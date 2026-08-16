'use client';

import React, { useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Download, Calendar, Filter, CreditCard, Wallet, PieChart,
  ChevronRight, Building2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const monthlyEarnings = [
  { month: 'Jan', gross: 8400, fees: 1260, net: 7140, bookings: 24 },
  { month: 'Feb', gross: 9600, fees: 1440, net: 8160, bookings: 28 },
  { month: 'Mar', gross: 12200, fees: 1830, net: 10370, bookings: 34 },
  { month: 'Apr', gross: 14800, fees: 2220, net: 12580, bookings: 41 },
  { month: 'May', gross: 16500, fees: 2475, net: 14025, bookings: 46 },
  { month: 'Jun', gross: 19200, fees: 2880, net: 16320, bookings: 52 },
  { month: 'Jul', gross: 22400, fees: 3360, net: 19040, bookings: 58 },
  { month: 'Aug', gross: 20100, fees: 3015, net: 17085, bookings: 54 },
  { month: 'Sep', gross: 15800, fees: 2370, net: 13430, bookings: 42 },
  { month: 'Oct', gross: 13200, fees: 1980, net: 11220, bookings: 36 },
  { month: 'Nov', gross: 10400, fees: 1560, net: 8840, bookings: 29 },
  { month: 'Dec', gross: 14200, fees: 2130, net: 12070, bookings: 38 },
];

const recentPayouts = [
  { id: 'PAY-001', date: 'May 1, 2026', amount: 4250, method: 'Bank Transfer', status: 'completed' },
  { id: 'PAY-002', date: 'Apr 15, 2026', amount: 3800, method: 'Bank Transfer', status: 'completed' },
  { id: 'PAY-003', date: 'Apr 1, 2026', amount: 5100, method: 'Bank Transfer', status: 'completed' },
  { id: 'PAY-004', date: 'Mar 15, 2026', amount: 4600, method: 'Bank Transfer', status: 'completed' },
  { id: 'PAY-005', date: 'Mar 1, 2026', amount: 3950, method: 'Bank Transfer', status: 'completed' },
];

const propertyEarnings = [
  { name: 'Beachfront Villa', revenue: 42800, bookings: 122, avgRate: 350, occupancy: 92 },
  { name: 'Oceanview Suite', revenue: 33600, bookings: 98, avgRate: 275, occupancy: 87 },
  { name: 'Mountain Cabin', revenue: 27000, bookings: 90, avgRate: 225, occupancy: 76 },
  { name: 'Downtown Loft', revenue: 23400, bookings: 96, avgRate: 195, occupancy: 81 },
  { name: 'Lakeside Cottage', revenue: 15120, bookings: 58, avgRate: 210, occupancy: 68 },
  { name: 'Urban Studio', revenue: 11880, bookings: 66, avgRate: 165, occupancy: 72 },
];

export default function STREarningsPage() {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '12m' | 'ytd'>('12m');

  const totalGross = monthlyEarnings.reduce((a, m) => a + m.gross, 0);
  const totalNet = monthlyEarnings.reduce((a, m) => a + m.net, 0);
  const totalFees = monthlyEarnings.reduce((a, m) => a + m.fees, 0);
  const totalBookings = monthlyEarnings.reduce((a, m) => a + m.bookings, 0);

  return (
    <div className='w-full space-y-5'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-black'>Earnings</h1>
          <p className='text-xs text-gray-500'>Revenue, payouts, and financial performance</p>
        </div>
        <div className='flex items-center gap-2'>
          {(['30d', '90d', '12m', 'ytd'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : range === '12m' ? '12 Months' : 'YTD'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Gross Revenue</p>
            <DollarSign className='h-4 w-4 text-emerald-500' />
          </div>
          <p className='text-lg sm:text-xl font-bold text-gray-900 mt-1'>${totalGross.toLocaleString()}</p>
          <div className='flex items-center gap-1 mt-0.5'>
            <ArrowUpRight className='h-3 w-3 text-emerald-500' />
            <span className='text-[10px] font-semibold text-emerald-600'>+18.3%</span>
          </div>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Net Earnings</p>
            <Wallet className='h-4 w-4 text-blue-500' />
          </div>
          <p className='text-lg sm:text-xl font-bold text-gray-900 mt-1'>${totalNet.toLocaleString()}</p>
          <div className='flex items-center gap-1 mt-0.5'>
            <ArrowUpRight className='h-3 w-3 text-emerald-500' />
            <span className='text-[10px] font-semibold text-emerald-600'>+16.7%</span>
          </div>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Platform Fees</p>
            <CreditCard className='h-4 w-4 text-orange-500' />
          </div>
          <p className='text-lg sm:text-xl font-bold text-gray-900 mt-1'>${totalFees.toLocaleString()}</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>15% avg rate</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Total Bookings</p>
            <Calendar className='h-4 w-4 text-violet-500' />
          </div>
          <p className='text-lg sm:text-xl font-bold text-gray-900 mt-1'>{totalBookings}</p>
          <div className='flex items-center gap-1 mt-0.5'>
            <ArrowUpRight className='h-3 w-3 text-emerald-500' />
            <span className='text-[10px] font-semibold text-emerald-600'>+22.1%</span>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <h3 className='text-sm font-bold text-gray-800 mb-4'>Revenue Breakdown</h3>
        <div className='h-[280px]'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={monthlyEarnings}>
              <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
              <XAxis dataKey='month' tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey='net' name='Net Earnings' fill='#06B6D4' radius={[4, 4, 0, 0]} />
              <Bar dataKey='fees' name='Platform Fees' fill='#F59E0B' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Property Earnings */}
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <h3 className='text-sm font-bold text-gray-800 mb-3'>Earnings by Property</h3>
          <div className='space-y-2.5'>
            {propertyEarnings.map((prop) => (
              <div key={prop.name} className='flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50'>
                <div className='h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center'>
                  <Building2 className='h-4 w-4 text-cyan-600' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-semibold text-gray-800 truncate'>{prop.name}</p>
                  <p className='text-[10px] text-gray-500'>{prop.bookings} bookings · ${prop.avgRate}/night</p>
                </div>
                <span className='text-xs font-bold text-gray-800'>${prop.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payouts */}
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <h3 className='text-sm font-bold text-gray-800 mb-3'>Recent Payouts</h3>
          <div className='space-y-2'>
            {recentPayouts.map((payout) => (
              <div key={payout.id} className='flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 border border-gray-50'>
                <div className='flex items-center gap-2.5'>
                  <div className='h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center'>
                    <DollarSign className='h-4 w-4 text-emerald-600' />
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-gray-800'>{payout.id}</p>
                    <p className='text-[10px] text-gray-500'>{payout.date} · {payout.method}</p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-xs font-bold text-emerald-600'>${payout.amount.toLocaleString()}</p>
                  <span className='text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-600'>
                    {payout.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
