'use client';

import React, { useState } from 'react';
import {
  Users, Search, Star, MapPin, Calendar, MessageCircle,
  Phone, Mail, ChevronRight, Filter, Award, Heart,
} from 'lucide-react';

const guests = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah@email.com', phone: '+1 (555) 123-4567', avatar: 'SJ', totalStays: 12, totalSpent: 8400, rating: 4.9, lastStay: 'May 3, 2026', favoriteProperty: 'Oceanview Suite', tags: ['repeat', 'superguest'] },
  { id: 2, name: 'Michael Chen', email: 'michael@email.com', phone: '+1 (555) 234-5678', avatar: 'MC', totalStays: 5, totalSpent: 3200, rating: 4.7, lastStay: 'Apr 28, 2026', favoriteProperty: 'Downtown Loft', tags: ['repeat'] },
  { id: 3, name: 'Emma Williams', email: 'emma@email.com', phone: '+1 (555) 345-6789', avatar: 'EW', totalStays: 8, totalSpent: 6100, rating: 5.0, lastStay: 'May 5, 2026', favoriteProperty: 'Mountain Cabin', tags: ['repeat', 'superguest'] },
  { id: 4, name: 'James Rodriguez', email: 'james@email.com', phone: '+1 (555) 456-7890', avatar: 'JR', totalStays: 3, totalSpent: 4500, rating: 4.8, lastStay: 'May 6, 2026', favoriteProperty: 'Beachfront Villa', tags: [] },
  { id: 5, name: 'Lisa Thompson', email: 'lisa@email.com', phone: '+1 (555) 567-8901', avatar: 'LT', totalStays: 20, totalSpent: 14200, rating: 4.6, lastStay: 'May 1, 2026', favoriteProperty: 'Oceanview Suite', tags: ['repeat', 'superguest', 'vip'] },
  { id: 6, name: 'David Park', email: 'david@email.com', phone: '+1 (555) 678-9012', avatar: 'DP', totalStays: 2, totalSpent: 890, rating: 4.5, lastStay: 'Apr 20, 2026', favoriteProperty: 'Urban Studio', tags: ['new'] },
  { id: 7, name: 'Anna Kowalski', email: 'anna@email.com', phone: '+1 (555) 789-0123', avatar: 'AK', totalStays: 15, totalSpent: 9800, rating: 4.9, lastStay: 'May 12, 2026', favoriteProperty: 'Lakeside Cottage', tags: ['repeat', 'superguest'] },
  { id: 8, name: 'Robert Kim', email: 'robert@email.com', phone: '+1 (555) 890-1234', avatar: 'RK', totalStays: 1, totalSpent: 3500, rating: 5.0, lastStay: 'May 15, 2026', favoriteProperty: 'Beachfront Villa', tags: ['new'] },
];

export default function STRGuestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const filtered = guests.filter((g) => {
    if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (tagFilter !== 'all' && !g.tags.includes(tagFilter)) return false;
    return true;
  });

  return (
    <div className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl font-bold text-black'>Guests</h1>
        <p className='text-xs text-gray-500'>Guest profiles, history, and relationship management</p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Total Guests</p>
          <p className='text-lg font-bold text-gray-900'>{guests.length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Repeat Guests</p>
          <p className='text-lg font-bold text-emerald-600'>{guests.filter((g) => g.tags.includes('repeat')).length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Avg Rating</p>
          <p className='text-lg font-bold text-amber-600'>{(guests.reduce((a, g) => a + g.rating, 0) / guests.length).toFixed(1)}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Total Revenue</p>
          <p className='text-lg font-bold text-gray-900'>${guests.reduce((a, g) => a + g.totalSpent, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
          <input
            type='text'
            placeholder='Search guests...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400'
          />
        </div>
        <div className='flex gap-2'>
          {['all', 'superguest', 'repeat', 'vip', 'new'].map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all capitalize ${
                tagFilter === tag
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag === 'all' ? 'All' : tag === 'superguest' ? 'Superguest' : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Guest Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
        {filtered.map((guest) => (
          <div key={guest.id} className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group'>
            <div className='flex items-start gap-3'>
              <div className='h-11 w-11 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0'>
                {guest.avatar}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-sm font-bold text-gray-800 truncate group-hover:text-cyan-600 transition-colors'>{guest.name}</h3>
                  {guest.tags.includes('superguest') && (
                    <Award className='h-3.5 w-3.5 text-amber-500 shrink-0' />
                  )}
                  {guest.tags.includes('vip') && (
                    <Heart className='h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0' />
                  )}
                </div>
                <div className='flex items-center gap-1 mt-0.5'>
                  <Star className='h-3 w-3 text-amber-400 fill-amber-400' />
                  <span className='text-[11px] text-gray-600'>{guest.rating} rating</span>
                  <span className='text-[11px] text-gray-400'>·</span>
                  <span className='text-[11px] text-gray-500'>{guest.totalStays} stays</span>
                </div>
              </div>
            </div>

            <div className='mt-3 space-y-1.5'>
              <div className='flex items-center gap-2 text-[11px] text-gray-500'>
                <Mail className='h-3 w-3' />
                <span className='truncate'>{guest.email}</span>
              </div>
              <div className='flex items-center gap-2 text-[11px] text-gray-500'>
                <MapPin className='h-3 w-3' />
                <span>Favorite: {guest.favoriteProperty}</span>
              </div>
              <div className='flex items-center gap-2 text-[11px] text-gray-500'>
                <Calendar className='h-3 w-3' />
                <span>Last stay: {guest.lastStay}</span>
              </div>
            </div>

            <div className='mt-3 pt-3 border-t border-gray-100 flex items-center justify-between'>
              <span className='text-xs font-bold text-gray-800'>${guest.totalSpent.toLocaleString()} spent</span>
              <div className='flex gap-1'>
                {guest.tags.map((tag) => (
                  <span key={tag} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                    tag === 'superguest' ? 'bg-amber-50 text-amber-600' :
                    tag === 'vip' ? 'bg-rose-50 text-rose-600' :
                    tag === 'repeat' ? 'bg-cyan-50 text-cyan-600' :
                    'bg-green-50 text-green-600'
                  }`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
