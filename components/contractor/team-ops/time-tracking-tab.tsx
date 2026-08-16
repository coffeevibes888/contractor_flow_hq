'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Play, Square, Plus, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  getWhosWorkingNow,
  getTimeEntries,
  clockIn,
  clockOut,
  getActiveTimeEntry,
  createManualTimeEntry,
} from '@/lib/actions/team-operations.actions';
import { formatDistanceToNow, format } from 'date-fns';

interface ActiveWorker {
  timeEntryId: string;
  teamMemberId: string;
  name: string;
  image: string | null;
  clockIn: Date;
  propertyName: string;
  minutesWorked: number;
}

interface TimeEntry {
  id: string;
  teamMemberName: string;
  propertyName: string | null | undefined;
  clockIn: Date;
  clockOut: Date | null;
  breakMinutes: number;
  totalMinutes: number | null;
  isManual: boolean;
  approvalStatus: string;
  notes: string | null;
}

interface TeamMember {
  id: string;
  name: string;
}

/**
 * TimeTrackingTab — light-theme rebuild.
 *
 * Originally rendered with white-on-slate-900 surfaces, which became
 * invisible after this tab was inserted into the white contractor
 * dashboard layout. Every header, label, table cell and empty state now
 * uses gray-700/800/900 text on white surfaces with explicit borders so
 * content reads on the page, not as ghost text.
 */
