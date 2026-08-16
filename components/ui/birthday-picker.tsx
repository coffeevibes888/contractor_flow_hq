'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Cake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BirthdayPickerProps {
  value?: string;
  onChange: (date: string) => void;
  className?: string;
  error?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function BirthdayPicker({ value, onChange, className, error }: BirthdayPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'date' | 'month' | 'year'>('date');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parse existing value or use defaults
  const parsedDate = value ? new Date(value) : null;
  const [selectedYear, setSelectedYear] = useState(parsedDate?.getFullYear() || 1990);
  const [selectedMonth, setSelectedMonth] = useState(parsedDate?.getMonth() || 0);
  const [selectedDay, setSelectedDay] = useState(parsedDate?.getDate() || 0);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor((parsedDate?.getFullYear() || 1990) / 12) * 12);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setView('date');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setView('date');
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setView('month');
  };

  const formatDisplayDate = () => {
    if (!value || !parsedDate) return '';
    return parsedDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100;
  const maxYear = currentYear - 18; // Must be at least 18

  const renderDateView = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days = [];
    
    // Empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }
    
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDay && value;
      const isToday = new Date().getDate() === day && 
                      new Date().getMonth() === selectedMonth && 
                      new Date().getFullYear() === selectedYear;
      
      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDaySelect(day)}
          className={cn(
            'h-9 w-9 rounded-full text-sm font-medium transition-all duration-200',
            'hover:bg-violet-500/30 hover:text-white hover:scale-110',
            isSelected && 'bg-violet-500 text-white shadow-lg shadow-violet-500/30',
            isToday && !isSelected && 'bg-slate-700 text-violet-400',
            !isSelected && !isToday && 'text-slate-300'
          )}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="space-y-3">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (selectedMonth === 0) {
                setSelectedMonth(11);
                setSelectedYear(selectedYear - 1);
              } else {
                setSelectedMonth(selectedMonth - 1);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={() => setView('month')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-700 text-white font-medium transition-colors"
          >
            {MONTHS[selectedMonth]} {selectedYear}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear(selectedYear + 1);
              } else {
                setSelectedMonth(selectedMonth + 1);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="h-9 w-9 flex items-center justify-center text-xs font-medium text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const renderMonthView = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView('date')}
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setView('year')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-700 text-white font-medium transition-colors"
        >
          {selectedYear}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
        <div className="w-8" />
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {MONTHS.map((month, index) => (
          <button
            key={month}
            type="button"
            onClick={() => handleMonthSelect(index)}
            className={cn(
              'py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              'hover:bg-violet-500/30 hover:text-white hover:scale-105',
              selectedMonth === index && 'bg-violet-500 text-white shadow-lg shadow-violet-500/30',
              selectedMonth !== index && 'text-slate-300'
            )}
          >
            {month.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );

  const renderYearView = () => {
    const years = [];
    for (let i = yearRangeStart; i < yearRangeStart + 12 && i <= maxYear; i++) {
      if (i >= minYear) {
        years.push(i);
      }
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setYearRangeStart(Math.max(minYear, yearRangeStart - 12))}
            disabled={yearRangeStart <= minYear}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-white font-medium">
            {yearRangeStart} - {Math.min(yearRangeStart + 11, maxYear)}
          </span>
          <button
            type="button"
            onClick={() => setYearRangeStart(Math.min(maxYear - 11, yearRangeStart + 12))}
            disabled={yearRangeStart + 12 > maxYear}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleYearSelect(year)}
              className={cn(
                'py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-violet-500/30 hover:text-white hover:scale-105',
                selectedYear === year && 'bg-violet-500 text-white shadow-lg shadow-violet-500/30',
                selectedYear !== year && 'text-slate-300'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full h-12 px-4 rounded-lg border text-left flex items-center gap-3 transition-all duration-200',
          'bg-slate-800/50 hover:bg-slate-800/70',
          error ? 'border-red-500' : 'border-slate-600 hover:border-violet-500/50',
          isOpen && 'border-violet-500 ring-2 ring-violet-500/20'
        )}
      >
        <div className={cn(
          'p-1.5 rounded-lg transition-colors',
          value ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700 text-slate-400'
        )}>
          <Cake className="h-4 w-4" />
        </div>
        <span className={cn(
          'flex-1',
          value ? 'text-white' : 'text-slate-400'
        )}>
          {formatDisplayDate() || 'Select your birthday'}
        </span>
        <ChevronDown className={cn(
          'h-5 w-5 text-slate-400 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[300px] p-4 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 animate-in fade-in-0 zoom-in-95 duration-200">
          {view === 'date' && renderDateView()}
          {view === 'month' && renderMonthView()}
          {view === 'year' && renderYearView()}
          
          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">Must be 18 or older</span>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setSelectedDay(0);
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
