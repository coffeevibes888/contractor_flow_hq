'use client';

import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter,
  DollarSign, Moon, Sun, Users, MapPin,
} from 'lucide-react';

const properties = [
  { id: 1, name: 'Beachfront Villa', color: 'bg-cyan-500' },
  { id: 2, name: 'Oceanview Suite', color: 'bg-blue-500' },
  { id: 3, name: 'Downtown Loft', color: 'bg-violet-500' },
  { id: 4, name: 'Mountain Cabin', color: 'bg-emerald-500' },
  { id: 5, name: 'Lakeside Cottage', color: 'bg-amber-500' },
  { id: 6, name: 'Urban Studio', color: 'bg-rose-500' },
];

// Generate mock bookings for the calendar
const bookings: Record<string, { propertyId: number; guest: string; start: number; end: number; rate: number }[]> = {
  '2026-05': [
    { propertyId: 1, guest: 'Sarah J.', start: 3, end: 7, rate: 350 },
    { propertyId: 2, guest: 'Michael C.', start: 4, end: 6, rate: 275 },
    { propertyId: 3, guest: 'Emma W.', start: 1, end: 3, rate: 195 },
    { propertyId: 4, guest: 'James R.', start: 5, end: 10, rate: 225 },
    { propertyId: 1, guest: 'Lisa T.', start: 10, end: 14, rate: 350 },
    { propertyId: 5, guest: 'Anna K.', start: 12, end: 15, rate: 210 },
    { propertyId: 2, guest: 'David P.', start: 8, end: 11, rate: 275 },
    { propertyId: 6, guest: 'Robert K.', start: 15, end: 20, rate: 165 },
    { propertyId: 3, guest: 'Maria G.', start: 18, end: 22, rate: 195 },
    { propertyId: 1, guest: 'Tom B.', start: 20, end: 25, rate: 375 },
    { propertyId: 4, guest: 'Sophie L.', start: 22, end: 28, rate: 225 },
  ],
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function STRCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 4, 1)); // May 2026
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthBookings = bookings[monthKey] || [];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const getBookingsForDay = (day: number) => {
    return monthBookings.filter(
      (b) => day >= b.start && day < b.end && (selectedProperty === null || b.propertyId === selectedProperty)
    );
  };

  return (
    <div className='w-full space-y-5'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-black'>Calendar</h1>
          <p className='text-xs text-gray-500'>Availability, pricing, and booking overview</p>
        </div>
      </div>

      {/* Property Filter */}
      <div className='flex flex-wrap gap-2'>
        <button
          onClick={() => setSelectedProperty(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            selectedProperty === null
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Properties
        </button>
        {properties.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProperty(p.id === selectedProperty ? null : p.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              selectedProperty === p.id
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${p.color}`} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {/* Month Navigation */}
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <button onClick={prevMonth} className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors'>
            <ChevronLeft className='h-5 w-5 text-gray-600' />
          </button>
          <h2 className='text-base font-bold text-gray-800'>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={nextMonth} className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors'>
            <ChevronRight className='h-5 w-5 text-gray-600' />
          </button>
        </div>

        {/* Day Headers */}
        <div className='grid grid-cols-7 border-b border-gray-100'>
          {daysOfWeek.map((day) => (
            <div key={day} className='text-center py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider'>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className='grid grid-cols-7'>
          {/* Empty cells for days before the 1st */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className='min-h-[80px] sm:min-h-[100px] border-b border-r border-gray-50 bg-gray-50/30' />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayBookings = getBookingsForDay(day);
            const isToday = day === 2 && month === 4 && year === 2026;

            return (
              <div
                key={day}
                className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-gray-50 p-1 ${
                  isToday ? 'bg-cyan-50/50' : 'hover:bg-gray-50/50'
                } transition-colors`}
              >
                <div className='flex items-center justify-between mb-0.5'>
                  <span className={`text-[11px] font-medium ${
                    isToday ? 'bg-cyan-500 text-white h-5 w-5 rounded-full flex items-center justify-center' : 'text-gray-600'
                  }`}>
                    {day}
                  </span>
                </div>
                <div className='space-y-0.5'>
                  {dayBookings.slice(0, 2).map((booking, bi) => {
                    const prop = properties.find((p) => p.id === booking.propertyId);
                    return (
                      <div
                        key={bi}
                        className={`text-[9px] px-1 py-0.5 rounded ${prop?.color} text-white font-medium truncate cursor-pointer hover:opacity-80`}
                        title={`${booking.guest} - ${prop?.name}`}
                      >
                        {booking.guest}
                      </div>
                    );
                  })}
                  {dayBookings.length > 2 && (
                    <div className='text-[9px] text-gray-400 font-medium px-1'>
                      +{dayBookings.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className='flex flex-wrap gap-3'>
        {properties.map((p) => (
          <div key={p.id} className='flex items-center gap-1.5'>
            <div className={`h-3 w-3 rounded ${p.color}`} />
            <span className='text-[11px] text-gray-600 font-medium'>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
