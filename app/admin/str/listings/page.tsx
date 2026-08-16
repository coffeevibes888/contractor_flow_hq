'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2, Plus, Search, Filter, Star, MapPin, BedDouble,
  Bath, Users, Eye, Edit, MoreHorizontal, Wifi, Car, Waves,
  ChevronDown, ArrowUpDown, Globe, DollarSign, TrendingUp,
  Image as ImageIcon, CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';

const listings = [
  {
    id: 1, name: 'Beachfront Villa', location: 'Miami Beach, FL', type: 'Entire home',
    bedrooms: 4, bathrooms: 3, guests: 8, rating: 4.97, reviews: 128,
    nightlyRate: 350, occupancy: 92, status: 'active', channels: ['Airbnb', 'VRBO', 'Direct'],
    monthlyRevenue: 12600, image: null, amenities: ['wifi', 'pool', 'parking'],
    nextBooking: 'May 3',
  },
  {
    id: 2, name: 'Oceanview Suite', location: 'Santa Monica, CA', type: 'Entire home',
    bedrooms: 2, bathrooms: 2, guests: 4, rating: 4.92, reviews: 96,
    nightlyRate: 275, occupancy: 87, status: 'active', channels: ['Airbnb', 'VRBO'],
    monthlyRevenue: 9900, image: null, amenities: ['wifi', 'parking'],
    nextBooking: 'May 5',
  },
  {
    id: 3, name: 'Downtown Loft', location: 'Austin, TX', type: 'Entire home',
    bedrooms: 1, bathrooms: 1, guests: 2, rating: 4.88, reviews: 74,
    nightlyRate: 195, occupancy: 81, status: 'active', channels: ['Airbnb', 'Direct'],
    monthlyRevenue: 7020, image: null, amenities: ['wifi'],
    nextBooking: 'May 4',
  },
  {
    id: 4, name: 'Mountain Cabin', location: 'Asheville, NC', type: 'Entire home',
    bedrooms: 3, bathrooms: 2, guests: 6, rating: 4.95, reviews: 112,
    nightlyRate: 225, occupancy: 76, status: 'active', channels: ['VRBO', 'Direct'],
    monthlyRevenue: 8100, image: null, amenities: ['wifi', 'parking'],
    nextBooking: 'May 6',
  },
  {
    id: 5, name: 'Lakeside Cottage', location: 'Lake Tahoe, CA', type: 'Entire home',
    bedrooms: 2, bathrooms: 1, guests: 4, rating: 4.85, reviews: 58,
    nightlyRate: 210, occupancy: 68, status: 'paused', channels: ['Airbnb'],
    monthlyRevenue: 4200, image: null, amenities: ['wifi', 'parking'],
    nextBooking: 'None',
  },
  {
    id: 6, name: 'Urban Studio', location: 'New York, NY', type: 'Private room',
    bedrooms: 1, bathrooms: 1, guests: 2, rating: 4.78, reviews: 42,
    nightlyRate: 165, occupancy: 72, status: 'active', channels: ['Airbnb', 'Booking.com'],
    monthlyRevenue: 3564, image: null, amenities: ['wifi'],
    nextBooking: 'May 8',
  },
];

export default function STRListingsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const filtered = listings.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-black'>Listings</h1>
          <p className='text-xs text-gray-500'>Manage your short-term rental properties</p>
        </div>
        <button className='inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all'>
          <Plus className='h-4 w-4' /> Add Listing
        </button>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
          <input
            type='text'
            placeholder='Search listings...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400'
          />
        </div>
        <div className='flex gap-2'>
          {(['all', 'active', 'paused'] as const).map((s) => (
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

      {/* Summary Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Total Listings</p>
          <p className='text-lg font-bold text-gray-900'>{listings.length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Active</p>
          <p className='text-lg font-bold text-emerald-600'>{listings.filter((l) => l.status === 'active').length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Avg Occupancy</p>
          <p className='text-lg font-bold text-blue-600'>{Math.round(listings.reduce((a, l) => a + l.occupancy, 0) / listings.length)}%</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Monthly Revenue</p>
          <p className='text-lg font-bold text-gray-900'>${listings.reduce((a, l) => a + l.monthlyRevenue, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Listings Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {filtered.map((listing) => (
          <div key={listing.id} className='rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all group'>
            {/* Image Placeholder */}
            <div className='relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center'>
              <ImageIcon className='h-10 w-10 text-gray-300' />
              <div className='absolute top-2 left-2 flex gap-1'>
                {listing.channels.map((ch) => (
                  <span key={ch} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${
                    ch === 'Airbnb' ? 'bg-red-500/90 text-white' :
                    ch === 'VRBO' ? 'bg-blue-500/90 text-white' :
                    ch === 'Booking.com' ? 'bg-indigo-800/90 text-white' :
                    'bg-emerald-500/90 text-white'
                  }`}>
                    {ch}
                  </span>
                ))}
              </div>
              <div className='absolute top-2 right-2'>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  listing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {listing.status === 'active' ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className='absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full'>
                <Star className='h-3 w-3 fill-amber-400 text-amber-400' />
                <span className='text-[11px] font-semibold'>{listing.rating}</span>
                <span className='text-[10px] text-gray-300'>({listing.reviews})</span>
              </div>
            </div>

            {/* Content */}
            <div className='p-3 space-y-2'>
              <div>
                <h3 className='text-sm font-bold text-gray-800 group-hover:text-cyan-600 transition-colors'>{listing.name}</h3>
                <div className='flex items-center gap-1 mt-0.5'>
                  <MapPin className='h-3 w-3 text-gray-400' />
                  <span className='text-[11px] text-gray-500'>{listing.location}</span>
                </div>
              </div>

              <div className='flex items-center gap-3 text-[11px] text-gray-500'>
                <span className='flex items-center gap-1'><BedDouble className='h-3 w-3' /> {listing.bedrooms} bed</span>
                <span className='flex items-center gap-1'><Bath className='h-3 w-3' /> {listing.bathrooms} bath</span>
                <span className='flex items-center gap-1'><Users className='h-3 w-3' /> {listing.guests} guests</span>
              </div>

              <div className='flex items-center justify-between pt-2 border-t border-gray-100'>
                <div>
                  <span className='text-sm font-bold text-gray-900'>${listing.nightlyRate}</span>
                  <span className='text-[11px] text-gray-500'> /night</span>
                </div>
                <div className='text-right'>
                  <p className='text-[10px] text-gray-500'>Occupancy</p>
                  <div className='flex items-center gap-1'>
                    <div className='w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                      <div className='h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500' style={{ width: `${listing.occupancy}%` }} />
                    </div>
                    <span className='text-[10px] font-semibold text-gray-700'>{listing.occupancy}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
