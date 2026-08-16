'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';

interface STRCalendarProps {
  properties: any[];
}

export default function STRCalendar({ properties }: STRCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, selectedProperty]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: currentDate.toISOString(),
        ...(selectedProperty !== 'all' && { rentalId: selectedProperty }),
      });

      const res = await fetch(`/api/landlord/str/calendar?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarData(data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigatePrev = () => setCurrentDate(subMonths(currentDate, 1));
  const navigateNext = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getDayData = (day: Date) => {
    if (!calendarData?.calendar) return null;
    return calendarData.calendar.find((d: any) => 
      isSameDay(new Date(d.date), day)
    );
  };

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 shadow-2xl border border-slate-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-black">
            {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {properties.length > 0 && (
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-48 bg-white border-black text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-black">
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="bg-white border-black text-black hover:bg-gray-100"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={navigatePrev}
              className="bg-white border-black text-black hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={navigateNext}
              className="bg-white border-black text-black hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-slate-800/50">
            {weekDayNames.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-sm font-medium text-slate-300 border-r border-white/5 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayData = getDayData(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, new Date());
              const isWeekend = getDay(day) === 0 || getDay(day) === 6;

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    relative min-h-[100px] border-r border-b border-white/5 last:border-r-0 p-2
                    ${!isCurrentMonth ? 'bg-slate-900/40' : ''}
                    ${isToday ? 'bg-violet-600/10' : ''}
                    ${isWeekend && !isToday ? 'bg-slate-800/20' : ''}
                  `}
                >
                  {/* Day Number */}
                  <div className="flex items-start justify-between mb-1">
                    <span
                      className={`
                        inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                        ${isToday 
                          ? 'bg-violet-600 text-white' 
                          : isCurrentMonth 
                            ? 'text-white' 
                            : 'text-slate-600'
                        }
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Bookings */}
                  {loading ? (
                    <div className="animate-pulse bg-white/5 rounded h-5 mb-1" />
                  ) : (
                    <div className="space-y-1">
                      {dayData?.bookings?.slice(0, 2).map((booking: any) => (
                        <div
                          key={booking.id}
                          className="bg-blue-500/20 border border-blue-500/30 rounded px-2 py-1 text-xs text-blue-400 truncate"
                        >
                          {booking.rental.name}
                        </div>
                      ))}
                      {dayData?.blocked?.slice(0, 1).map((blocked: any) => (
                        <div
                          key={blocked.id}
                          className="bg-red-500/20 border border-red-500/30 rounded px-2 py-1 text-xs text-red-400 truncate"
                        >
                          Blocked
                        </div>
                      ))}
                      {dayData?.bookings?.length > 2 && (
                        <div className="text-xs text-slate-500 px-2">
                          +{dayData.bookings.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30" />
            <span className="text-black">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
            <span className="text-black">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/30" />
            <span className="text-black">Available</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
