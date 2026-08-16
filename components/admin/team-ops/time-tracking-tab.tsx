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
      <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Your Time Clock</h3>
            {myActiveEntry ? (
              <p className="text-white/80 text-sm">
                Clocked in {formatDistanceToNow(myActiveEntry.clockIn, { addSuffix: true })}
              </p>
            ) : (
              <p className="text-white/80 text-sm">Not currently clocked in</p>
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
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            Who&apos;s Working Now
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
              {activeWorkers.length} active
            </span>
          </h3>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-24" />
            ))}
          </div>
        ) : activeWorkers.length === 0 ? (
          <div className="rounded-xl bg-slate-900/60 border border-white/10 p-8 text-center">
            <Clock className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No team members currently clocked in</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWorkers.map(worker => (
              <div
                key={worker.timeEntryId}
                className="rounded-xl bg-slate-900/60 border border-emerald-500/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{worker.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {worker.propertyName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-mono text-sm">
                      {formatMinutes(worker.minutesWorked)}
                    </div>
                    <div className="text-xs text-slate-500">working</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Time Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Time Entries</h3>
          <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                <Plus className="h-4 w-4 mr-2" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Add Manual Time Entry</DialogTitle>
              </DialogHeader>
              <form action={handleManualEntry} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Team Member</Label>
                  <Select name="teamMemberId" required>
                    <SelectTrigger className="bg-white/5 border-white/10">
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
                  <Label className="text-slate-300">Date</Label>
                  <Input type="date" name="date" required className="bg-white/5 border-white/10" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Clock In</Label>
                    <Input type="time" name="clockIn" required className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Clock Out</Label>
                    <Input type="time" name="clockOut" required className="bg-white/5 border-white/10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Break (minutes)</Label>
                  <Input type="number" name="breakMinutes" defaultValue="0" min="0" className="bg-white/5 border-white/10" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Notes</Label>
                  <Input name="notes" placeholder="Optional notes" className="bg-white/5 border-white/10" />
                </div>

                <Button type="submit" disabled={isPending} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500">
                  {isPending ? 'Adding...' : 'Add Entry'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Team Member</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Date</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">In</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Out</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Total</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : timeEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No time entries yet</td>
                </tr>
              ) : (
                timeEntries.slice(0, 20).map(entry => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{entry.teamMemberName}</td>
                    <td className="p-4 text-slate-300">{format(entry.clockIn, 'MMM d, yyyy')}</td>
                    <td className="p-4 text-slate-300">{format(entry.clockIn, 'h:mm a')}</td>
                    <td className="p-4 text-slate-300">
                      {entry.clockOut ? format(entry.clockOut, 'h:mm a') : (
                        <span className="text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="p-4 text-white font-mono">
                      {entry.totalMinutes ? formatMinutes(entry.totalMinutes) : '-'}
                    </td>
                    <td className="p-4">
                      {entry.isManual && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
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
