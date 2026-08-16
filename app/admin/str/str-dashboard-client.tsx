'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Home, Calendar, Users, MessageCircle, DollarSign, Sparkles,
  Globe, Star, TrendingUp, Building2, ArrowUpRight, ArrowDownRight,
  BedDouble, Clock, CheckCircle2, AlertTriangle, Wifi, MapPin,
  ChevronRight, Eye, Zap, BarChart3, PieChart,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
} from 'recharts';

// --- Mock Data ---
const revenueData = [
  { month: 'Jan', revenue: 4200, bookings: 12 },
  { month: 'Feb', revenue: 5100, bookings: 15 },
  { month: 'Mar', revenue: 6800, bookings: 19 },
  { month: 'Apr', revenue: 7200, bookings: 21 },
  { month: 'May', revenue: 8900, bookings: 26 },
  { month: 'Jun', revenue: 11200, bookings: 32 },
  { month: 'Jul', revenue: 12800, bookings: 35 },
  { month: 'Aug', revenue: 11500, bookings: 31 },
  { month: 'Sep', revenue: 9200, bookings: 25 },
  { month: 'Oct', revenue: 7800, bookings: 22 },
  { month: 'Nov', revenue: 6100, bookings: 17 },
  { month: 'Dec', revenue: 8400, bookings: 24 },
];

const channelData = [
  { name: 'Airbnb', value: 45, color: '#FF5A5F' },
  { name: 'VRBO', value: 25, color: '#3B82F6' },
  { name: 'Booking.com', value: 18, color: '#003580' },
  { name: 'Direct', value: 12, color: '#10B981' },
];

const upcomingReservations = [
  { id: 1, guest: 'Sarah Johnson', property: 'Oceanview Suite', checkIn: 'May 3', checkOut: 'May 7', nights: 4, total: 1200, status: 'confirmed', avatar: 'SJ', channel: 'Airbnb' },
  { id: 2, guest: 'Michael Chen', property: 'Downtown Loft', checkIn: 'May 4', checkOut: 'May 6', nights: 2, total: 450, status: 'pending', avatar: 'MC', channel: 'VRBO' },
  { id: 3, guest: 'Emma Williams', property: 'Mountain Cabin', checkIn: 'May 5', checkOut: 'May 10', nights: 5, total: 1750, status: 'confirmed', avatar: 'EW', channel: 'Direct' },
  { id: 4, guest: 'James Rodriguez', property: 'Beachfront Villa', checkIn: 'May 6', checkOut: 'May 9', nights: 3, total: 2100, status: 'confirmed', avatar: 'JR', channel: 'Booking.com' },
];

const todayActivity = [
  { type: 'checkin', guest: 'David Park', property: 'Oceanview Suite', time: '3:00 PM' },
  { type: 'checkout', guest: 'Lisa Thompson', property: 'Downtown Loft', time: '11:00 AM' },
  { type: 'cleaning', property: 'Mountain Cabin', time: '12:00 PM', crew: 'CleanPro Team' },
  { type: 'message', guest: 'Sarah Johnson', message: 'What is the WiFi password?', time: '9:30 AM' },
];

const topListings = [
  { name: 'Beachfront Villa', occupancy: 92, avgRate: 350, revenue: 12600, rating: 4.97, reviews: 128 },
  { name: 'Oceanview Suite', occupancy: 87, avgRate: 275, revenue: 9900, rating: 4.92, reviews: 96 },
  { name: 'Downtown Loft', occupancy: 81, avgRate: 195, revenue: 7020, rating: 4.88, reviews: 74 },
  { name: 'Mountain Cabin', occupancy: 76, avgRate: 225, revenue: 8100, rating: 4.95, reviews: 112 },
];

