'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FileText, Check, X, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { getTimesheets, getTimesheet, reviewTimesheet } from '@/lib/actions/team-operations.actions';
import { format } from 'date-fns';

interface TimesheetSummary {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: string;
  regularHours: string;
  overtimeHours: string;
  status: string;
  submittedAt: Date | null;
  teamMember: { id: string; name: string; image: string | null };
  entryCount: number;
}

interface TimesheetDetail {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: { toString: () => string };
  regularHours: { toString: () => string };
  overtimeHours: { toString: () => string };
  status: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  teamMember: {
    user: { name: string } | null;
    compensation: { payType: string; hourlyRate: { toString: () => string } | null } | null;
  };
  timeEntries: Array<{
    id: string;
    clockIn: Date;
    clockOut: Date | null;
    totalMinutes: number | null;
    property: { name: string } | null;
  }>;
  reviewedBy: { name: string } | null;
}

export default function TimesheetsTab() {
  const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('submitted');
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTimesheets();
  }, [statusFilter]);

  async function loadTimesheets() {
    setIsLoading(true);
    try {
      const result = await getTimesheets({ status: statusFilter || undefined });
      if (result.success) {
        setTimesheets(result.timesheets.map(ts => ({
          ...ts,
          periodStart: new Date(ts.periodStart),
          periodEnd: new Date(ts.periodEnd),
          submittedAt: ts.submittedAt ? new Date(ts.submittedAt) : null,
        })));
      }
    } catch (error) {
      console.error('Failed to load timesheets:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function openTimesheetDetail(timesheetId: string) {
    const result = await getTimesheet(timesheetId);
    if (result.success && result.timesheet) {
      setSelectedTimesheet({
        ...result.timesheet,
        periodStart: new Date(result.timesheet.periodStart),
        periodEnd: new Date(result.timesheet.periodEnd),
        submittedAt: result.timesheet.submittedAt ? new Date(result.timesheet.submittedAt) : null,
        reviewedAt: result.timesheet.reviewedAt ? new Date(result.timesheet.reviewedAt) : null,
        timeEntries: result.timesheet.timeEntries.map((e: { id: string; clockIn: string | Date; clockOut: string | Date | null; totalMinutes: number | null; property: { name: string } | null }) => ({
          ...e,
          clockIn: new Date(e.clockIn),
          clockOut: e.clockOut ? new Date(e.clockOut) : null,
        })),
      });
      setIsDetailOpen(true);
    }
  }

  async function handleReview(status: 'approved' | 'rejected') {
    if (!selectedTimesheet) return;

    startTransition(async () => {
      const result = await reviewTimesheet({
        timesheetId: selectedTimesheet.id,
        status,
        reviewNotes: reviewNotes || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        setIsDetailOpen(false);
        setSelectedTimesheet(null);
        setReviewNotes('');
        loadTimesheets();
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

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: 'bg-slate-500/20 text-slate-400',
      submitted: 'bg-amber-500/20 text-amber-400',
      approved: 'bg-emerald-500/20 text-emerald-400',
      rejected: 'bg-red-500/20 text-red-400',
      paid: 'bg-blue-500/20 text-blue-400',
    };
    return styles[status] || styles.draft;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {['submitted', 'approved', 'rejected', 'paid', ''].map(status => (
            <Button
              key={status || 'all'}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={`${
                statusFilter === status
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              {status || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {/* Pending Timesheets Alert */}
      {statusFilter === 'submitted' && timesheets.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-amber-400" />
          <span className="text-amber-200">
            {timesheets.length} timesheet{timesheets.length > 1 ? 's' : ''} pending approval
          </span>
        </div>
      )}

      {/* Timesheets List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-24" />
            ))}
          </div>
        ) : timesheets.length === 0 ? (
          <div className="rounded-xl bg-slate-900/60 border border-white/10 p-8 text-center">
            <FileText className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No timesheets found</p>
          </div>
        ) : (
          timesheets.map(ts => (
            <div
              key={ts.id}
              onClick={() => openTimesheetDetail(ts.id)}
              className="rounded-xl bg-slate-900/60 border border-white/10 p-4 cursor-pointer hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{ts.teamMember.name}</div>
                    <div className="text-sm text-slate-400">
                      {format(ts.periodStart, 'MMM d')} - {format(ts.periodEnd, 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">{parseFloat(ts.totalHours).toFixed(1)}h</div>
                    <div className="text-xs text-slate-400">
                      {parseFloat(ts.overtimeHours) > 0 && (
                        <span className="text-amber-400">{parseFloat(ts.overtimeHours).toFixed(1)}h OT</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${getStatusBadge(ts.status)}`}>
                    {ts.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Timesheet Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="bg-slate-900 border-white/10 w-full sm:max-w-xl overflow-y-auto">
          {selectedTimesheet && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">Timesheet Details</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Summary */}
                <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-blue-400" />
                    <span className="text-white font-medium">{selectedTimesheet.teamMember.user?.name || 'Unknown'}</span>
                  </div>
                  <div className="text-sm text-slate-400">
                    {format(selectedTimesheet.periodStart, 'MMM d')} - {format(selectedTimesheet.periodEnd, 'MMM d, yyyy')}
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Total</div>
                      <div className="text-lg font-semibold text-white">
                        {parseFloat(selectedTimesheet.totalHours.toString()).toFixed(1)}h
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Regular</div>
                      <div className="text-lg font-semibold text-white">
                        {parseFloat(selectedTimesheet.regularHours.toString()).toFixed(1)}h
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Overtime</div>
                      <div className="text-lg font-semibold text-amber-400">
                        {parseFloat(selectedTimesheet.overtimeHours.toString()).toFixed(1)}h
                      </div>
                    </div>
                  </div>
                  {selectedTimesheet.teamMember.compensation && (
                    <div className="text-sm text-slate-400 pt-2 border-t border-white/10">
                      Rate: ${selectedTimesheet.teamMember.compensation.hourlyRate?.toString() || '0'}/hr
                    </div>
                  )}
                </div>

                {/* Time Entries */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Time Entries</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedTimesheet.timeEntries.map(entry => (
                      <div
                        key={entry.id}
                        className="rounded-lg bg-slate-800/30 border border-white/5 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-slate-300">
                            {format(entry.clockIn, 'EEE, MMM d')}
                          </div>
                          <div className="text-white font-mono">
                            {entry.totalMinutes ? formatMinutes(entry.totalMinutes) : '-'}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {format(entry.clockIn, 'h:mm a')} - {entry.clockOut ? format(entry.clockOut, 'h:mm a') : 'Active'}
                          {entry.property && ` • ${entry.property.name}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Section */}
                {selectedTimesheet.status === 'submitted' && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div>
                      <label className="text-sm text-slate-300 block mb-2">Review Notes (optional)</label>
                      <Textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add notes about this timesheet..."
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleReview('approved')}
                        disabled={isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReview('rejected')}
                        disabled={isPending}
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Review Info */}
                {selectedTimesheet.reviewedAt && (
                  <div className="text-sm text-slate-400 pt-4 border-t border-white/10">
                    Reviewed by {selectedTimesheet.reviewedBy?.name} on{' '}
                    {format(selectedTimesheet.reviewedAt, 'MMM d, yyyy')}
                    {selectedTimesheet.reviewNotes && (
                      <div className="mt-2 text-slate-500 italic">&quot;{selectedTimesheet.reviewNotes}&quot;</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
