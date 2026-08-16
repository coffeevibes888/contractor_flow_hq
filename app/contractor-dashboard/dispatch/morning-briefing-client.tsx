'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  MapPin, Clock, Users, AlertTriangle, CheckCircle, Phone,
  Printer, RefreshCw, CloudSun, Package, Briefcase, UserCheck,
  Navigation, ChevronRight, Sun, Cloud, CloudRain, Zap, Wind,
  ExternalLink, Plus, Calendar, MessageSquare, Route, X,
  GripVertical, ChevronDown, ChevronUp, ShoppingCart, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer { id: string; name: string; phone: string | null; email: string | null }
interface TodayJob {
  id: string; jobNumber: string; title: string; status: string; priority: string;
  address: string | null; city: string | null; state: string | null; zipCode: string | null;
  estimatedStartDate: string | null; estimatedHours: number | null;
  assignedEmployeeIds: string[];
  customer: Customer | null;
}
interface Employee {
  id: string; firstName: string; lastName: string; role: string;
  phone: string | null; photo: string | null; userId: string | null;
}
interface ClockedIn {
  id: string; employeeId: string | null; jobId: string | null;
  clockIn: string; clockInLocation: any;
}
interface LowStockItem {
  id: string; name: string; quantity: number; reorderPoint: number;
  unit: string; category: string;
}
interface UnassignedJob {
  id: string; jobNumber: string; title: string; estimatedStartDate: string | null;
  address: string | null; city: string | null; state: string | null; priority: string;
}
interface Weather { temp: number; description: string; windspeed: number; code: number }
interface RouteLeg { from: string; to: string; distanceMiles: number; durationMinutes: number }
interface RouteResult {
  optimizedOrder: TodayJob[];
  totalDistanceMiles: number | null;
  totalDurationMinutes: number | null;
  legs: RouteLeg[];
  mapsUrl: string;
  note?: string;
}

interface Props {
  businessName: string;
  todayJobs: TodayJob[];
  employees: Employee[];
  clockedIn: ClockedIn[];
  lowStock: LowStockItem[];
  unassignedJobs: UnassignedJob[];
  googleMapsApiKey: string;
}

// ─── Weather helpers ──────────────────────────────────────────────────────────

function weatherIcon(code: number) {
  if (code === 0) return <Sun className="h-5 w-5 text-amber-400" />;
  if (code <= 3) return <Cloud className="h-5 w-5 text-gray-400" />;
  if (code <= 67) return <CloudRain className="h-5 w-5 text-blue-400" />;
  if (code <= 77) return <CloudRain className="h-5 w-5 text-indigo-400" />;
  if (code <= 82) return <CloudRain className="h-5 w-5 text-blue-500" />;
  return <Zap className="h-5 w-5 text-yellow-500" />;
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  return 'Thunderstorm';
}

async function fetchWeatherForZip(zip: string): Promise<Weather | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(zip)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();
    const loc = geoData?.results?.[0];
    if (!loc) return null;
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&windspeed_unit=mph`
    );
    const wxData = await wxRes.json();
    const cur = wxData?.current;
    if (!cur) return null;
    return {
      temp: Math.round(cur.temperature_2m),
      description: weatherLabel(cur.weathercode),
      windspeed: Math.round(cur.windspeed_10m),
      code: cur.weathercode,
    };
  } catch { return null; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-violet-50 text-violet-700 border-violet-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    on_hold: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: 'bg-red-500', high: 'bg-orange-400', normal: 'bg-blue-400', low: 'bg-gray-300',
  };
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${colors[priority] ?? 'bg-gray-300'}`} title={priority} />;
}

