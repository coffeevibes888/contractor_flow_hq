'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import {
  format,
  isSameDay,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  isSameMonth,
  isToday,
} from 'date-fns';

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  serviceTypes?: string[];
}

interface AvailabilityCalendarProps {
  contractorId: string;
  serviceType: string;
  onSlotSelect: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot | null;
  minDate?: Date;
  maxDate?: Date;
}

export default function AvailabilityCalendar({
  contractorId,
  serviceType,
  onSlotSelect,
  selectedSlot,
  minDate = new Date(),
  maxDate = addDays(new Date(), 60),
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(minDate));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, contractorId, serviceType]);

  const fetchAvailableSlots = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/contractor/${contractorId}/availability?` +
          new URLSearchParams({ date: dateStr, serviceType })
      );

      if (!response.ok) throw new Error('Failed to fetch availability');

      const data = await response.json();
      const slots = (data.slots || []).map((slot: any) => ({
        ...slot,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime),
      }));
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError('Unable to load availability. Please try again.');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.isAvailable) onSlotSelect(slot);
  };

  const isSlotSelected = (slot: TimeSlot) =>
    selectedSlot &&
    isSameDay(slot.startTime, selectedSlot.startTime) &&
    slot.startTime.getTime() === selectedSlot.startTime.getTime();

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const canGoPrev = isAfter(startOfMonth(currentMonth), startOfMonth(minDate));
  const canGoNext = isBefore(startOfMonth(currentMonth), startOfMonth(maxDate));

  const isDayDisabled = (d: Date) =>
    isBefore(d, minDate) || isAfter(d, maxDate) || !isSameMonth(d, currentMonth);

  return (
    <div className="flex flex-col lg:flex-row gap-0 bg-slate-900 rounded-xl overflow-hidden min-h-[480px]">
      {/* Calendar — takes up most of the space */}
      <div className="flex-1 p-5 lg:p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1))}
            disabled={!canGoPrev}
            className="p-2 rounded-lg hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-white font-semibold text-lg">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => canGoNext && setCurrentMonth(addMonths(currentMonth, 1))}
            disabled={!canGoNext}
            className="p-2 rounded-lg hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-slate-400 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.map((week, wi) =>
            week.map((d, di) => {
              const disabled = isDayDisabled(d);
              const selected = selectedDate && isSameDay(d, selectedDate);
              const today = isToday(d);

              return (
                <button
                  key={`${wi}-${di}`}
                  onClick={() => !disabled && setSelectedDate(d)}
                  disabled={disabled}
                  className={`
                    relative aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all
                    ${disabled ? 'text-slate-700 cursor-not-allowed' : 'text-white hover:bg-white/10 cursor-pointer'}
                    ${selected ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900' : ''}
                    ${today && !selected ? 'bg-white/5 ring-1 ring-white/20' : ''}
                  `}
                >
                  {format(d, 'd')}
                  {today && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Time slots panel */}
      <div className="w-full lg:w-72 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            Available Times
          </h4>
          {selectedDate && (
            <p className="text-slate-400 text-sm mt-1">
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedDate ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">
                Select a date to see available times
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedDate && fetchAvailableSlots(selectedDate)}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Try Again
              </Button>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">
                No slots available for this date
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Try a different date
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableSlots.map((slot, i) => {
                const sel = isSlotSelected(slot);
                return (
                  <button
                    key={i}
                    onClick={() => handleSlotClick(slot)}
                    disabled={!slot.isAvailable}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${sel
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : slot.isAvailable
                          ? 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }
                    `}
                  >
                    <span>{format(slot.startTime, 'h:mm a')}</span>
                    {sel && <CheckCircle className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
