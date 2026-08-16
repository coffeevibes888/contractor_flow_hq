'use client';

import React, { useState } from 'react';
import {
  Sparkles, Clock, CheckCircle2, AlertTriangle, Calendar,
  Users, MapPin, ChevronRight, Filter, Search, Plus,
  Timer, Star, Phone,
} from 'lucide-react';

const turnovers = [
  { id: 1, property: 'Oceanview Suite', date: 'May 2, 2026', time: '11:00 AM - 2:00 PM', crew: 'CleanPro Team', status: 'in_progress', checkoutGuest: 'Lisa Thompson', checkinGuest: 'Sarah Johnson', checkinTime: '3:00 PM', priority: 'high' },
  { id: 2, property: 'Downtown Loft', date: 'May 2, 2026', time: '12:00 PM - 2:30 PM', crew: 'Sparkle Cleaners', status: 'scheduled', checkoutGuest: 'David Park', checkinGuest: 'Michael Chen', checkinTime: '4:00 PM', priority: 'normal' },
  { id: 3, property: 'Mountain Cabin', date: 'May 3, 2026', time: '11:00 AM - 1:30 PM', crew: 'CleanPro Team', status: 'scheduled', checkoutGuest: 'Anna Kowalski', checkinGuest: 'Emma Williams', checkinTime: '3:00 PM', priority: 'normal' },
  { id: 4, property: 'Beachfront Villa', date: 'May 3, 2026', time: '10:00 AM - 1:00 PM', crew: 'Premium Clean Co', status: 'scheduled', checkoutGuest: 'Robert Kim', checkinGuest: 'James Rodriguez', checkinTime: '4:00 PM', priority: 'high' },
  { id: 5, property: 'Lakeside Cottage', date: 'May 4, 2026', time: '11:00 AM - 1:00 PM', crew: 'Sparkle Cleaners', status: 'scheduled', checkoutGuest: 'Tom Brown', checkinGuest: 'None', checkinTime: 'N/A', priority: 'low' },
  { id: 6, property: 'Urban Studio', date: 'May 1, 2026', time: '12:00 PM - 1:30 PM', crew: 'CleanPro Team', status: 'completed', checkoutGuest: 'Maria Garcia', checkinGuest: 'David Park', checkinTime: '3:00 PM', priority: 'normal' },
];

const cleaningTeams = [
  { name: 'CleanPro Team', rating: 4.9, jobs: 156, phone: '+1 (555) 111-2222' },
  { name: 'Sparkle Cleaners', rating: 4.7, jobs: 89, phone: '+1 (555) 333-4444' },
  { name: 'Premium Clean Co', rating: 4.95, jobs: 42, phone: '+1 (555) 555-6666' },
];

export default function STRCleaningPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');

  const filtered = turnovers.filter((t) => statusFilter === 'all' || t.status === statusFilter);

  return (
    <div className='w-full space-y-5'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-black'>Cleaning &amp; Turnovers</h1>
          <p className='text-xs text-gray-500'>Manage turnover schedules and cleaning crews</p>
        </div>
        <button className='inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all'>
          <Plus className='h-4 w-4' /> Schedule Cleaning
        </button>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Today&apos;s Turnovers</p>
          <p className='text-lg font-bold text-gray-900'>{turnovers.filter((t) => t.date === 'May 2, 2026').length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>In Progress</p>
          <p className='text-lg font-bold text-amber-600'>{turnovers.filter((t) => t.status === 'in_progress').length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Upcoming</p>
          <p className='text-lg font-bold text-blue-600'>{turnovers.filter((t) => t.status === 'scheduled').length}</p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <p className='text-[10px] text-gray-500 font-medium'>Completed</p>
          <p className='text-lg font-bold text-emerald-600'>{turnovers.filter((t) => t.status === 'completed').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex gap-2'>
        {(['all', 'scheduled', 'in_progress', 'completed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              statusFilter === s
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Turnover Schedule */}
        <div className='lg:col-span-2 space-y-3'>
          {filtered.map((turnover) => (
            <div key={turnover.id} className={`rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all ${
              turnover.priority === 'high' ? 'border-amber-200' : 'border-gray-200'
            }`}>
              <div className='flex items-start justify-between'>
                <div className='flex items-start gap-3'>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    turnover.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                    turnover.status === 'in_progress' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {turnover.status === 'completed' ? <CheckCircle2 className='h-5 w-5' /> :
                     turnover.status === 'in_progress' ? <Timer className='h-5 w-5' /> :
                     <Clock className='h-5 w-5' />}
                  </div>
                  <div>
                    <h3 className='text-sm font-bold text-gray-800'>{turnover.property}</h3>
                    <p className='text-[11px] text-gray-500'>{turnover.date} · {turnover.time}</p>
                    <p className='text-[11px] text-gray-500 mt-0.5'>Crew: {turnover.crew}</p>
                  </div>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    turnover.status === 'completed' ? 'bg-green-50 text-green-600' :
                    turnover.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {turnover.status === 'in_progress' ? 'In Progress' : turnover.status.charAt(0).toUpperCase() + turnover.status.slice(1)}
                  </span>
                  {turnover.priority === 'high' && (
                    <span className='text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 flex items-center gap-0.5'>
                      <AlertTriangle className='h-2.5 w-2.5' /> Tight window
                    </span>
                  )}
                </div>
              </div>
              <div className='mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-[10px] text-gray-400 font-medium'>Check-out</p>
                  <p className='text-[11px] text-gray-700 font-medium'>{turnover.checkoutGuest}</p>
                </div>
                <div>
                  <p className='text-[10px] text-gray-400 font-medium'>Next Check-in</p>
                  <p className='text-[11px] text-gray-700 font-medium'>{turnover.checkinGuest} · {turnover.checkinTime}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cleaning Teams */}
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-fit'>
          <h3 className='text-sm font-bold text-gray-800 mb-3'>Cleaning Teams</h3>
          <div className='space-y-3'>
            {cleaningTeams.map((team) => (
              <div key={team.name} className='p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-bold text-gray-800'>{team.name}</h4>
                  <div className='flex items-center gap-0.5'>
                    <Star className='h-3 w-3 text-amber-400 fill-amber-400' />
                    <span className='text-[11px] font-semibold text-gray-700'>{team.rating}</span>
                  </div>
                </div>
                <div className='flex items-center justify-between mt-1.5'>
                  <span className='text-[10px] text-gray-500'>{team.jobs} jobs completed</span>
                  <div className='flex items-center gap-1 text-[10px] text-gray-500'>
                    <Phone className='h-3 w-3' />
                    {team.phone}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className='mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-cyan-600 hover:text-cyan-700 font-medium py-2 rounded-lg border border-dashed border-gray-200 hover:border-cyan-300 transition-colors'>
            <Plus className='h-3 w-3' /> Add Cleaning Team
          </button>
        </div>
      </div>
    </div>
  );
}
