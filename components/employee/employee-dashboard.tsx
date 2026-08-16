'use client';

import { useState } from 'react';
import { 
  Clock, Calendar, CheckCircle, AlertCircle, 
  Play, Square, MapPin, Umbrella, MessageSquare,
  ChevronRight, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface EmployeeDashboardProps {
  employee: {
    id: string;
    userId: string;
    name: string;
    email: string;
    image?: string;
    role: string;
  };
  company: {
    id: string;
    name: string;
  };
  upcomingShifts: Array<{
    id: string;
    date: string;
    startTime: string; // "09:00" format
    endTime: string;   // "17:00" format
    notes?: string;
  }>;
  todayTimeEntries: Array<{
    id: string;
    clockIn: string;
    clockOut: string | null;
  }>;
  pendingTimeOff: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  isClockedIn: boolean;
  activeTimeEntryId?: string;
}

export function EmployeeDashboard({
  employee,
  company,
  upcomingShifts,
  todayTimeEntries,
  pendingTimeOff,
  isClockedIn,
  activeTimeEntryId,
}: EmployeeDashboardProps) {
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useState(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  });

  const handleClockIn = async () => {
    setClockingIn(true);
    try {
      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch {
          // Location not available, continue without it
        }
      }

      const res = await fetch('/api/employee/time/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });
      
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to clock in');
      }
    } catch (error) {
      alert('Failed to clock in');
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeTimeEntryId) return;
    
    setClockingOut(true);
    try {
      const res = await fetch('/api/employee/time/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeEntryId: activeTimeEntryId }),
      });
      
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to clock out');
      }
    } catch (error) {
      alert('Failed to clock out');
    } finally {
      setClockingOut(false);
    }
  };

  // Calculate hours worked today
  const hoursWorkedToday = todayTimeEntries.reduce((total, entry) => {
    const start = new Date(entry.clockIn);
    const end = entry.clockOut ? new Date(entry.clockOut) : new Date();
    return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  const formatTime = (time: string | Date) => {
    // Handle both "09:00" string format and Date objects
    if (typeof time === 'string' && time.includes(':') && !time.includes('T')) {
      // "09:00" format
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    // Date object or ISO string
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Welcome back, {employee.name.split(' ')[0]}!
          </h1>
          <p className="text-slate-400 mt-1">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Badge className="w-fit bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          {company.name}
        </Badge>
      </div>

      {/* Time Clock Card */}
      <Card className="border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10" />
        <CardContent className="relative p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-400 uppercase tracking-wider">Current Time</p>
              <p className="text-4xl sm:text-5xl font-bold text-white font-mono">
                {formatTime(currentTime)}
              </p>
              <div className="flex items-center gap-2 text-sm">
                {isClockedIn ? (
                  <>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
                      Clocked In
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">
                      {hoursWorkedToday.toFixed(1)} hrs today
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">Not clocked in</span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {isClockedIn ? (
                <Button
                  onClick={handleClockOut}
                  disabled={clockingOut}
                  size="lg"
                  className="bg-red-600 hover:bg-red-500 text-white px-8"
                >
                  {clockingOut ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Square className="h-5 w-5 mr-2" />
                  )}
                  Clock Out
                </Button>
              ) : (
                <Button
                  onClick={handleClockIn}
                  disabled={clockingIn}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8"
                >
                  {clockingIn ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  Clock In
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{hoursWorkedToday.toFixed(1)}</p>
                <p className="text-xs text-slate-400">Hours Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Calendar className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{upcomingShifts.length}</p>
                <p className="text-xs text-slate-400">Upcoming Shifts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Umbrella className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingTimeOff.length}</p>
                <p className="text-xs text-slate-400">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">40</p>
                <p className="text-xs text-slate-400">Weekly Target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Shifts */}
        <Card className="border-white/10 bg-slate-800/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-400" />
              Upcoming Shifts
            </CardTitle>
            <Link href="/employee/schedule">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming shifts scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.slice(0, 4).map((shift) => (
                  <div 
                    key={shift.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-white/5"
                  >
                    <div>
                      <p className="text-white font-medium">{formatDate(shift.date)}</p>
                      <p className="text-sm text-slate-400">
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </p>
                    </div>
                    {shift.notes && (
                      <Badge variant="outline" className="border-white/10 text-slate-400">
                        {shift.notes}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-white/10 bg-slate-800/60">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/employee/time-off" className="block">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition-colors">
                <div className="p-3 rounded-lg bg-amber-500/20">
                  <Umbrella className="h-6 w-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Request Time Off</p>
                  <p className="text-sm text-slate-400">Submit vacation or sick leave</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </div>
            </Link>

            <Link href="/employee/chat" className="block">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition-colors">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <MessageSquare className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Team Chat</p>
                  <p className="text-sm text-slate-400">Message your team</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </div>
            </Link>

            <Link href="/employee/pay" className="block">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition-colors">
                <div className="p-3 rounded-lg bg-emerald-500/20">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">View Pay Stubs</p>
                  <p className="text-sm text-slate-400">Check your earnings</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Pending Time Off Requests */}
      {pendingTimeOff.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Pending Time Off Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTimeOff.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60"
                >
                  <div>
                    <p className="text-white font-medium capitalize">{request.type}</p>
                    <p className="text-sm text-slate-400">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