export default function STRDashboardClient() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>
            Short-Term Rental Dashboard
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage your vacation rentals, bookings, and guest experience
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {(['7d', '30d', '90d', '12m'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '12 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <KPICard
          title='Total Revenue'
          value='$99,200'
          change={12.5}
          icon={DollarSign}
          gradient='from-emerald-400 to-cyan-400'
          iconColor='text-emerald-600'
          subtitle='This month'
        />
        <KPICard
          title='Occupancy Rate'
          value='84%'
          change={3.2}
          icon={BedDouble}
          gradient='from-blue-400 to-indigo-400'
          iconColor='text-blue-600'
          subtitle='Avg across listings'
        />
        <KPICard
          title='Active Bookings'
          value='24'
          change={-2.1}
          icon={Calendar}
          gradient='from-violet-400 to-purple-400'
          iconColor='text-violet-600'
          subtitle='Next 30 days'
        />
        <KPICard
          title='Avg Nightly Rate'
          value='$262'
          change={8.7}
          icon={TrendingUp}
          gradient='from-amber-400 to-orange-400'
          iconColor='text-amber-600'
          subtitle='Per listing'
        />
      </div>

      {/* Today's Activity Banner */}
      <div className='relative rounded-xl border border-gray-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 overflow-hidden'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-200/30 to-transparent rounded-bl-full' />
        <div className='p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='h-2 w-2 rounded-full bg-green-500 animate-pulse' />
            <h3 className='text-sm font-bold text-gray-800'>Today&apos;s Activity</h3>
            <span className='text-[10px] bg-white/80 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 font-medium'>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2'>
            {todayActivity.map((activity, i) => (
              <div key={i} className='flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-lg p-2.5 border border-gray-100'>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activity.type === 'checkin' ? 'bg-green-100 text-green-600' :
                  activity.type === 'checkout' ? 'bg-red-100 text-red-600' :
                  activity.type === 'cleaning' ? 'bg-purple-100 text-purple-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {activity.type === 'checkin' ? <CheckCircle2 className='h-4 w-4' /> :
                   activity.type === 'checkout' ? <Clock className='h-4 w-4' /> :
                   activity.type === 'cleaning' ? <Sparkles className='h-4 w-4' /> :
                   <MessageCircle className='h-4 w-4' />}
                </div>
                <div className='min-w-0'>
                  <p className='text-[11px] font-semibold text-gray-800 truncate'>
                    {activity.type === 'checkin' ? `Check-in: ${activity.guest}` :
                     activity.type === 'checkout' ? `Check-out: ${activity.guest}` :
                     activity.type === 'cleaning' ? `Cleaning: ${activity.property}` :
                     `Message: ${activity.guest}`}
                  </p>
                  <p className='text-[10px] text-gray-500'>{activity.time} · {activity.property || activity.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Revenue Chart - 2 cols */}
        <div className='lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Revenue Overview</h3>
              <p className='text-[11px] text-gray-500'>Monthly earnings across all channels</p>
            </div>
            <Link href='/admin/str/earnings' className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'>
              View Details <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          <div className='h-[240px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id='revenueGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#06B6D4' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#06B6D4' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                <XAxis dataKey='month' tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type='monotone' dataKey='revenue' stroke='#06B6D4' strokeWidth={2.5} fill='url(#revenueGradient)' />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Channel Mix</h3>
              <p className='text-[11px] text-gray-500'>Booking sources</p>
            </div>
            <Link href='/admin/str/channels' className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'>
              Manage <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          <div className='h-[160px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <RechartsPie>
                <Pie data={channelData} cx='50%' cy='50%' innerRadius={45} outerRadius={70} paddingAngle={3} dataKey='value'>
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Share']} contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
          <div className='space-y-2 mt-2'>
            {channelData.map((ch) => (
              <div key={ch.name} className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: ch.color }} />
                  <span className='text-xs text-gray-700 font-medium'>{ch.name}</span>
                </div>
                <span className='text-xs font-bold text-gray-800'>{ch.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Reservations */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <div>
            <h3 className='text-sm font-bold text-gray-800'>Upcoming Reservations</h3>
            <p className='text-[11px] text-gray-500'>Next check-ins and pending bookings</p>
          </div>
          <Link href='/admin/str/reservations' className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'>
            View All <ChevronRight className='h-3 w-3' />
          </Link>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='bg-gray-50/80'>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Guest</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell'>Property</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Dates</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 hidden md:table-cell'>Channel</th>
                <th className='text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Total</th>
                <th className='text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Status</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {upcomingReservations.map((res) => (
                <tr key={res.id} className='hover:bg-gray-50/50 transition-colors'>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className='h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                        {res.avatar}
                      </div>
                      <div>
                        <p className='text-xs font-semibold text-gray-800'>{res.guest}</p>
                        <p className='text-[10px] text-gray-500 sm:hidden'>{res.property}</p>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-3 hidden sm:table-cell'>
                    <div className='flex items-center gap-1.5'>
                      <MapPin className='h-3 w-3 text-gray-400' />
                      <span className='text-xs text-gray-700'>{res.property}</span>
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    <p className='text-xs text-gray-700'>{res.checkIn} – {res.checkOut}</p>
                    <p className='text-[10px] text-gray-400'>{res.nights} nights</p>
                  </td>
                  <td className='px-4 py-3 hidden md:table-cell'>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      res.channel === 'Airbnb' ? 'bg-red-50 text-red-600' :
                      res.channel === 'VRBO' ? 'bg-blue-50 text-blue-600' :
                      res.channel === 'Booking.com' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {res.channel}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-right'>
                    <span className='text-xs font-bold text-gray-800'>${res.total.toLocaleString()}</span>
                  </td>
                  <td className='px-4 py-3 text-right'>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                      res.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {res.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Top Listings + Quick Actions */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Top Performing Listings */}
        <div className='lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Top Performing Listings</h3>
              <p className='text-[11px] text-gray-500'>Ranked by revenue this period</p>
            </div>
            <Link href='/admin/str/listings' className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'>
              All Listings <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          <div className='space-y-2.5'>
            {topListings.map((listing, i) => (
              <div key={listing.name} className='flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors'>
                <div className='h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center text-cyan-700 font-bold text-xs shrink-0'>
                  #{i + 1}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-semibold text-gray-800 truncate'>{listing.name}</p>
                  <div className='flex items-center gap-2 mt-0.5'>
                    <div className='flex items-center gap-0.5'>
                      <Star className='h-3 w-3 text-amber-400 fill-amber-400' />
                      <span className='text-[10px] text-gray-600'>{listing.rating}</span>
                    </div>
                    <span className='text-[10px] text-gray-400'>·</span>
                    <span className='text-[10px] text-gray-500'>{listing.reviews} reviews</span>
                  </div>
                </div>
                <div className='text-right hidden sm:block'>
                  <p className='text-xs font-bold text-gray-800'>${listing.revenue.toLocaleString()}</p>
                  <p className='text-[10px] text-gray-500'>${listing.avgRate}/night</p>
                </div>
                <div className='w-16 hidden md:block'>
                  <div className='flex items-center justify-between mb-0.5'>
                    <span className='text-[10px] text-gray-500'>Occ.</span>
                    <span className='text-[10px] font-semibold text-gray-700'>{listing.occupancy}%</span>
                  </div>
                  <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                    <div
                      className='h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500'
                      style={{ width: `${listing.occupancy}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className='space-y-4'>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
            <h3 className='text-sm font-bold text-gray-800 mb-3'>Quick Actions</h3>
            <div className='grid grid-cols-2 gap-2'>
              {[
                { label: 'Listings', href: '/admin/str/listings', icon: Building2, color: 'from-cyan-400 to-blue-400' },
                { label: 'Calendar', href: '/admin/str/calendar', icon: Calendar, color: 'from-violet-400 to-purple-400' },
                { label: 'Guests', href: '/admin/str/guests', icon: Users, color: 'from-emerald-400 to-teal-400' },
                { label: 'Inbox', href: '/admin/str/inbox', icon: MessageCircle, color: 'from-blue-400 to-indigo-400' },
                { label: 'Cleaning', href: '/admin/str/cleaning', icon: Sparkles, color: 'from-pink-400 to-rose-400' },
                { label: 'Channels', href: '/admin/str/channels', icon: Globe, color: 'from-amber-400 to-orange-400' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className='flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group'
                >
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                    <action.icon className='h-4 w-4' />
                  </div>
                  <span className='text-[11px] font-medium text-gray-700'>{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Channel Integration Status */}
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
            <h3 className='text-sm font-bold text-gray-800 mb-3'>Connected Channels</h3>
            <div className='space-y-2'>
              {[
                { name: 'Airbnb', status: 'connected', listings: 4, color: 'bg-red-500' },
                { name: 'VRBO', status: 'connected', listings: 3, color: 'bg-blue-500' },
                { name: 'Booking.com', status: 'pending', listings: 0, color: 'bg-indigo-800' },
                { name: 'Direct Booking', status: 'active', listings: 4, color: 'bg-emerald-500' },
              ].map((channel) => (
                <div key={channel.name} className='flex items-center justify-between p-2 rounded-lg hover:bg-gray-50'>
                  <div className='flex items-center gap-2'>
                    <div className={`h-2.5 w-2.5 rounded-full ${channel.color}`} />
                    <span className='text-xs font-medium text-gray-700'>{channel.name}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    {channel.listings > 0 && (
                      <span className='text-[10px] text-gray-500'>{channel.listings} listings</span>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      channel.status === 'connected' ? 'bg-green-50 text-green-600' :
                      channel.status === 'active' ? 'bg-cyan-50 text-cyan-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {channel.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href='/admin/str/channels'
              className='mt-3 flex items-center justify-center gap-1 text-[11px] text-cyan-600 hover:text-cyan-700 font-medium py-2 rounded-lg border border-dashed border-gray-200 hover:border-cyan-300 transition-colors'
            >
              <Globe className='h-3 w-3' /> Manage Channels
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- KPI Card Component ---
function KPICard({ title, value, change, icon: Icon, gradient, iconColor, subtitle }: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  subtitle: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className='relative rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all overflow-hidden group'>
      <div className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`} />
      <div className='flex items-start justify-between'>
        <div className='space-y-1'>
          <p className='text-[10px] sm:text-xs text-gray-500 font-medium'>{title}</p>
          <p className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900'>{value}</p>
          <div className='flex items-center gap-1'>
            {isPositive ? (
              <ArrowUpRight className='h-3 w-3 text-emerald-500' />
            ) : (
              <ArrowDownRight className='h-3 w-3 text-red-500' />
            )}
            <span className={`text-[10px] font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className='text-[10px] text-gray-400'>{subtitle}</span>
          </div>
        </div>
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
          <Icon className='h-4 w-4' />
        </div>
      </div>
    </div>
  );
}
