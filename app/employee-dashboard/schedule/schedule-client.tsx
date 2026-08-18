'use client';

import { useState } from 'react';
import {
  Calendar, Clock, MapPin, Briefcase, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  job: { id: string; title: string; jobNumber: string; address: string } | null;
}

interface Job {
  id: string;
  title: string;
  jobNumber: string;
  address: string;
  estimatedStartDate: string | null;
  estimatedHours: number | null;
  status: string;
}

interface Props {
  weekStart: string;
  shifts: Shift[];
  assignedJobs: Job[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleClient({ weekStart, shifts, assignedJobs }: Props) {
  const [view, setView] = useState<'week' | 'list'>('week');
  const startDate = new Date(weekStart);

  // Group shifts by day of week
  const shiftsByDay = DAYS.map((_, i) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    const dayStr = day.toISOString().split('T')[0];
    return {
      date: day,
      dayName: DAYS[i],
      shifts: shifts.filter(s => s.date.startsWith(dayStr)),
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
          <p className="text-sm text-slate-500">
            Week of {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(startDate.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('week')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', view === 'week' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-100')}
          >
            <Calendar className="h-4 w-4 inline mr-1" /> Week
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', view === 'list' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-100')}
          >
            <Briefcase className="h-4 w-4 inline mr-1" /> Jobs
          </button>
        </div>
      </div>

      {/* Week view */}
      {view === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {shiftsByDay.map(({ date, dayName }) => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div key={dayName} className={cn('text-center py-3 border-r last:border-r-0 border-slate-100', isToday && 'bg-orange-50')}>
                  <p className={cn('text-xs font-medium', isToday ? 'text-orange-600' : 'text-slate-500')}>{dayName}</p>
                  <p className={cn('text-lg font-bold', isToday ? 'text-orange-600' : 'text-slate-900')}>{date.getDate()}</p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[200px]">
            {shiftsByDay.map(({ date, dayName, shifts: dayShifts }) => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div key={dayName} className={cn('border-r last:border-r-0 border-slate-100 p-2 space-y-2', isToday && 'bg-orange-50/30')}>
                  {dayShifts.length === 0 ? (
                    <p className="text-xs text-slate-300 text-center mt-4">—</p>
                  ) : (
                    dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={cn(
                          'rounded-lg p-2 text-xs',
                          shift.status === 'completed' ? 'bg-emerald-50 border border-emerald-200' :
                          shift.status === 'cancelled' ? 'bg-slate-50 border border-slate-200 opacity-50' :
                          'bg-blue-50 border border-blue-200'
                        )}
                      >
                        <p className="font-bold text-slate-900">{shift.startTime}–{shift.endTime}</p>
                        {shift.job && (
                          <p className="text-slate-600 truncate mt-0.5">{shift.job.title}</p>
                        )}
                        {shift.status === 'completed' && <CheckCircle className="h-3 w-3 text-emerald-500 mt-1" />}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Jobs list view */}
      {view === 'list' && (
        <div className="space-y-3">
          {assignedJobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No jobs currently assigned to you.</p>
            </div>
          ) : (
            assignedJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        job.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {job.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                      </span>
                      <span className="text-xs text-slate-400">{job.jobNumber}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{job.title}</h3>
                    {job.address && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {job.address}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      {job.estimatedStartDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(job.estimatedStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {job.estimatedHours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> ~{job.estimatedHours}h
                        </span>
                      )}
                    </div>
                  </div>
                  {job.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                      title="Get directions"
                    >
                      <Navigation className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Today's shifts summary */}
      {view === 'week' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" /> Today&apos;s Shifts
          </h2>
          {(() => {
            const todayShifts = shiftsByDay.find(d => d.date.toDateString() === today.toDateString())?.shifts || [];
            if (todayShifts.length === 0) return <p className="text-sm text-slate-500">No shifts scheduled for today.</p>;
            return (
              <div className="space-y-2">
                {todayShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{shift.startTime} – {shift.endTime}</p>
                      {shift.job && <p className="text-xs text-slate-500">{shift.job.title} · {shift.job.address}</p>}
                      {shift.notes && <p className="text-xs text-slate-400 mt-0.5">{shift.notes}</p>}
                    </div>
                    <span className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full',
                      shift.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      shift.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {shift.status}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
