'use client';

import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart as PieChartIcon, Calendar, DollarSign,
  BedDouble, Users, Star, Globe, Building2, Clock,
  ChevronRight, Download, Filter,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

const occupancyData = [
  { month: 'Jan', occupancy: 62, adr: 215, revpar: 133 },
  { month: 'Feb', occupancy: 68, adr: 225, revpar: 153 },
  { month: 'Mar', occupancy: 74, adr: 240, revpar: 178 },
  { month: 'Apr', occupancy: 79, adr: 255, revpar: 201 },
  { month: 'May', occupancy: 84, adr: 262, revpar: 220 },
  { month: 'Jun', occupancy: 91, adr: 285, revpar: 259 },
  { month: 'Jul', occupancy: 95, adr: 310, revpar: 295 },
  { month: 'Aug', occupancy: 92, adr: 295, revpar: 271 },
  { month: 'Sep', occupancy: 82, adr: 260, revpar: 213 },
  { month: 'Oct', occupancy: 75, adr: 245, revpar: 184 },
  { month: 'Nov', occupancy: 65, adr: 220, revpar: 143 },
  { month: 'Dec', occupancy: 78, adr: 270, revpar: 211 },
];

const bookingLeadTime = [
  { range: '0-7 days', count: 45, pct: 18 },
  { range: '8-14 days', count: 62, pct: 25 },
  { range: '15-30 days', count: 78, pct: 31 },
  { range: '31-60 days', count: 42, pct: 17 },
  { range: '60+ days', count: 23, pct: 9 },
];

const guestOrigin = [
  { name: 'Domestic', value: 68, color: '#06B6D4' },
  { name: 'International', value: 32, color: '#8B5CF6' },
];

const stayLength = [
  { nights: '1-2', count: 85, pct: 28 },
  { nights: '3-4', count: 112, pct: 37 },
  { nights: '5-7', count: 72, pct: 24 },
  { nights: '8+', count: 31, pct: 11 },
];

export default function STRAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '12m'>('12m');

  return (
    <div className='w-full space-y-5'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-black'>Analytics</h1>
          <p className='text-xs text-gray-500'>Occupancy, revenue, and performance insights</p>
        </div>
        <div className='flex items-center gap-2'>
          {(['30d', '90d', '12m'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '12 Months'}
            </button>
          ))}
          <button className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'>
            <Download className='h-3 w-3' /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { title: 'Avg Occupancy', value: '79.6%', change: 5.2, icon: BedDouble, color: 'from-cyan-400 to-blue-400' },
          { title: 'ADR', value: '$257', change: 8.1, icon: DollarSign, color: 'from-emerald-400 to-teal-400' },
          { title: 'RevPAR', value: '$205', change: 12.3, icon: TrendingUp, color: 'from-violet-400 to-purple-400' },
          { title: 'Avg Stay', value: '3.8 nights', change: -1.2, icon: Clock, color: 'from-amber-400 to-orange-400' },
        ].map((kpi) => (
          <div key={kpi.title} className='rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <p className='text-[10px] text-gray-500 font-medium'>{kpi.title}</p>
              <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white`}>
                <kpi.icon className='h-4 w-4' />
              </div>
            </div>
            <p className='text-lg sm:text-xl font-bold text-gray-900 mt-1'>{kpi.value}</p>
            <div className='flex items-center gap-1 mt-0.5'>
              {kpi.change >= 0 ? (
                <ArrowUpRight className='h-3 w-3 text-emerald-500' />
              ) : (
                <ArrowDownRight className='h-3 w-3 text-red-500' />
              )}
              <span className={`text-[10px] font-semibold ${kpi.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {kpi.change >= 0 ? '+' : ''}{kpi.change}%
              </span>
              <span className='text-[10px] text-gray-400'>vs prev period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy & Revenue Chart */}
      <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <h3 className='text-sm font-bold text-gray-800 mb-4'>Occupancy, ADR &amp; RevPAR Trends</h3>
        <div className='h-[300px]'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={occupancyData}>
              <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
              <XAxis dataKey='month' tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis yAxisId='left' tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId='right' orientation='right' tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId='left' type='monotone' dataKey='occupancy' name='Occupancy %' stroke='#06B6D4' strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId='right' type='monotone' dataKey='adr' name='ADR ($)' stroke='#8B5CF6' strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId='right' type='monotone' dataKey='revpar' name='RevPAR ($)' stroke='#10B981' strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Booking Lead Time */}
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <h3 className='text-sm font-bold text-gray-800 mb-3'>Booking Lead Time</h3>
          <div className='space-y-2'>
            {bookingLeadTime.map((item) => (
              <div key={item.range} className='flex items-center gap-3'>
                <span className='text-[11px] text-gray-600 w-20'>{item.range}</span>
                <div className='flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center px-2'
                    style={{ width: `${item.pct}%` }}
                  >
                    {item.pct > 15 && <span className='text-[9px] text-white font-bold'>{item.count}</span>}
                  </div>
                </div>
                <span className='text-[11px] font-semibold text-gray-700 w-8 text-right'>{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stay Length Distribution */}
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <h3 className='text-sm font-bold text-gray-800 mb-3'>Stay Length Distribution</h3>
          <div className='space-y-2'>
            {stayLength.map((item) => (
              <div key={item.nights} className='flex items-center gap-3'>
                <span className='text-[11px] text-gray-600 w-16'>{item.nights} nights</span>
                <div className='flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-lg flex items-center px-2'
                    style={{ width: `${item.pct}%` }}
                  >
                    {item.pct > 15 && <span className='text-[9px] text-white font-bold'>{item.count}</span>}
                  </div>
                </div>
                <span className='text-[11px] font-semibold text-gray-700 w-8 text-right'>{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Guest Origin */}
      <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <h3 className='text-sm font-bold text-gray-800 mb-3'>Guest Origin</h3>
        <div className='flex items-center gap-8'>
          <div className='h-[140px] w-[140px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie data={guestOrigin} cx='50%' cy='50%' innerRadius={40} outerRadius={65} paddingAngle={3} dataKey='value'>
                  {guestOrigin.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className='space-y-3'>
            {guestOrigin.map((origin) => (
              <div key={origin.name} className='flex items-center gap-3'>
                <div className='h-3 w-3 rounded-full' style={{ backgroundColor: origin.color }} />
                <div>
                  <p className='text-xs font-semibold text-gray-800'>{origin.name}</p>
                  <p className='text-[10px] text-gray-500'>{origin.value}% of guests</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