function fmtMins(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ─── Crew Assign Popover ──────────────────────────────────────────────────────
// Shown when clicking "Assign Crew" on a job card — lets you toggle employees

function CrewAssignPopover({
  job, employees, onSaved, onClose,
}: {
  job: TodayJob;
  employees: Employee[];
  onSaved: (jobId: string, newIds: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(job.assignedEmployeeIds));
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${job.id}/assign-crew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: [...selected] }),
      });
      if (res.ok) {
        toast.success('Crew updated');
        onSaved(job.id, [...selected]);
        onClose();
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref}
      className="absolute z-50 top-full left-0 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-xl p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-gray-800">Assign Crew</p>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto space-y-1">
        {employees.map((emp) => {
          const checked = selected.has(emp.id);
          return (
            <button key={emp.id} onClick={() => toggle(emp.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                checked ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50 border border-transparent'
              }`}>
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                checked ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
              }`}>
                {checked && <CheckCircle className="h-3 w-3 text-white" />}
              </div>
              {emp.photo ? (
                <img src={emp.photo} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{emp.firstName} {emp.lastName}</p>
                <p className="text-[10px] text-gray-400">{emp.role}</p>
              </div>
            </button>
          );
        })}
        {employees.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No active employees</p>
        )}
      </div>
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <Button size="sm" onClick={save} disabled={saving}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-7">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : `Save (${selected.size})`}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}
          className="border-gray-200 text-xs h-7">Cancel</Button>
      </div>
    </div>
  );
}

// ─── Unassigned Job Row ───────────────────────────────────────────────────────
// Inline row with a popover-style picker so the contractor can assign a crew
// from the dispatch board without bouncing to a job detail page that has no
// assign UI. Mirrors CrewAssignPopover but tuned for the unassigned list.