export default function TimeTrackingTab() {
  const [activeWorkers, setActiveWorkers] = useState<ActiveWorker[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [myActiveEntry, setMyActiveEntry] = useState<{ id: string; clockIn: Date } | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadActiveWorkers, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [workersResult, entriesResult, activeResult, membersRes] = await Promise.all([
        getWhosWorkingNow(),
        getTimeEntries(),
        getActiveTimeEntry(),
        fetch('/api/landlord/team/members').then(r => r.json()).catch(() => ({ success: false, members: [] })),
      ]);

      if (workersResult.success) {
        setActiveWorkers(workersResult.workers.map(w => ({ ...w, clockIn: new Date(w.clockIn) })));
      }
      if (entriesResult.success) {
        setTimeEntries(entriesResult.entries.map(e => ({
          ...e,
          clockIn: new Date(e.clockIn),
          clockOut: e.clockOut ? new Date(e.clockOut) : null,
        })));
      }
      if (activeResult.success && activeResult.entry) {
        setMyActiveEntry({ id: activeResult.entry.id, clockIn: new Date(activeResult.entry.clockIn) });
      } else {
        // The owner is not currently clocked in — make sure stale state is
        // cleared. Without this, the card kept saying "Clocked in" after
        // a clock-out from another tab/session.
        setMyActiveEntry(null);
      }
      if (membersRes.success && membersRes.members) {
        setTeamMembers(membersRes.members
          .filter((m: { user: { name: string } | null }) => m.user !== null)
          .map((m: { id: string; user: { name: string } | null }) => ({
            id: m.id,
            name: m.user?.name || 'Unknown',
          })));
      }
    } catch (error) {
      console.error('Failed to load time tracking data:', error);
      toast.error('Failed to load time tracking data');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadActiveWorkers() {
    const result = await getWhosWorkingNow();
    if (result.success) {
      setActiveWorkers(result.workers.map(w => ({ ...w, clockIn: new Date(w.clockIn) })));
    }
  }

  async function handleClockIn() {
    startTransition(async () => {
      // Try to get GPS location
      let location: { lat: number; lng: number } | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        // GPS not available, continue without it
      }

      const result = await clockIn({ location });
      if (result.success) {
        toast.success(result.message);
        loadData();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function handleClockOut() {
    if (!myActiveEntry) return;

    startTransition(async () => {
      let location: { lat: number; lng: number } | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        // GPS not available
      }

      const result = await clockOut({ timeEntryId: myActiveEntry.id, location });
      if (result.success) {
        toast.success(result.message);
        setMyActiveEntry(null);
        loadData();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function handleManualEntry(formData: FormData) {
    const teamMemberId = formData.get('teamMemberId') as string;
    const date = formData.get('date') as string;
    const clockInTime = formData.get('clockIn') as string;
    const clockOutTime = formData.get('clockOut') as string;
    const breakMinutes = parseInt(formData.get('breakMinutes') as string) || 0;
    const notes = formData.get('notes') as string;

    const clockInDate = new Date(`${date}T${clockInTime}`);
    const clockOutDate = new Date(`${date}T${clockOutTime}`);

    startTransition(async () => {
      const result = await createManualTimeEntry({
        teamMemberId,
        clockIn: clockInDate.toISOString(),
        clockOut: clockOutDate.toISOString(),
        breakMinutes,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        setIsManualOpen(false);
        loadData();
      } else {
        toast.error(result.message);
      }
    });
  }

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  return (
    <div className="space-y-6">
      {/* Clock In/Out Card for Current User */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Your Time Clock</h3>
            {myActiveEntry ? (
              <p className="text-white/85 text-sm">
                Clocked in {formatDistanceToNow(myActiveEntry.clockIn, { addSuffix: true })}
              </p>
            ) : (
              <p className="text-white/85 text-sm">Not currently clocked in</p>
            )}
          </div>
          {myActiveEntry ? (
            <Button
              onClick={handleClockOut}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Square className="h-4 w-4 mr-2" />
              Clock Out
            </Button>
          ) : (
            <Button
              onClick={handleClockIn}
              disabled={isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Clock In
            </Button>
          )}
        </div>
      </div>

      {/* Who's Working Now */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            Who&apos;s Working Now
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {activeWorkers.length} active
            </span>
          </h3>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-24" />
            ))}
          </div>
        ) : activeWorkers.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No team members currently clocked in</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWorkers.map(worker => (
              <div
                key={worker.timeEntryId}
                className="rounded-xl bg-white border border-emerald-200 shadow-sm p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{worker.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{worker.propertyName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-emerald-600 font-mono text-sm font-semibold">
                      {formatMinutes(worker.minutesWorked)}
                    </div>
                    <div className="text-xs text-gray-400">working</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Time Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Recent Time Entries</h3>
          <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                <Plus className="h-4 w-4 mr-2" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border border-gray-200">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Add Manual Time Entry</DialogTitle>
              </DialogHeader>
              <form action={handleManualEntry} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Team Member</Label>
                  <Select name="teamMemberId" required>
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Date</Label>
                  <Input type="date" name="date" required className="bg-white border-gray-200" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Clock In</Label>
                    <Input type="time" name="clockIn" required className="bg-white border-gray-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Clock Out</Label>
                    <Input type="time" name="clockOut" required className="bg-white border-gray-200" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Break (minutes)</Label>
                  <Input type="number" name="breakMinutes" defaultValue="0" min="0" className="bg-white border-gray-200" />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Notes</Label>
                  <Input name="notes" placeholder="Optional notes" className="bg-white border-gray-200" />
                </div>

                <Button type="submit" disabled={isPending} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                  {isPending ? 'Adding...' : 'Add Entry'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wide font-semibold">Team Member</th>
                <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wide font-semibold">Date</th>
                <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wide font-semibold">In</th>
                <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wide font-semibold">Out</th>
                <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wide font-semibold">Total</th>
                <th className="text-left p-4 text-xs text-gray-500 uppercase tracking-wide font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : timeEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No time entries yet</td>
                </tr>
              ) : (
                timeEntries.slice(0, 20).map(entry => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-900 font-medium">{entry.teamMemberName}</td>
                    <td className="p-4 text-gray-700">{format(entry.clockIn, 'MMM d, yyyy')}</td>
                    <td className="p-4 text-gray-700">{format(entry.clockIn, 'h:mm a')}</td>
                    <td className="p-4 text-gray-700">
                      {entry.clockOut ? format(entry.clockOut, 'h:mm a') : (
                        <span className="text-emerald-600 font-semibold">Active</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-900 font-mono">
                      {entry.totalMinutes ? formatMinutes(entry.totalMinutes) : '-'}
                    </td>
                    <td className="p-4">
                      {entry.isManual && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">
                          Manual
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
