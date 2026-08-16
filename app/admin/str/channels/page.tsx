'use client';

import React, { useState } from 'react';
import {
  Globe, Link2, CheckCircle2, AlertTriangle, XCircle, Settings,
  RefreshCw, ArrowRight, ExternalLink, Zap, Shield, Clock,
  ChevronRight, Plus, TrendingUp, DollarSign, Calendar,
  Building2, Star, Info,
} from 'lucide-react';

const channels = [
  {
    id: 'airbnb',
    name: 'Airbnb',
    logo: '🏠',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    status: 'connected',
    listings: 4,
    bookings: 156,
    revenue: 68400,
    lastSync: '2 min ago',
    commission: '3%',
    apiAvailable: true,
    apiNote: 'Airbnb offers a comprehensive API for professional property managers. Requires approval through their Partner Program. Supports listing management, reservations, messaging, reviews, and pricing sync.',
  },
  {
    id: 'vrbo',
    name: 'VRBO / Expedia',
    logo: '🏡',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    status: 'connected',
    listings: 3,
    bookings: 89,
    revenue: 38200,
    lastSync: '5 min ago',
    commission: '5%',
    apiAvailable: true,
    apiNote: 'VRBO (part of Expedia Group) provides the Rapid API and Vrbo Connectivity Partner API. Supports property listing, availability, rates, reservations, and reviews. Requires partnership application.',
  },
  {
    id: 'booking',
    name: 'Booking.com',
    logo: '🌐',
    color: 'bg-indigo-800',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    status: 'pending',
    listings: 0,
    bookings: 0,
    revenue: 0,
    lastSync: 'Never',
    commission: '15%',
    apiAvailable: true,
    apiNote: 'Booking.com Connectivity API supports property management, availability, rates, and reservations. Requires connectivity partner registration. Higher commission but massive global reach.',
  },
  {
    id: 'direct',
    name: 'Direct Booking',
    logo: '⚡',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    status: 'active',
    listings: 4,
    bookings: 42,
    revenue: 22800,
    lastSync: 'Real-time',
    commission: '0%',
    apiAvailable: false,
    apiNote: 'Your own direct booking engine. Zero commission fees. Guests book directly through your branded website.',
  },
  {
    id: 'tripadvisor',
    name: 'TripAdvisor Rentals',
    logo: '🦉',
    color: 'bg-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    status: 'disconnected',
    listings: 0,
    bookings: 0,
    revenue: 0,
    lastSync: 'Never',
    commission: '3%',
    apiAvailable: true,
    apiNote: 'TripAdvisor offers a Vacation Rentals API for connectivity partners. Supports listing, availability, and booking management.',
  },
  {
    id: 'google',
    name: 'Google Vacation Rentals',
    logo: '🔍',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    status: 'disconnected',
    listings: 0,
    bookings: 0,
    revenue: 0,
    lastSync: 'Never',
    commission: 'CPC',
    apiAvailable: true,
    apiNote: 'Google Hotel Center supports vacation rental listings. Uses a cost-per-click model. Requires structured data feed integration.',
  },
];

export default function STRChannelsPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const totalRevenue = channels.reduce((a, c) => a + c.revenue, 0);
  const totalBookings = channels.reduce((a, c) => a + c.bookings, 0);
  const connectedCount = channels.filter((c) => c.status === 'connected' || c.status === 'active').length;

  return (
    <div className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl font-bold text-black'>Channel Manager</h1>
        <p className='text-xs text-gray-500'>Connect and manage your distribution channels</p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Connected Channels</p>
          <p className='text-lg font-bold text-gray-900'>{connectedCount}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Total Bookings</p>
          <p className='text-lg font-bold text-blue-600'>{totalBookings}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Total Revenue</p>
          <p className='text-lg font-bold text-emerald-600'>${totalRevenue.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Available Channels</p>
          <p className='text-lg font-bold text-gray-900'>{channels.length}</p>
        </div>
      </div>

      {/* Channel Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer ${
              selectedChannel === channel.id ? 'border-cyan-400 ring-2 ring-cyan-100' : 'border-gray-200'
            }`}
            onClick={() => setSelectedChannel(selectedChannel === channel.id ? null : channel.id)}
          >
            {/* Header */}
            <div className={`p-4 ${channel.bgColor}`}>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                  <span className='text-2xl'>{channel.logo}</span>
                  <div>
                    <h3 className='text-sm font-bold text-gray-800'>{channel.name}</h3>
                    <p className='text-[10px] text-gray-500'>Commission: {channel.commission}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  channel.status === 'connected' ? 'bg-green-100 text-green-700' :
                  channel.status === 'active' ? 'bg-cyan-100 text-cyan-700' :
                  channel.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {channel.status.charAt(0).toUpperCase() + channel.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className='p-4'>
              <div className='grid grid-cols-3 gap-2 mb-3'>
                <div>
                  <p className='text-[10px] text-gray-400'>Listings</p>
                  <p className='text-sm font-bold text-gray-800'>{channel.listings}</p>
                </div>
                <div>
                  <p className='text-[10px] text-gray-400'>Bookings</p>
                  <p className='text-sm font-bold text-gray-800'>{channel.bookings}</p>
                </div>
                <div>
                  <p className='text-[10px] text-gray-400'>Revenue</p>
                  <p className='text-sm font-bold text-gray-800'>${(channel.revenue / 1000).toFixed(1)}k</p>
                </div>
              </div>

              <div className='flex items-center justify-between text-[10px] text-gray-500 mb-3'>
                <span className='flex items-center gap-1'>
                  <Clock className='h-3 w-3' /> Last sync: {channel.lastSync}
                </span>
                {channel.apiAvailable && (
                  <span className='flex items-center gap-1 text-emerald-600 font-medium'>
                    <Zap className='h-3 w-3' /> API Available
                  </span>
                )}
              </div>

              {/* API Info (expanded) */}
              {selectedChannel === channel.id && (
                <div className='mt-3 pt-3 border-t border-gray-100'>
                  <div className='flex items-start gap-2 p-2.5 rounded-lg bg-blue-50'>
                    <Info className='h-4 w-4 text-blue-500 shrink-0 mt-0.5' />
                    <p className='text-[11px] text-blue-700 leading-relaxed'>{channel.apiNote}</p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                channel.status === 'connected' || channel.status === 'active'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-md'
              }`}>
                {channel.status === 'connected' || channel.status === 'active' ? (
                  <><Settings className='h-3.5 w-3.5' /> Manage Connection</>
                ) : channel.status === 'pending' ? (
                  <><RefreshCw className='h-3.5 w-3.5' /> Complete Setup</>
                ) : (
                  <><Link2 className='h-3.5 w-3.5' /> Connect Channel</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
