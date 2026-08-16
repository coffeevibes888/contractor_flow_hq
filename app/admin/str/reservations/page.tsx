'use client';

import React, { useState } from 'react';
import {
  Calendar, Search, Filter, MapPin, Clock, CheckCircle2,
  AlertTriangle, XCircle, ChevronDown, DollarSign, Users,
  MessageCircle, Phone, Mail, Star, ArrowRight,
} from 'lucide-react';

const reservations = [
  { id: 'RES-001', guest: 'Sarah Johnson', email: 'sarah@email.com', property: 'Oceanview Suite', checkIn: '2026-05-03', checkOut: '2026-05-07', nights: 4, guests: 2, total: 1200, status: 'confirmed', channel: 'Airbnb', avatar: 'SJ', rating: 4.9, staysCount: 12 },
  { id: 'RES-002', guest: 'Michael Chen', email: 'michael@email.com', property: 'Downtown Loft', checkIn: '2026-05-04', checkOut: '2026-05-06', nights: 2, guests: 1, total: 450, status: 'pending', channel: 'VRBO', avatar: 'MC', rating: 4.7, staysCount: 5 },
  { id: 'RES-003', guest: 'Emma Williams', email: 'emma@email.com', property: 'Mountain Cabin', checkIn: '2026-05-05', checkOut: '2026-05-10', nights: 5, guests: 4, total: 1750, status: 'confirmed', channel: 'Direct', avatar: 'EW', rating: 5.0, staysCount: 8 },
  { id: 'RES-004', guest: 'James Rodriguez', email: 'james@email.com', property: 'Beachfront Villa', checkIn: '2026-05-06', checkOut: '2026-05-09', nights: 3, guests: 6, total: 2100, status: 'confirmed', channel: 'Booking.com', avatar: 'JR', rating: 4.8, staysCount: 3 },
  { id: 'RES-005', guest: 'Lisa Thompson', email: 'lisa@email.com', property: 'Oceanview Suite', checkIn: '2026-05-10', checkOut: '2026-05-14', nights: 4, guests: 2, total: 1100, status: 'confirmed', channel: 'Airbnb', avatar: 'LT', rating: 4.6, staysCount: 20 },
  { id: 'RES-006', guest: 'David Park', email: 'david@email.com', property: 'Urban Studio', checkIn: '2026-05-08', checkOut: '2026-05-11', nights: 3, guests: 1, total: 495, status: 'cancelled', channel: 'Airbnb', avatar: 'DP', rating: 4.5, staysCount: 2 },
  { id: 'RES-007', guest: 'Anna Kowalski', email: 'anna@email.com', property: 'Lakeside Cottage', checkIn: '2026-05-12', checkOut: '2026-05-15', nights: 3, guests: 3, total: 630, status: 'pending', channel: 'VRBO', avatar: 'AK', rating: 4.9, staysCount: 15 },
  { id: 'RES-008', guest: 'Robert Kim', email: 'robert@email.com', property: 'Beachfront Villa', checkIn: '2026-05-15', checkOut: '2026-05-20', nights: 5, guests: 8, total: 3500, status: 'confirmed', channel: 'Direct', avatar: 'RK', rating: 5.0, staysCount: 1 },
];

export default function STRReservationsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = reservations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery && !r.guest.toLowerCase().includes(searchQuery.toLowerCase()) && !r.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalRevenue = filtered.reduce((a, r) => a + (r.status !== 'cancelled' ? r.total : 0), 0);
  const avgNights = filtered.length > 0 ? (filtered.reduce((a, r) => a + r.nights, 0) / filtered.length).toFixed(1) : '0';

  return (
    <div className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl font-bold text-black'>Reservations</h1>
        <p className='text-xs text-gray-500'>Track bookings, check-ins, and guest stays</p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Total Bookings</p>
          <p className='text-lg font-bold text-gray-900'>{reservations.length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Confirmed</p>
          <p className='text-lg font-bold text-emerald-600'>{reservations.filter((r) => r.status === 'confirmed').length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Avg Stay</p>
          <p className='text-lg font-bold text-blue-600'>{avgNights} nights</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Revenue</p>
          <p className='text-lg font-bold text-gray-900'>${totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
          <input
            type='text'
            placeholder='Search by guest name or reservation ID...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400'
          />
        </div>
        <div className='flex gap-2'>
          {(['all', 'confirmed', 'pending', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all capitalize ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations Table */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
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
              {filtered.map((res) => (
                <tr key={res.id} className='hover:bg-gray-50/50 transition-colors cursor-pointer'>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className='h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                        {res.avatar}
                      </div>
                      <div>
                        <p className='text-xs font-semibold text-gray-800'>{res.guest}</p>
                        <div className='flex items-center gap-1'>
                          <Star className='h-2.5 w-2.5 text-amber-400 fill-amber-400' />
                          <span className='text-[10px] text-gray-500'>{res.rating} · {res.staysCount} stays</span>
                        </div>
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
                    <p className='text-xs text-gray-700'>{new Date(res.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(res.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <p className='text-[10px] text-gray-400'>{res.nights} nights · {res.guests} guests</p>
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
                      res.status === 'confirmed' ? 'bg-green-50 text-green-600' :
                      res.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
