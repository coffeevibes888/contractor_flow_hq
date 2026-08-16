'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  format,
  isSameDay,
  startOfDay,
  addDays,
  isSameMonth,
  isToday,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BlockDateModal from './block-date-modal';

type DayStatus = 'available' | 'partial' | 'booked' | 'blocked' | 'off' | 'past' | 'too-far';

interface DayInfo {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  appointments: Array<{
    id: string;
    startTime: string;
    endTime: string;
    title: string;
    status: string;
    serviceType: string;
  }>;
}

interface AvailabilityCalendarProps {
  contractorId: string;
  mode?: 'view' | 'manage';
  onDateSelect?: (date: Date) => void;
}

const STATUS_LABEL: Record<DayStatus, string> = {
  available: 'Available',
  partial: 'Partially Booked',
  booked: 'Fully Booked',
  blocked: 'Blocked',
  off: 'Day Off',
  past: 'Past Cutoff',
  'too-far': 'Beyond Window',
};

export default function AvailabilityCalendar({
  contractorId,
  mode = 'view',
  onDateSelect,
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [days, setDays] = useState<Map<string, DayInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const start = calendarStart.toISOString();
      const end = calendarEnd.toISOString();
      const res = await fetch(
        `/api/contractor/calendar/day-status?contractorId=${contractorId}&start=${start}&end=${end}`
      );
      if (!res.ok) throw new Error('Failed to load calendar');
      const data = await res.json();
      setNotConfigured(Boolean(data.notConfigured));
      const map = new Map<string, DayInfo>();
      (data.days || []).forEach((d: DayInfo) => map.set(d.date, d));
      setDays(map);
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, [contractorId, calendarStart, calendarEnd]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const getDayInfo = (date: Date): DayInfo => {
    const key = format(date, 'yyyy-MM-dd');
    return (
      days.get(key) || {
        date: key,
        status: 'available',
        appointments: [],
      }
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const handleUnblock = async () => {
    try {
      const res = await fetch(
        `/api/contractor/calendar/block-date?contractorId=${contractorId}&date=${selectedDate.toISOString()}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to unblock');
      await fetchCalendarData();
    } catch (err) {
      console.error('Failed to unblock date:', err);
    }
  };

  const selectedInfo = getDayInfo(selectedDate);

  return (
    <>
      <BlockDateModal
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        contractorId={contractorId}
        onSuccess={fetchCalendarData}
      />

      <div className='space-y-5'>
        {/* Not-configured warning */}
        {notConfigured && (
          <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3'>
            <AlertCircle className='h-5 w-5 text-amber-600 shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='text-sm font-bold text-amber-900'>
                Set your working hours to start accepting bookings
              </p>
              <p className='text-xs text-amber-700 mt-0.5'>
                Until you save working hours on the Hours tab, no dates are bookable. Customers will see
                you as unavailable even though the calendar may look open.
              </p>
            </div>
          </div>
        )}

        {/* Calendar Card — full width */}
        <Card className='rounded-xl bg-white shadow-sm border border-gray-200'>
          <CardHeader>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <CardTitle className='flex items-center gap-2 text-gray-900'>
                  <CalendarIcon className='h-5 w-5 text-amber-500' />
                  {mode === 'manage' ? 'Manage Availability' : 'Booking Calendar'}
                </CardTitle>
                <CardDescription className='text-gray-500'>
                  {mode === 'manage'
                    ? 'View and manage your availability and bookings'
                    : 'Select a date to view available time slots'}
                </CardDescription>
              </div>

              {/* Month nav */}
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentDate((d) => subMonths(d, 1))}
                  className='h-8 w-8 p-0'
                  aria-label='Previous month'
                >
                  <ChevronLeft className='h-4 w-4' />
                </Button>
                <span className='text-sm font-bold text-gray-700 min-w-[110px] text-center'>
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                  className='h-8 w-8 p-0'
                  aria-label='Next month'
                >
                  <ChevronRight className='h-4 w-4' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setCurrentDate(new Date())}
                  className='h-8 ml-1 text-xs text-gray-500'
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {/* Legend */}
              <div className='flex flex-wrap gap-3 text-xs'>
                <LegendDot color='bg-emerald-100 border-emerald-300' label='Available' />
                <LegendDot color='bg-blue-100 border-blue-300' label='Partially Booked' />
                <LegendDot color='bg-gray-200 border-gray-400' label='Fully Booked' />
                <LegendDot color='bg-red-100 border-red-300' label='Blocked' />
                <LegendDot color='bg-slate-100 border-slate-200' label='Day Off' />
              </div>

              {/* Calendar Grid */}
              <div className='rounded-xl border border-gray-200 overflow-hidden bg-gray-50/40'>
                {/* Day headers */}
                <div className='grid grid-cols-7 bg-white border-b border-gray-200'>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        'py-2.5 text-center text-[11px] font-bold uppercase tracking-wider border-r border-gray-100 last:border-r-0',
                        i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-600'
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className='grid grid-cols-7'>
                  {calendarDays.map((day) => {
                    const info = getDayInfo(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDayToday = isToday(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const tile = tileStyles(info.status, !isCurrentMonth);

                    return (
                      <button
                        key={day.toISOString()}
                        type='button'
                        onClick={() => handleDateClick(day)}
                        disabled={loading}
                        className={cn(
                          'relative text-left border-r border-b border-gray-100 last:border-r-0 min-h-[88px] sm:min-h-[100px] transition-all group',
                          tile.bg,
                          isSelected && 'ring-2 ring-inset ring-amber-400'
                        )}
                      >
                        <div className='p-2 flex items-start justify-between'>
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                              isDayToday
                                ? 'bg-amber-500 text-white'
                                : !isCurrentMonth
                                  ? 'text-gray-300'
                                  : tile.text,
                              info.status === 'blocked' && 'line-through opacity-70'
                            )}
                          >
                            {format(day, 'd')}
                          </span>

                          {info.status !== 'available' && info.status !== 'off' && isCurrentMonth && (
                            <span
                              className={cn(
                                'inline-flex items-center justify-center h-4 w-4 rounded-full text-[8px] font-bold',
                                tile.dot
                              )}
                            >
                              {info.status === 'blocked' ? '✕' : ''}
                            </span>
                          )}
                        </div>

                        {/* Appointment chips */}
                        <div className='px-1 pb-1 space-y-0.5'>
                          {info.appointments.slice(0, 2).map((apt) => (
                            <div
                              key={apt.id}
                              className='bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] text-left'
                            >
                              <p className='font-semibold text-gray-700 truncate'>{apt.title}</p>
                              <p className='text-gray-400 text-[9px]'>
                                {format(new Date(apt.startTime), 'h:mm a')}
                              </p>
                            </div>
                          ))}
                          {info.appointments.length > 2 && (
                            <p className='text-[9px] text-gray-400 px-1'>
                              +{info.appointments.length - 2} more
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected day details — moved BELOW the calendar so calendar fills full width */}
        <Card className='rounded-xl bg-white shadow-sm border border-gray-200'>
          <CardHeader>
            <div className='flex items-start justify-between gap-3 flex-wrap'>
              <div>
                <CardTitle className='text-gray-900'>
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
                <CardDescription>
                  <Badge
                    className={cn(
                      'mt-1 font-medium',
                      selectedInfo.status === 'available' &&
                        'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                      selectedInfo.status === 'partial' &&
                        'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                      selectedInfo.status === 'booked' &&
                        'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
                      selectedInfo.status === 'blocked' &&
                        'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
                      selectedInfo.status === 'off' &&
                        'bg-slate-50 text-slate-600 border-slate-200',
                      selectedInfo.status === 'past' &&
                        'bg-amber-50 text-amber-700 border-amber-200',
                      selectedInfo.status === 'too-far' &&
                        'bg-amber-50 text-amber-700 border-amber-200'
                    )}
                  >
                    {selectedInfo.status === 'available' && (
                      <CheckCircle2 className='h-3 w-3 mr-1' />
                    )}
                    {selectedInfo.status === 'blocked' && <XCircle className='h-3 w-3 mr-1' />}
                    {selectedInfo.status === 'off' && <Lock className='h-3 w-3 mr-1' />}
                    {STATUS_LABEL[selectedInfo.status]}
                  </Badge>
                </CardDescription>
              </div>

              {mode === 'manage' && (
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-gray-200 text-gray-700 hover:bg-gray-50'
                    onClick={() => setBlockModalOpen(true)}
                  >
                    <XCircle className='h-3.5 w-3.5 mr-1.5' />
                    Block Dates
                  </Button>
                  {selectedInfo.status === 'blocked' && (
                    <Button
                      variant='outline'
                      size='sm'
                      className='border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      onClick={handleUnblock}
                    >
                      <CheckCircle2 className='h-3.5 w-3.5 mr-1.5' />
                      Unblock This Date
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedInfo.appointments.length > 0 ? (
              <div className='space-y-2'>
                <h4 className='text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1.5'>
                  <Clock className='h-3.5 w-3.5' />
                  Scheduled Appointments
                </h4>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  {selectedInfo.appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className='p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white transition-colors'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <p className='text-sm font-bold text-gray-900 truncate'>{apt.title}</p>
                          <p className='text-xs text-gray-500'>
                            {format(new Date(apt.startTime), 'h:mm a')} -{' '}
                            {format(new Date(apt.endTime), 'h:mm a')}
                          </p>
                          <Badge
                            variant='outline'
                            className='text-[10px] mt-1 capitalize border-gray-200 text-gray-600'
                          >
                            {apt.serviceType}
                          </Badge>
                        </div>
                        <Badge
                          className={cn(
                            'text-[10px] capitalize shrink-0',
                            apt.status === 'confirmed' &&
                              'bg-emerald-50 text-emerald-700 border-emerald-200',
                            apt.status === 'completed' &&
                              'bg-blue-50 text-blue-700 border-blue-200'
                          )}
                        >
                          {apt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedInfo.status === 'blocked' ? (
              <div className='text-center py-8'>
                <XCircle className='h-10 w-10 mx-auto mb-2 text-red-400' />
                <p className='text-sm font-bold text-gray-900'>This date is blocked</p>
                <p className='text-xs text-gray-500 mt-0.5'>Customers cannot book on this day</p>
              </div>
            ) : selectedInfo.status === 'off' ? (
              <div className='text-center py-8'>
                <Lock className='h-10 w-10 mx-auto mb-2 text-gray-300' />
                <p className='text-sm font-bold text-gray-900'>Outside working hours</p>
                <p className='text-xs text-gray-500 mt-0.5'>
                  This day isn&apos;t enabled in your weekly schedule. Update on the Hours tab.
                </p>
              </div>
            ) : selectedInfo.status === 'past' ? (
              <div className='text-center py-8'>
                <Clock className='h-10 w-10 mx-auto mb-2 text-gray-300' />
                <p className='text-sm font-bold text-gray-900'>Inside minimum-notice window</p>
                <p className='text-xs text-gray-500 mt-0.5'>Customers cannot book this close to the date</p>
              </div>
            ) : selectedInfo.status === 'too-far' ? (
              <div className='text-center py-8'>
                <Clock className='h-10 w-10 mx-auto mb-2 text-gray-300' />
                <p className='text-sm font-bold text-gray-900'>Beyond max-advance window</p>
                <p className='text-xs text-gray-500 mt-0.5'>
                  Increase the max-advance days on the Hours tab to allow booking further out
                </p>
              </div>
            ) : (
              <div className='text-center py-8'>
                <CheckCircle2 className='h-10 w-10 mx-auto mb-2 text-emerald-400' />
                <p className='text-sm font-bold text-gray-900'>No appointments scheduled</p>
                <p className='text-xs text-gray-500 mt-0.5'>Available for booking</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className='flex items-center gap-1.5'>
      <span className={cn('h-3 w-3 rounded border', color)} />
      <span className='text-gray-600 font-medium'>{label}</span>
    </div>
  );
}

function tileStyles(status: DayStatus, isOtherMonth: boolean) {
  if (isOtherMonth) {
    return { bg: 'bg-gray-50/50 hover:bg-gray-100', text: 'text-gray-300', dot: '' };
  }
  switch (status) {
    case 'available':
      return { bg: 'bg-emerald-50/40 hover:bg-emerald-50', text: 'text-gray-800', dot: '' };
    case 'partial':
      return { bg: 'bg-blue-50/60 hover:bg-blue-50', text: 'text-gray-800', dot: 'bg-blue-500 text-white' };
    case 'booked':
      return { bg: 'bg-gray-100 hover:bg-gray-150', text: 'text-gray-700', dot: 'bg-gray-500 text-white' };
    case 'blocked':
      return { bg: 'bg-red-50/70 hover:bg-red-50', text: 'text-red-700', dot: 'bg-red-500 text-white' };
    case 'off':
      return { bg: 'bg-slate-50 hover:bg-slate-100', text: 'text-gray-400', dot: '' };
    case 'past':
      return { bg: 'bg-gray-50 hover:bg-gray-100 opacity-60', text: 'text-gray-400', dot: '' };
    case 'too-far':
      return { bg: 'bg-gray-50 hover:bg-gray-100 opacity-60', text: 'text-gray-400', dot: '' };
  }
}