function UnassignedJobRow({
  job, employees, onAssigned,
}: {
  job: UnassignedJob;
  employees: Employee[];
  onAssigned: (jobId: string, employeeIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${job.id}/assign-crew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: [...selected] }),
      });
      if (res.ok) {
        toast.success('Crew assigned');
        onAssigned(job.id, [...selected]);
        setOpen(false);
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Failed to assign');
      }
    } finally {
      setSaving(false);
    }
  };

  const addr = [job.address, job.city, job.state].filter(Boolean).join(', ');

  return (
    <div className="relative px-4 py-3" ref={ref}>
      <div className="flex items-center gap-3">
        <PriorityDot priority={job.priority} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800">{job.title}</p>
          <p className="text-[10px] text-gray-500">
            {job.jobNumber}{addr ? ` · ${addr}` : ''}
          </p>
          {job.estimatedStartDate && (
            <p className="text-[10px] text-gray-400">
              {new Date(job.estimatedStartDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button
            size="sm"
            onClick={() => setOpen((v) => !v)}
            className="bg-red-500 hover:bg-red-600 text-white text-xs h-7"
          >
            <Users className="h-3 w-3 mr-1" />
            Assign Crew
          </Button>
          <Link href={`/contractor-dashboard/jobs/${job.id}`}>
            <Button size="sm" variant="outline" className="border-gray-200 text-gray-700 text-xs h-7">
              Open
            </Button>
          </Link>
        </div>
      </div>

      {open && (
        <div className="absolute right-4 top-full mt-1 z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-xl p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-gray-800">Assign Crew</p>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1">
            {employees.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No active employees</p>
            ) : (
              employees.map((emp) => {
                const checked = selected.has(emp.id);
                return (
                  <button
                    key={emp.id}
                    onClick={() => toggle(emp.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      checked
                        ? 'bg-amber-50 border border-amber-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        checked ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                      }`}
                    >
                      {checked && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                    {emp.photo ? (
                      <img
                        src={emp.photo}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-[10px] text-gray-400">{emp.role}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex gap-2 pt-1 border-t border-gray-100">
            <Button
              size="sm"
              onClick={save}
              disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-7"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : `Assign (${selected.size})`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-200 text-xs h-7"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Manual Punch Button ──────────────────────────────────────────────────────
// Until the mobile app ships, the contractor admin needs to be able to clock
// employees in and out from the dashboard. This button calls the same
// /api/contractor/time/clock endpoint the mobile app will use, so when the
// app does ship, no API change is needed.
//
// On clock-in, if the employee is assigned to exactly one job today we
// auto-attach that job. Otherwise the entry is a generic shift entry the
// admin can re-assign later from /contractor-dashboard/time-tracking.

function ManualPunchButton({
  employee,
  isClockedIn,
  todayJobs,
}: {
  employee: Employee;
  isClockedIn: boolean;
  todayJobs: TodayJob[];
}) {
  const [busy, setBusy] = useState(false);

  const punch = async (action: 'clock_in' | 'clock_out') => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        action,
        employeeId: employee.id,
      };
      if (action === 'clock_in' && todayJobs.length === 1) {
        body.jobId = todayJobs[0].id;
      }

      const res = await fetch('/api/contractor/time/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          action === 'clock_in'
            ? `${employee.firstName} clocked in`
            : `${employee.firstName} clocked out`
        );
        // Force a reload so the briefing reflects the new clocked-in state
        // and the elapsed timer starts. Cheaper than threading state up.
        setTimeout(() => window.location.reload(), 400);
      } else {
        toast.error(data.error ?? 'Punch failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={() => punch(isClockedIn ? 'clock_out' : 'clock_in')}
      disabled={busy}
      className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors print:hidden ${
        isClockedIn
          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
      } disabled:opacity-50`}
      title={
        isClockedIn
          ? `Clock ${employee.firstName} out`
          : todayJobs.length === 1
            ? `Clock ${employee.firstName} in to ${todayJobs[0].title}`
            : `Clock ${employee.firstName} in (general shift)`
      }
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isClockedIn ? (
        'Clock Out'
      ) : (
        'Clock In'
      )}
    </button>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job, employees, clockedIn, weather, onCrewUpdated,
}: {
  job: TodayJob;
  employees: Employee[];
  clockedIn: ClockedIn[];
  weather: Weather | null;
  onCrewUpdated: (jobId: string, newIds: string[]) => void;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [creatingPo, setCreatingPo] = useState(false);

  const assigned = employees.filter((e) => job.assignedEmployeeIds.includes(e.id));
  const activeClock = clockedIn.filter((c) => c.jobId === job.id);
  const address = [job.address, job.city, job.state].filter(Boolean).join(', ');
  const mapsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : null;
  const startTime = job.estimatedStartDate
    ? new Date(job.estimatedStartDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleSendSms = async () => {
    if (!job.customer?.phone) return;
    setSendingSms(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${job.id}/confirm-sms`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) toast.success(`Confirmation SMS sent to ${job.customer.name}`);
      else toast.error(d.error ?? 'SMS failed');
    } finally {
      setSendingSms(false);
    }
  };

  const handleCreatePo = async () => {
    setCreatingPo(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${job.id}/create-po-from-shortages`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        if (d.poIds?.length > 0) {
          toast.success(d.message);
          window.open(`/contractor-dashboard/purchase-orders/${d.firstPoId}`, '_blank');
        } else {
          toast.info('No shortages found — all materials are in stock');
        }
      } else {
        toast.error(d.error ?? 'Failed to create PO');
      }
    } finally {
      setCreatingPo(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <PriorityDot priority={job.priority} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-gray-400">{job.jobNumber}</span>
              <StatusBadge status={job.status} />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mt-0.5">{job.title}</h3>
            {job.customer && <p className="text-xs text-gray-500">{job.customer.name}</p>}
          </div>
        </div>
        <Link href={`/contractor-dashboard/jobs/${job.id}`}>
          <Button size="sm" variant="outline" className="border-gray-200 text-xs h-7">
            View <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Time + Weather */}
        <div className="flex items-center gap-4 flex-wrap">
          {startTime && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span>{startTime}</span>
              {job.estimatedHours && <span className="text-gray-400">· {job.estimatedHours}h est.</span>}
            </div>
          )}
          {weather && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              {weatherIcon(weather.code)}
              <span>{weather.temp}°F · {weather.description}</span>
              {weather.windspeed > 15 && (
                <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                  <Wind className="h-3 w-3" />{weather.windspeed}mph winds
                </span>
              )}
            </div>
          )}
        </div>

        {/* Address */}
        {address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-600 flex-1 truncate">{address}</span>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 shrink-0">
                <Navigation className="h-3 w-3" /> Directions
              </a>
            )}
          </div>
        )}

        {/* Crew — with inline assign popover */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Crew</p>
            <button onClick={() => setShowAssign((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:text-amber-700">
              <Users className="h-3 w-3" />
              {assigned.length === 0 ? 'Assign Crew' : 'Edit Crew'}
            </button>
          </div>

          {showAssign && (
            <CrewAssignPopover
              job={job}
              employees={employees}
              onSaved={onCrewUpdated}
              onClose={() => setShowAssign(false)}
            />
          )}

          {assigned.length === 0 ? (
            <span className="text-xs text-red-500 font-semibold">⚠ No crew assigned</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assigned.map((emp) => {
                const isClockedIn = activeClock.some((c) => c.employeeId === emp.id);
                return (
                  <div key={emp.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${
                      isClockedIn
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}>
                    {isClockedIn
                      ? <CheckCircle className="h-3 w-3 text-emerald-500" />
                      : <UserCheck className="h-3 w-3 text-gray-400" />}
                    <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                    <span className="text-[9px] text-gray-400">{emp.role}</span>
                    {emp.phone && (
                      <a href={`tel:${emp.phone}`} className="ml-1 text-blue-500 hover:text-blue-600">
                        <Phone className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
          {/* SMS confirmation */}
          {job.customer?.phone && (
            <button onClick={handleSendSms} disabled={sendingSms}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60">
              {sendingSms
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <MessageSquare className="h-3.5 w-3.5" />}
              {sendingSms ? 'Sending…' : `Text ${job.customer.name}`}
            </button>
          )}
          {job.customer?.phone && (
            <a href={`tel:${job.customer.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
          )}
          {/* Create PO from shortages */}
          <button onClick={handleCreatePo} disabled={creatingPo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60">
            {creatingPo
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <ShoppingCart className="h-3.5 w-3.5" />}
            {creatingPo ? 'Creating PO…' : 'Order Missing Materials'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Route Optimizer Panel ────────────────────────────────────────────────────

function RouteOptimizerPanel({
  jobs, businessName,
}: {
  jobs: TodayJob[];
  businessName: string;
}) {
  const [origin, setOrigin] = useState('');
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const addressedJobs = jobs.filter((j) => j.address?.trim());

  const optimize = async () => {
    if (addressedJobs.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/contractor/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origin.trim() || undefined,
          jobs: addressedJobs.map((j) => ({
            id: j.id,
            title: j.title,
            address: [j.address, j.city, j.state, j.zipCode].filter(Boolean).join(', '),
            estimatedHours: j.estimatedHours,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (data.note) toast.info(data.note);
      } else {
        toast.error(data.error ?? 'Route optimization failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (addressedJobs.length < 2) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden print:hidden">
      {/* Header — collapsible */}
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-blue-800">Route Optimizer</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {addressedJobs.length} stops
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-blue-500" /> : <ChevronDown className="h-4 w-4 text-blue-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-blue-100">
          {/* Origin input */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder={`Starting point (e.g. ${businessName} office/warehouse)`}
              className="flex-1 px-3 py-2 rounded-lg border border-blue-200 bg-white text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <Button size="sm" onClick={optimize} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs shrink-0">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Route className="h-3.5 w-3.5" />}
              {loading ? 'Optimizing…' : 'Optimize'}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Summary */}
              {(result.totalDistanceMiles || result.totalDurationMinutes) && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white border border-blue-200">
                  {result.totalDistanceMiles && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{result.totalDistanceMiles} mi</p>
                      <p className="text-[10px] text-gray-500">Total distance</p>
                    </div>
                  )}
                  {result.totalDurationMinutes && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{fmtMins(result.totalDurationMinutes)}</p>
                      <p className="text-[10px] text-gray-500">Drive time</p>
                    </div>
                  )}
                  <div className="flex-1" />
                  <a href={result.mapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                      <Navigation className="h-3.5 w-3.5 mr-1" /> Open in Maps
                    </Button>
                  </a>
                </div>
              )}

              {/* Optimized stop order */}
              <div className="rounded-lg bg-white border border-blue-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-blue-100 bg-blue-50/50">
                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">Optimized Stop Order</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {origin && (
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <span className="h-5 w-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0">S</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">Start: {origin}</p>
                      </div>
                    </div>
                  )}
                  {result.optimizedOrder.map((job, i) => {
                    const leg = result.legs[i];
                    const addr = [job.address, job.city, job.state].filter(Boolean).join(', ');
                    return (
                      <div key={job.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{job.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">{addr}</p>
                          {job.estimatedHours && (
                            <p className="text-[10px] text-gray-400">{job.estimatedHours}h on site</p>
                          )}
                        </div>
                        {leg && (
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-semibold text-blue-700">{leg.distanceMiles} mi</p>
                            <p className="text-[9px] text-gray-400">{fmtMins(leg.durationMinutes)} drive</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {!result.totalDistanceMiles && (
                <a href={result.mapsUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    <Navigation className="h-3.5 w-3.5 mr-1" /> Open Route in Google Maps
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MorningBriefingClient({
  businessName, todayJobs: initialJobs, employees: initialEmployees,
  clockedIn, lowStock, unassignedJobs: initialUnassigned, googleMapsApiKey,
}: Props) {
  const [todayJobs, setTodayJobs] = useState<TodayJob[]>(initialJobs);
  const [employees] = useState<Employee[]>(initialEmployees);
  // Local copy of unassigned jobs so the popover can optimistically remove
  // a job from the red banner the moment a crew is assigned, without
  // waiting for a full page refetch.
  const [unassignedLocal, setUnassignedLocal] = useState<UnassignedJob[]>(initialUnassigned);
  const [weatherMap, setWeatherMap] = useState<Record<string, Weather | null>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Fetch weather for each unique zip
  useEffect(() => {
    const zips = [...new Set(todayJobs.map((j) => j.zipCode).filter(Boolean))] as string[];
    if (zips.length === 0) return;
    Promise.all(zips.map(async (zip) => [zip, await fetchWeatherForZip(zip)] as [string, Weather | null]))
      .then((results) => setWeatherMap(Object.fromEntries(results)));
  }, [todayJobs]);

  const handleCrewUpdated = useCallback((jobId: string, newIds: string[]) => {
    setTodayJobs((prev) =>
      prev.map((j) => j.id === jobId ? { ...j, assignedEmployeeIds: newIds } : j)
    );
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); window.location.reload(); }, 600);
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const clockedInIds = new Set(clockedIn.map((c) => c.employeeId).filter(Boolean));
  const assignedToday = new Set(todayJobs.flatMap((j) => j.assignedEmployeeIds));
  const unassignedEmployees = employees.filter((e) => !assignedToday.has(e.id));

  return (
    <div className="w-full space-y-5 print:space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Morning Briefing</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleRefresh}
            className="border-gray-200 bg-white text-gray-700 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}
            className="border-gray-200 bg-white text-gray-700 text-xs">
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Sheet
          </Button>
          <Link href="/contractor-dashboard/jobs/new">
            <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Print header ── */}
      <div className="hidden print:block border-b-2 border-gray-800 pb-3 mb-4">
        <h1 className="text-2xl font-bold">{businessName} — Daily Crew Sheet</h1>
        <p className="text-sm text-gray-600">{dateStr} · Printed {new Date().toLocaleTimeString()}</p>
      </div>

      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
        {[
          { label: "Today's Jobs", value: todayJobs.length, icon: Briefcase, color: 'from-blue-400 to-indigo-400' },
          { label: 'Crew Clocked In', value: clockedInIds.size, icon: CheckCircle, color: 'from-emerald-400 to-cyan-400' },
          { label: 'Unassigned Jobs', value: unassignedLocal.length, icon: AlertTriangle, color: unassignedLocal.length > 0 ? 'from-red-400 to-rose-400' : 'from-gray-300 to-gray-400' },
          { label: 'Low Stock Alerts', value: lowStock.length, icon: Package, color: lowStock.length > 0 ? 'from-amber-400 to-orange-400' : 'from-gray-300 to-gray-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden print:shadow-none print:border-gray-400">
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${color} opacity-10 rounded-bl-full`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Route Optimizer ── */}
      <RouteOptimizerPanel jobs={todayJobs} businessName={businessName} />

      {/* ── Today's Jobs ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" />
            Today's Jobs ({todayJobs.length})
          </h2>
          <Link href="/contractor-dashboard/jobs?status=scheduled"
            className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 print:hidden">
            All jobs <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {todayJobs.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <CloudSun className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-600">No jobs scheduled for today</p>
            <p className="text-xs text-gray-400 mt-1">Check the weekly schedule or create a new job.</p>
            <div className="flex gap-2 justify-center mt-4">
              <Link href="/contractor-dashboard/jobs/new">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Job
                </Button>
              </Link>
              <Link href="/contractor-dashboard/calendar">
                <Button size="sm" variant="outline" className="border-gray-200 text-xs">View Calendar</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {todayJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                employees={employees}
                clockedIn={clockedIn}
                weather={job.zipCode ? weatherMap[job.zipCode] ?? null : null}
                onCrewUpdated={handleCrewUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Crew Status ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-400">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Crew Status ({employees.length} active)
          </h2>
          <Link href="/contractor-dashboard/team" className="text-xs text-blue-600 hover:text-blue-700 font-medium print:hidden">
            Manage team
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {employees.map((emp) => {
            const isClockedIn = clockedInIds.has(emp.id);
            const empJobs = todayJobs.filter((j) => j.assignedEmployeeIds.includes(emp.id));
            const clockEntry = clockedIn.find((c) => c.employeeId === emp.id);
            const elapsed = clockEntry
              ? Math.floor((Date.now() - new Date(clockEntry.clockIn).getTime()) / 60000)
              : null;
            return (
              <div key={emp.id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative shrink-0">
                  {emp.photo ? (
                    <img src={emp.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${isClockedIn ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[10px] text-gray-500">{emp.role}</p>
                  {empJobs.length > 0 && (
                    <p className="text-[10px] text-amber-600 font-medium truncate">
                      {empJobs.map((j) => j.title).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {isClockedIn ? (
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600">Clocked In</span>
                      {elapsed !== null && <p className="text-[9px] text-gray-400">{fmtMins(elapsed)} on clock</p>}
                    </div>
                  ) : empJobs.length > 0 ? (
                    <span className="text-[10px] font-semibold text-blue-600">Assigned · Not clocked in</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">Available</span>
                  )}
                </div>
                {emp.phone && (
                  <a href={`tel:${emp.phone}`} className="shrink-0 p-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors print:hidden">
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
                <ManualPunchButton
                  employee={emp}
                  isClockedIn={isClockedIn}
                  todayJobs={empJobs}
                />
              </div>
            );
          })}
          {employees.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">
              No active employees.{' '}
              <Link href="/contractor-dashboard/employees" className="text-amber-600 underline">Add team members</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Unassigned Jobs ── */}
      {unassignedLocal.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden print:border-gray-400 print:bg-white">
          <div className="flex items-center gap-2 p-4 border-b border-red-100 print:border-gray-200">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-bold text-red-800 print:text-gray-800">
              Unassigned Jobs ({unassignedLocal.length})
            </h2>
          </div>
          <div className="divide-y divide-red-100 print:divide-gray-200">
            {unassignedLocal.map((job) => (
              <UnassignedJobRow
                key={job.id}
                job={job}
                employees={employees}
                onAssigned={(jobId, employeeIds) => {
                  if (employeeIds.length > 0) {
                    setUnassignedLocal((prev) => prev.filter((j) => j.id !== jobId));
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Low Stock Alerts ── */}
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden print:border-gray-400 print:bg-white">
          <div className="flex items-center justify-between p-4 border-b border-amber-100 print:border-gray-200">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-800 print:text-gray-800">
                Inventory Alerts ({lowStock.length})
              </h2>
            </div>
            <Link href="/contractor-dashboard/inventory"
              className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1 print:hidden">
              View inventory <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-amber-100 print:divide-gray-200">
            {lowStock.map((item) => {
              const shortage = item.reorderPoint - item.quantity;
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{item.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{item.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.quantity} {item.unit} in stock
                    </span>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      {item.quantity === 0 ? 'OUT OF STOCK' : `Need ${shortage} more`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Available crew ── */}
      {unassignedEmployees.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden print:shadow-none">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-gray-400" />
              Available Today ({unassignedEmployees.length} not assigned)
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {unassignedEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700">
                <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                <span className="text-gray-400">{emp.role}</span>
                {emp.phone && (
                  <a href={`tel:${emp.phone}`} className="text-blue-500 hover:text-blue-600 print:hidden">
                    <Phone className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Print footer ── */}
      <div className="hidden print:block border-t border-gray-300 pt-3 mt-6 text-xs text-gray-500">
        <p>{businessName} · Daily Crew Sheet · {dateStr}</p>
        <p className="mt-1">Foreman signature: _________________________ Date: _____________</p>
      </div>
    </div>
  );
}
