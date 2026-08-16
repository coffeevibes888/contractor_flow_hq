'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, Play, Square, Coffee, MapPin, 
  AlertCircle, CheckCircle, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface TimeClockPageProps {
  teamMemberId: string;
  companyName: string;
  activeEntry: {
    id: string;
    clockIn: string;
    breakMinutes: number;
    propertyName?: string | null;
    notes?: string | null;
  } | null;
  todayEntries: Array<{
    id: string;
    clockIn: string;
    clockOut: string | null;
    breakMinutes: number;
    totalMinutes: number | null;
    propertyName?: string | null;
  }>;
  weeklyMinutes: number;
  todayShift: {
    id: string;
    startTime: string;
    endTime: string;
    propertyName?: string | null;
  } | null;
  properties: Array<{ id: string; name: string }>;
}

export function TimeClockPage({
  companyName,
  activeEntry,
  todayEntries,
  weeklyMinutes,
  todayShift,
  properties,
}: TimeClockPageProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [isTakingBreak, setIsTakingBreak] = useState(false);
  const [localActiveEntry, setLocalActiveEntry] = useState(activeEntry);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatShiftTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Calculate current session time
  const getSessionMinutes = () => {
    if (!localActiveEntry) return 0;
    const clockIn = new Date(localActiveEntry.clockIn);
    return Math.floor((currentTime.getTime() - clockIn.getTime()) / 60000) - (localActiveEntry.breakMinutes || 0);
  };

  // Calculate today's total hours
  const getTodayMinutes = () => {
    let total = todayEntries.reduce((sum, e) => sum + (e.totalMinutes || 0), 0);
    if (localActiveEntry) {
      total += getSessionMinutes();
    }
    return total;
  };

  const handleClockIn = async () => {
    setIsClockingIn(true);
    try {
      // Get GPS location
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch {
          // Location not available
        }
      }

      const res = await fetch('/api/employee/time/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          location,
          propertyId: selectedProperty || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Clocked in successfully!');
        setLocalActiveEntry({
          id: data.timeEntryId,
          clockIn: data.clockIn,
          breakMinutes: 0,
          propertyName: properties.find(p => p.id === selectedProperty)?.name,
        });
      } else {
        toast.error(data.message || 'Failed to clock in');
      }
    } catch {
      toast.error('Failed to clock in');
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!localActiveEntry) return;
    
    setIsClockingOut(true);
    try {
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch {
          // Location not available
        }
      }

      const res = await fetch('/api/employee/time/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timeEntryId: localActiveEntry.id,
          location,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Clocked out! Total: ${formatMinutes(data.totalMinutes)}`);
        setLocalActiveEntry(null);
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to clock out');
      }
    } catch {
      toast.error('Failed to clock out');
    } finally {
      setIsClockingOut(false);
    }
  };

  const handleTakeBreak = async () => {
    if (!localActiveEntry) return;
    
    setIsTakingBreak(true);
    try {
      const res = await fetch('/api/employee/time/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add',
          breakMinutes,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`${breakMinutes} minute break recorded`);
        setLocalActiveEntry({
          ...localActiveEntry,
          breakMinutes: data.totalBreakMinutes,
        });
        setShowBreakDialog(false);
      } else {
        toast.error(data.message || 'Failed to record break');
      }
    } catch {
      toast.error('Failed to record break');
    } finally {
      setIsTakingBreak(false);
    }
  };

  const weeklyHours = weeklyMinutes / 60;
  const overtimeThreshold = 40;
  const isApproachingOvertime = weeklyHours >= 35;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Time Clock</h1>
        <p className="text-slate-400 mt-1">{companyName}</p>
      </div>

      {/* Main Clock Card */}
      <Card className="border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10" />
        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Time Display */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Current Time</p>
                <p className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-mono">
                  {formatTime(currentTime)}
                </p>
                <p className="text-slate-400 mt-2">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                {localActiveEntry ? (
                  <>
                    <span className="flex items-center gap-2 text-emerald-400">
                      <span className="h-3 w-3 bg-emerald-400 rounded-full animate-pulse" />
                      Clocked In
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-white font-mono">
                      {formatMinutes(getSessionMinutes())} this session
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">Not clocked in</span>
                )}
              </div>
            </div>

            {/* Clock Actions */}
            <div className="flex flex-col gap-3">
              {!localActiveEntry && (
                <div className="mb-2">
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10">
                      <SelectValue placeholder="Select location (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Locations</SelectItem>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {localActiveEntry ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setShowBreakDialog(true)}
                    variant="outline"
                    size="lg"
                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    Take Break
                  </Button>
                  <Button
                    onClick={handleClockOut}
                    disabled={isClockingOut}
                    size="lg"
                    className="bg-red-600 hover:bg-red-500 text-white px-8"
                  >
                    {isClockingOut ? (
                      <span className="animate-spin mr-2">⏳</span>
                    ) : (
                      <Square className="h-5 w-5 mr-2" />
                    )}
                    Clock Out
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleClockIn}
                  disabled={isClockingIn}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8"
                >
                  {isClockingIn ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  Clock In
                </Button>
              )}
            </div>
          </div>

          {/* Active Entry Info */}
          {localActiveEntry && (
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">Clock In</p>
                <p className="text-white font-mono">
                  {new Date(localActiveEntry.clockIn).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Location</p>
                <p className="text-white flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {localActiveEntry.propertyName || 'All Locations'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Break Time</p>
                <p className="text-amber-400 font-mono">
                  {formatMinutes(localActiveEntry.breakMinutes)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Working Time</p>
                <p className="text-emerald-400 font-mono">
                  {formatMinutes(getSessionMinutes())}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formatMinutes(getTodayMinutes())}</p>
                <p className="text-xs text-slate-400">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-white/10 ${isApproachingOvertime ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/60'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isApproachingOvertime ? 'bg-amber-500/20' : 'bg-violet-500/20'}`}>
                <Timer className={`h-5 w-5 ${isApproachingOvertime ? 'text-amber-400' : 'text-violet-400'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{weeklyHours.toFixed(1)}h</p>
                <p className="text-xs text-slate-400">This Week</p>
              </div>
            </div>
            {isApproachingOvertime && (
              <p className="text-xs text-amber-400 mt-2">
                {weeklyHours >= overtimeThreshold ? 'In overtime!' : `${(overtimeThreshold - weeklyHours).toFixed(1)}h until overtime`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{todayEntries.length}</p>
                <p className="text-xs text-slate-400">Entries Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-800/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Coffee className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatMinutes(todayEntries.reduce((sum, e) => sum + e.breakMinutes, 0) + (localActiveEntry?.breakMinutes || 0))}
                </p>
                <p className="text-xs text-slate-400">Breaks Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Shift */}
      {todayShift && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-emerald-400" />
              Today&apos;s Scheduled Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">
                  {formatShiftTime(todayShift.startTime)} - {formatShiftTime(todayShift.endTime)}
                </p>
                {todayShift.propertyName && (
                  <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {todayShift.propertyName}
                  </p>
                )}
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Scheduled
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Time Entries */}
      <Card className="border-white/10 bg-slate-800/60">
        <CardHeader>
          <CardTitle className="text-white">Today&apos;s Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 && !localActiveEntry ? (
            <div className="text-center py-8 text-slate-400">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No time entries today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-white/5"
                >
                  <div>
                    <p className="text-white font-mono">
                      {new Date(entry.clockIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {' - '}
                      {entry.clockOut 
                        ? new Date(entry.clockOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : <span className="text-emerald-400">Active</span>
                      }
                    </p>
                    {entry.propertyName && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {entry.propertyName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono">
                      {entry.totalMinutes ? formatMinutes(entry.totalMinutes) : '-'}
                    </p>
                    {entry.breakMinutes > 0 && (
                      <p className="text-xs text-amber-400">
                        {formatMinutes(entry.breakMinutes)} break
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Break Dialog */}
      <Dialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Coffee className="h-5 w-5 text-amber-400" />
              Record Break
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-slate-400 text-sm">
              Select the duration of your break. This will be deducted from your working time.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[10, 15, 30, 45, 60, 90].map((mins) => (
                <Button
                  key={mins}
                  variant={breakMinutes === mins ? 'default' : 'outline'}
                  onClick={() => setBreakMinutes(mins)}
                  className={breakMinutes === mins 
                    ? 'bg-amber-600 hover:bg-amber-500' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                >
                  {mins} min
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <AlertCircle className="h-4 w-4" />
              <span>California law requires a 30-min meal break for shifts over 5 hours</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBreakDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTakeBreak}
              disabled={isTakingBreak}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {isTakingBreak ? 'Recording...' : `Record ${breakMinutes} min Break`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
