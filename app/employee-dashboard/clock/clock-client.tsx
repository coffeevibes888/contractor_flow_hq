'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock, MapPin, Play, Square, Coffee, CheckCircle,
  AlertTriangle, Loader2, Navigation, Briefcase,
} from 'lucide-react';

interface ActiveEntry {
  id: string;
  clockIn: string;
  clockInLocation: { lat: number; lng: number; address?: string } | null;
  breakMinutes: number;
  jobId: string | null;
  notes: string | null;
}

interface Job {
  id: string;
  title: string;
  jobNumber: string;
  address: string | null;
  city: string | null;
  state: string | null;
}

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  notes: string | null;
  jobId: string | null;
}

interface Props {
  employeeId: string;
  contractorId: string;
  activeEntry: ActiveEntry | null;
  todayJobs: Job[];
  todayEntries: TimeEntry[];
}

export default function ClockClient({ employeeId, contractorId, activeEntry, todayJobs, todayEntries }: Props) {
  const [entry, setEntry] = useState<ActiveEntry | null>(activeEntry);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'success' | 'denied' | 'error'>('idle');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedJobId, setSelectedJobId] = useState(activeEntry?.jobId || '');
  const [notes, setNotes] = useState('');
  const [onBreak, setOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState('0:00:00');

  // Live timer
  useEffect(() => {
    if (!entry) return;
    const interval = setInterval(() => {
      const now = new Date();
      const clockIn = new Date(entry.clockIn);
      const diff = now.getTime() - clockIn.getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [entry]);

  // Get GPS location
  const acquireLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      setGpsStatus('acquiring');
      if (!navigator.geolocation) {
        setGpsStatus('error');
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          setGpsStatus('success');
          resolve(loc);
        },
        (err) => {
          if (err.code === 1) setGpsStatus('denied');
          else setGpsStatus('error');
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  // Clock In
  const handleClockIn = async () => {
    setLoading(true);
    setError('');
    try {
      const loc = await acquireLocation();
      const res = await fetch('/api/employee/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock_in',
          employeeId,
          contractorId,
          jobId: selectedJobId || null,
          location: loc,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to clock in'); return; }
      setEntry({
        id: json.entryId,
        clockIn: json.clockIn,
        clockInLocation: loc,
        breakMinutes: 0,
        jobId: selectedJobId || null,
        notes: notes || null,
      });
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to get location. Please enable GPS.');
    } finally {
      setLoading(false);
    }
  };

  // Clock Out
  const handleClockOut = async () => {
    if (!entry) return;
    setLoading(true);
    setError('');
    try {
      const loc = await acquireLocation().catch(() => null);
      const res = await fetch('/api/employee/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock_out',
          entryId: entry.id,
          employeeId,
          contractorId,
          location: loc,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to clock out'); return; }
      setEntry(null);
      setNotes('');
      // Refresh the page to update today's entries
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Clock out failed');
    } finally {
      setLoading(false);
    }
  };

  // Break management
  const handleBreakStart = () => {
    setOnBreak(true);
    setBreakStart(new Date());
  };

  const handleBreakEnd = async () => {
    if (!breakStart || !entry) return;
    const breakMins = Math.round((new Date().getTime() - breakStart.getTime()) / 60000);
    setOnBreak(false);
    setBreakStart(null);

    // Update break minutes on the server
    await fetch('/api/employee/clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_break',
        entryId: entry.id,
        breakMinutes: breakMins,
      }),
    }).catch(() => {});

    setEntry(prev => prev ? { ...prev, breakMinutes: prev.breakMinutes + breakMins } : null);
  };

  // Calculate total today hours
  const todayTotalMinutes = todayEntries.reduce((sum, e) => {
    if (!e.clockOut) return sum;
    const diff = new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime();
    return sum + Math.round(diff / 60000) - e.breakMinutes;
  }, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Clock In/Out</h1>

      {/* Main clock card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Timer display */}
        <div className={`p-8 text-center ${entry ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-800 to-slate-900'}`}>
          <p className="text-white/70 text-sm font-medium mb-2">
            {entry ? (onBreak ? 'On Break' : 'Clocked In') : 'Not Clocked In'}
          </p>
          <p className="text-5xl font-mono font-bold text-white tracking-wider">
            {entry ? elapsed : '0:00:00'}
          </p>
          {entry && (
            <p className="text-white/60 text-xs mt-2">
              Since {new Date(entry.clockIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {entry.breakMinutes > 0 && ` · ${entry.breakMinutes}m break`}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 space-y-4">
          {/* GPS status */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className={`h-4 w-4 ${
              gpsStatus === 'success' ? 'text-emerald-500' :
              gpsStatus === 'acquiring' ? 'text-amber-500 animate-pulse' :
              gpsStatus === 'denied' ? 'text-red-500' :
              'text-slate-400'
            }`} />
            <span className="text-slate-600">
              {gpsStatus === 'idle' && 'GPS will be captured on clock in/out'}
              {gpsStatus === 'acquiring' && 'Acquiring GPS location...'}
              {gpsStatus === 'success' && `Location captured (${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)})`}
              {gpsStatus === 'denied' && 'Location access denied — please enable GPS'}
              {gpsStatus === 'error' && 'Location unavailable — try again'}
            </span>
          </div>

          {/* Job selector (only when not clocked in) */}
          {!entry && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Briefcase className="h-3.5 w-3.5 inline mr-1" />
                Clock in for job (optional)
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">General — no specific job</option>
                {todayJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.jobNumber} — {job.title} {job.address ? `(${job.address})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={entry ? 'Add clock-out note...' : 'Add clock-in note...'}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!entry ? (
              <button
                onClick={handleClockIn}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Clock In
              </button>
            ) : (
              <>
                {!onBreak ? (
                  <button
                    onClick={handleBreakStart}
                    className="flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold py-4 px-6 rounded-xl transition-colors"
                  >
                    <Coffee className="h-5 w-5" />
                    Break
                  </button>
                ) : (
                  <button
                    onClick={handleBreakEnd}
                    className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors animate-pulse"
                  >
                    <Coffee className="h-5 w-5" />
                    End Break
                  </button>
                )}
                <button
                  onClick={handleClockOut}
                  disabled={loading || onBreak}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-5 w-5" />}
                  Clock Out
                </button>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Today's summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Today&apos;s Log</h2>
        {todayEntries.length === 0 && !entry ? (
          <p className="text-sm text-slate-500">No time entries today yet.</p>
        ) : (
          <div className="space-y-2">
            {todayEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(e.clockIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {' → '}
                      {e.clockOut ? new Date(e.clockOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Active'}
                    </p>
                    {e.notes && <p className="text-xs text-slate-500">{e.notes}</p>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {e.clockOut ? formatDuration(new Date(e.clockIn), new Date(e.clockOut), e.breakMinutes) : '—'}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-600">Total today</span>
              <span className="text-sm font-bold text-slate-900">
                {Math.floor(todayTotalMinutes / 60)}h {todayTotalMinutes % 60}m
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(start: Date, end: Date, breakMins: number): string {
  const diff = end.getTime() - start.getTime();
  const totalMins = Math.round(diff / 60000) - breakMins;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}
