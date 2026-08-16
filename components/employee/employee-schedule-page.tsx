'use client';

import { useState } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Shift {
  id: string;
  date: string;      // ISO date string
  startTime: string; // "09:00" format
  endTime: string;   // "17:00" format
  notes?: string | null;
  status: string;
  propertyName?: string | null;
}

interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface EmployeeSchedulePageProps {
  shifts: Shift[];
  availability: Availability[];
}

export function EmployeeSchedulePage({ shifts, availability }: EmployeeSchedulePageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getShiftsForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate.toDateString() === date.toDateString();
    });
  };

  const formatTime = (time: string) => {
    // Convert "09:00" to "9:00 AM"
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  };

  // Get upcoming shifts
  const upcomingShifts = shifts
    .filter(s => new Date(s.date) >= new Date(new Date().toDateString()))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Schedule</h1>
        <p className="text-slate-400">View your upcoming shifts and work schedule</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 border-white/10 bg-slate-800/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">{monthName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth} className="border-white/10">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth} className="border-white/10">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first of the month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayShifts = getShiftsForDay(day);
                const hasShift = dayShifts.length > 0;
                
                return (
                  <div
                    key={day}
                    className={`aspect-square p-1 rounded-lg border transition-colors ${
                      isToday(day)
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : hasShift
                        ? 'border-violet-500/30 bg-violet-500/10'
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`text-xs font-medium ${
                      isToday(day) ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {day}
                    </div>
                    {hasShift && (
                      <div className="mt-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Shifts */}
        <Card className="border-white/10 bg-slate-800/60">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" />
              Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming shifts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((shift) => (
                  <div 
                    key={shift.id}
                    className="p-3 rounded-lg bg-slate-900/60 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium">
                        {new Date(shift.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                        {shift.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </p>
                    {shift.notes && (
                      <p className="text-xs text-slate-500 mt-1">{shift.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
