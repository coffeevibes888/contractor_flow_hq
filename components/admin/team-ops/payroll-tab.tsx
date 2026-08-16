'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, Gift, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPendingPayroll,
  processPayroll,
  sendBonusPayment,
  getTeamPayments,
} from '@/lib/actions/team-operations.actions';
import { format } from 'date-fns';

interface PayrollItem {
  timesheetId: string;
  teamMemberName: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
}

interface PayrollSummary {
  totalGross: number;
  totalFees: number;
  count: number;
}

interface Payment {
  id: string;
  teamMemberName: string;
  paymentType: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
  status: string;
  paidAt: Date | null;
  description: string | null;
  period: { start: Date; end: Date } | null;
}

interface TeamMember {
  id: string;
  name: string;
}

export default function PayrollTab() {
  const [pendingPayroll, setPendingPayroll] = useState<PayrollItem[]>([]);
  const [summary, setSummary] = useState<PayrollSummary>({ totalGross: 0, totalFees: 0, count: 0 });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTimesheets, setSelectedTimesheets] = useState<string[]>([]);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [payrollResult, paymentsResult, membersRes] = await Promise.all([
        getPendingPayroll(),
        getTeamPayments(),
        fetch('/api/landlord/team/members').then(r => r.json()),
      ]);

      if (payrollResult.success && payrollResult.payroll && payrollResult.summary) {
        setPendingPayroll(payrollResult.payroll.map((p: { timesheetId: string; teamMemberName: string; periodStart: Date | string; periodEnd: Date | string; totalHours: string; grossAmount: number; platformFee: number; netAmount: number }) => ({
          ...p,
          periodStart: new Date(p.periodStart),
          periodEnd: new Date(p.periodEnd),
        })));
        setSummary(payrollResult.summary);
      }
      if (paymentsResult.success) {
        setPayments(paymentsResult.payments.map(p => ({
          ...p,
          paidAt: p.paidAt ? new Date(p.paidAt) : null,
          period: p.period ? { start: new Date(p.period.start), end: new Date(p.period.end) } : null,
        })));
      }
      if (membersRes.members) {
        setTeamMembers(membersRes.members
          .filter((m: { user: { name: string } | null }) => m.user !== null)
          .map((m: { id: string; user: { name: string } | null }) => ({
            id: m.id,
            name: m.user?.name || 'Unknown',
          })));
      }
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleTimesheet(timesheetId: string) {
    setSelectedTimesheets(prev =>
      prev.includes(timesheetId)
        ? prev.filter(id => id !== timesheetId)
        : [...prev, timesheetId]
    );
  }

  function selectAll() {
    setSelectedTimesheets(pendingPayroll.map(p => p.timesheetId));
  }

  function deselectAll() {
    setSelectedTimesheets([]);
  }

  async function handleProcessPayroll() {
    if (selectedTimesheets.length === 0) {
      toast.error('Select at least one timesheet to process');
      return;
    }

    if (!confirm(`Process payroll for ${selectedTimesheets.length} timesheet(s)?`)) return;

    startTransition(async () => {
      const result = await processPayroll({ timesheetIds: selectedTimesheets });
      if (result.success) {
        toast.success(result.message);
        setSelectedTimesheets([]);
        loadData();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function handleBonusPayment(formData: FormData) {
    const teamMemberId = formData.get('teamMemberId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;

    startTransition(async () => {
      const result = await sendBonusPayment({ teamMemberId, amount, description });
      if (result.success) {
        toast.success(result.message);
        setIsBonusOpen(false);
        loadData();
      } else {
        toast.error(result.message);
      }
    });
  }

  const selectedTotal = pendingPayroll
    .filter(p => selectedTimesheets.includes(p.timesheetId))
    .reduce((sum, p) => sum + p.grossAmount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black">Pending Payroll</div>
            <DollarSign className="h-4 w-4 text-white/90" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">${summary.totalGross.toFixed(2)}</div>
          <div className="text-xs text-white/80">{summary.count} timesheets ready</div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">Selected</div>
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">${selectedTotal.toFixed(2)}</div>
          <div className="text-xs text-slate-400">{selectedTimesheets.length} selected</div>
        </div>
      </div>

      {/* Pending Payroll */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Pending Payroll</h3>
          <div className="flex gap-2">
            <Dialog open={isBonusOpen} onOpenChange={setIsBonusOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                  <Gift className="h-4 w-4 mr-2" />
                  Send Bonus
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Send Bonus Payment</DialogTitle>
                </DialogHeader>
                <form action={handleBonusPayment} className="space-y-4">
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
                    <Label className="text-slate-300">Amount ($)</Label>
                    <Input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="1"
                      required
                      placeholder="100.00"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Description</Label>
                    <Input
                      name="description"
                      required
                      placeholder="Performance bonus, holiday bonus, etc."
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <Button type="submit" disabled={isPending} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500">
                    {isPending ? 'Sending...' : 'Send Bonus'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {pendingPayroll.length > 0 && (
              <Button
                onClick={handleProcessPayroll}
                disabled={isPending || selectedTimesheets.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Process Selected (${selectedTotal.toFixed(2)})
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-20" />
            ))}
          </div>
        ) : pendingPayroll.length === 0 ? (
          <div className="rounded-xl bg-slate-900/60 border border-white/10 p-8 text-center">
            <DollarSign className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No pending payroll</p>
            <p className="text-xs text-slate-500 mt-1">Approved timesheets will appear here</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs text-slate-400">
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs text-slate-400">
                Deselect All
              </Button>
            </div>

            <div className="space-y-2">
              {pendingPayroll.map(item => (
                <div
                  key={item.timesheetId}
                  onClick={() => toggleTimesheet(item.timesheetId)}
                  className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                    selectedTimesheets.includes(item.timesheetId)
                      ? 'bg-blue-600/20 border-blue-500/50'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                        selectedTimesheets.includes(item.timesheetId)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-white/30'
                      }`}>
                        {selectedTimesheets.includes(item.timesheetId) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{item.teamMemberName}</div>
                        <div className="text-xs text-slate-400">
                          {format(item.periodStart, 'MMM d')} - {format(item.periodEnd, 'MMM d')} • {item.totalHours}h
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">${item.grossAmount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payment History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Payment History</h3>
        <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Team Member</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Type</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Amount</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Date</th>
                <th className="text-left p-4 text-xs text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No payments yet</td>
                </tr>
              ) : (
                payments.slice(0, 20).map(payment => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{payment.teamMemberName}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        payment.paymentType === 'bonus'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {payment.paymentType}
                      </span>
                    </td>
                    <td className="p-4 text-white font-mono">${parseFloat(payment.grossAmount).toFixed(2)}</td>
                    <td className="p-4 text-slate-300">
                      {payment.paidAt ? format(payment.paidAt, 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        payment.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {payment.status}
                      </span>
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
