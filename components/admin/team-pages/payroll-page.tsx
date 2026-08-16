'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DollarSign, Plus, Gift, Check, User, Clock, Calendar,
  ChevronDown, ChevronRight, Download, Banknote, TrendingUp,
  CreditCard, Building2, Settings, ExternalLink, Wallet,
  CheckCircle2, XCircle, Loader2, Users, FileText,
  ArrowUpRight, ArrowDownRight, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getPendingPayroll,
  processPayroll,
  sendBonusPayment,
  getTeamPayments,
  getTeamMemberCompensation,
  updateTeamMemberCompensation,
} from '@/lib/actions/team-operations.actions';
import { format } from 'date-fns';

// ============= TYPES =============

interface PayrollItem {
  timesheetId: string;
  teamMemberName: string;
  teamMemberId: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: string;
  grossAmount: number;
  regularPay: number;
  overtimePay: number;
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
  role: string;
  hasCompensation: boolean;
}

interface CompensationSetup {
  teamMemberId: string;
  name: string;
  payType: 'hourly' | 'salary';
  hourlyRate: string;
  overtimeRate: string;
  salaryAmount: string;
}

// ============= MAIN COMPONENT =============

export function PayrollPageWrapper() {
  const [pendingPayroll, setPendingPayroll] = useState<PayrollItem[]>([]);
  const [summary, setSummary] = useState<PayrollSummary>({ totalGross: 0, totalFees: 0, count: 0 });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTimesheets, setSelectedTimesheets] = useState<string[]>([]);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [isCompSetupOpen, setIsCompSetupOpen] = useState(false);
  const [isRunPayrollOpen, setIsRunPayrollOpen] = useState(false);
  const [selectedMemberForComp, setSelectedMemberForComp] = useState<CompensationSetup | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'compensation' | 'integrations'>('pending');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [payrollResult, paymentsResult, membersRes, walletRes] = await Promise.all([
        getPendingPayroll(),
        getTeamPayments(),
        fetch('/api/landlord/team/members').then(r => r.json()).catch(() => ({ success: false, members: [] })),
        fetch('/api/wallet/balance').then(r => r.json()).catch(() => null),
      ]);

      if (payrollResult.success && payrollResult.payroll && payrollResult.summary) {
        setPendingPayroll(payrollResult.payroll.map((p: any) => ({
          ...p,
          periodStart: new Date(p.periodStart),
          periodEnd: new Date(p.periodEnd),
        })));
        setSummary(payrollResult.summary);
      }
      if (paymentsResult.success) {
        setPayments(paymentsResult.payments.map((p: any) => ({
          ...p,
          paidAt: p.paidAt ? new Date(p.paidAt) : null,
          period: p.period ? { start: new Date(p.period.start), end: new Date(p.period.end) } : null,
        })));
      }
      if (membersRes.success && membersRes.members) {
        setTeamMembers(membersRes.members
          .filter((m: any) => m.user !== null)
          .map((m: any) => ({
            id: m.id,
            name: m.user?.name || 'Unknown',
            role: m.role,
            hasCompensation: !!m.compensation,
          })));
      }
      // Only surface a balance once Treasury is actually live for this
      // landlord. Until Stripe Treasury is approved/provisioned the endpoint
      // returns available: 0 with treasuryEnabled: false — showing "$0.00"
      // there would be misleading, so we leave the card as "—".
      if (walletRes && walletRes.treasuryEnabled && walletRes.ready && typeof walletRes.available === 'number') {
        setWalletBalance(Number(walletRes.available || 0));
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

  async function openCompensationSetup(member: TeamMember) {
    try {
      const result = await getTeamMemberCompensation(member.id);
      if (result.success) {
        setSelectedMemberForComp({
          teamMemberId: member.id,
          name: member.name,
          payType: (result.compensation?.payType as 'hourly' | 'salary') || 'hourly',
          hourlyRate: result.compensation?.hourlyRate?.toString() || '',
          overtimeRate: result.compensation?.overtimeRate?.toString() || '',
          salaryAmount: result.compensation?.salaryAmount?.toString() || '',
        });
        setIsCompSetupOpen(true);
      }
    } catch {
      setSelectedMemberForComp({
        teamMemberId: member.id,
        name: member.name,
        payType: 'hourly',
        hourlyRate: '',
        overtimeRate: '',
        salaryAmount: '',
      });
      setIsCompSetupOpen(true);
    }
  }

  async function handleSaveCompensation() {
    if (!selectedMemberForComp) return;

    startTransition(async () => {
      const result = await updateTeamMemberCompensation({
        teamMemberId: selectedMemberForComp.teamMemberId,
        payType: selectedMemberForComp.payType,
        hourlyRate: selectedMemberForComp.payType === 'hourly' ? parseFloat(selectedMemberForComp.hourlyRate) || 0 : undefined,
        overtimeRate: selectedMemberForComp.payType === 'hourly' ? parseFloat(selectedMemberForComp.overtimeRate) || undefined : undefined,
        salaryAmount: selectedMemberForComp.payType === 'salary' ? parseFloat(selectedMemberForComp.salaryAmount) || 0 : undefined,
      });
      if (result.success) {
        toast.success('Compensation updated');
        setIsCompSetupOpen(false);
        loadData();
      } else {
        toast.error(result.message);
      }
    });
  }

  const selectedTotal = pendingPayroll
    .filter(p => selectedTimesheets.includes(p.timesheetId))
    .reduce((sum, p) => sum + p.grossAmount, 0);

  const ytdPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.grossAmount), 0);

  const membersWithoutComp = teamMembers.filter(m => !m.hasCompensation && m.role !== 'owner');

  function exportPayrollCSV() {
    let csv = 'Employee,Period Start,Period End,Hours,Gross,Net,Status,Paid Date,Type\n';
    payments.forEach(p => {
      csv += `"${p.teamMemberName}",${p.period ? format(p.period.start, 'yyyy-MM-dd') : ''},${p.period ? format(p.period.end, 'yyyy-MM-dd') : ''},${p.paymentType},${p.grossAmount},${p.netAmount},${p.status},${p.paidAt ? format(p.paidAt, 'yyyy-MM-dd') : ''},${p.paymentType}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative rounded-xl sm:rounded-2xl border border-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-300" />
        <div className="relative p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 border border-white/30">
                <DollarSign className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-black">Payroll</h1>
                <p className="text-xs sm:text-sm text-black/70 mt-0.5">
                  Process payroll, manage compensation, and track payments
                </p>
              </div>
            </div>
            <span className="text-[10px] text-black bg-white/30 px-2 py-1 rounded-full ring-1 ring-black/20 font-semibold">
              Enterprise
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-white p-3 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-[10px] sm:text-xs text-black font-bold">Wallet Balance</div>
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-black mt-1">
            {walletBalance !== null ? `$${walletBalance.toFixed(2)}` : '—'}
          </div>
          <div className="text-[9px] sm:text-[10px] text-black font-semibold">Available for payroll</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-white p-3 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-[10px] sm:text-xs text-black font-bold">Pending Payroll</div>
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-black mt-1">${summary.totalGross.toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-black font-semibold">{summary.count} timesheets ready</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-white p-3 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-[10px] sm:text-xs text-black font-bold">YTD Paid Out</div>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-black mt-1">${ytdPaid.toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-black font-semibold">{payments.filter(p => p.status === 'completed').length} payments</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-white p-3 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-[10px] sm:text-xs text-black font-bold">Team Members</div>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-black mt-1">{teamMembers.length}</div>
          <div className="text-[9px] sm:text-[10px] text-black font-semibold">
            {membersWithoutComp.length > 0 ? `${membersWithoutComp.length} need pay setup` : 'All configured'}
          </div>
        </div>
      </div>

      {/* Alert: Members without compensation */}
      {membersWithoutComp.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-200">
              {membersWithoutComp.length} team member{membersWithoutComp.length > 1 ? 's' : ''} need compensation setup
            </p>
            <p className="text-xs text-amber-300/70 mt-1">
              Set up hourly rates or salary for: {membersWithoutComp.map(m => m.name).join(', ')}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('compensation')}
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 shrink-0"
          >
            Set Up
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1 border border-white/10 overflow-x-auto">
        {[
          { id: 'pending' as const, label: 'Run Payroll', icon: DollarSign },
          { id: 'history' as const, label: 'Payment History', icon: FileText },
          { id: 'compensation' as const, label: 'Compensation', icon: Users },
          { id: 'integrations' as const, label: 'Integrations', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ============= RUN PAYROLL TAB ============= */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsBonusOpen(true)}
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
            >
              <Gift className="h-4 w-4 mr-2" />
              Send Bonus
            </Button>
            {pendingPayroll.length > 0 && (
              <Button
                onClick={handleProcessPayroll}
                disabled={isPending || selectedTimesheets.length === 0}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Process Selected (${selectedTotal.toFixed(2)})
              </Button>
            )}
          </div>

          {/* Pending Payroll List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white/5 rounded-xl h-20" />
              ))}
            </div>
          ) : pendingPayroll.length === 0 ? (
            <div className="rounded-xl bg-slate-900/60 border border-white/10 p-12 text-center">
              <DollarSign className="h-14 w-14 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Payroll</h3>
              <p className="text-slate-400 text-sm mb-1">Approved timesheets will appear here for processing.</p>
              <p className="text-slate-500 text-xs">
                Team members need to submit timesheets → you approve them → then process payroll here.
              </p>
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
                <span className="text-xs text-slate-500 ml-auto self-center">
                  {selectedTimesheets.length} of {pendingPayroll.length} selected
                </span>
              </div>

              <div className="space-y-2">
                {pendingPayroll.map(item => (
                  <div
                    key={item.timesheetId}
                    onClick={() => toggleTimesheet(item.timesheetId)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      selectedTimesheets.includes(item.timesheetId)
                        ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/10'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedTimesheets.includes(item.timesheetId)
                            ? 'bg-sky-500 border-sky-500'
                            : 'border-white/30'
                        }`}>
                          {selectedTimesheets.includes(item.timesheetId) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="h-10 w-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-sky-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{item.teamMemberName}</div>
                          <div className="text-xs text-slate-400">
                            {format(item.periodStart, 'MMM d')} – {format(item.periodEnd, 'MMM d')} · {item.totalHours}h
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">${item.grossAmount.toFixed(2)}</div>
                        {item.overtimePay > 0 && (
                          <div className="text-xs text-amber-400">+${item.overtimePay.toFixed(2)} OT</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============= PAYMENT HISTORY TAB ============= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Payment History</h3>
            {payments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportPayrollCSV}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs text-slate-400 uppercase font-semibold">Employee</th>
                  <th className="text-left p-4 text-xs text-slate-400 uppercase font-semibold hidden sm:table-cell">Type</th>
                  <th className="text-left p-4 text-xs text-slate-400 uppercase font-semibold hidden md:table-cell">Period</th>
                  <th className="text-right p-4 text-xs text-slate-400 uppercase font-semibold">Amount</th>
                  <th className="text-left p-4 text-xs text-slate-400 uppercase font-semibold hidden sm:table-cell">Date</th>
                  <th className="text-left p-4 text-xs text-slate-400 uppercase font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <Banknote className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No payments yet</p>
                      <p className="text-xs mt-1">Processed payroll and bonuses will appear here</p>
                    </td>
                  </tr>
                ) : (
                  payments.slice(0, 50).map(payment => (
                    <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                            <User className="h-4 w-4 text-sky-400" />
                          </div>
                          <span className="text-white font-medium">{payment.teamMemberName}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <Badge className={
                          payment.paymentType === 'bonus'
                            ? 'bg-purple-500/20 text-purple-400 border-0'
                            : 'bg-sky-500/20 text-sky-400 border-0'
                        }>
                          {payment.paymentType}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-400 text-sm hidden md:table-cell">
                        {payment.period
                          ? `${format(payment.period.start, 'MMM d')} – ${format(payment.period.end, 'MMM d')}`
                          : '—'
                        }
                      </td>
                      <td className="p-4 text-right text-white font-mono font-medium">
                        ${parseFloat(payment.grossAmount).toFixed(2)}
                      </td>
                      <td className="p-4 text-slate-300 text-sm hidden sm:table-cell">
                        {payment.paidAt ? format(payment.paidAt, 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="p-4">
                        <Badge className={
                          payment.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border-0'
                            : 'bg-amber-500/20 text-amber-400 border-0'
                        }>
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============= COMPENSATION TAB ============= */}
      {activeTab === 'compensation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Team Compensation</h3>
              <p className="text-sm text-slate-400">Set up pay rates for each team member to enable payroll</p>
            </div>
          </div>

          <div className="space-y-2">
            {teamMembers.length === 0 ? (
              <div className="rounded-xl bg-slate-900/60 border border-white/10 p-12 text-center">
                <Users className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">No team members yet</p>
              </div>
            ) : (
              teamMembers.map(member => (
                <div
                  key={member.id}
                  className="rounded-xl bg-slate-900/60 border border-white/10 p-4 flex items-center justify-between hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-sky-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{member.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{member.role.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {member.hasCompensation ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-0">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Needs Setup
                      </Badge>
                    )}
                    {member.role !== 'owner' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCompensationSetup(member)}
                        className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                      >
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        {member.hasCompensation ? 'Edit' : 'Set Up'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============= INTEGRATIONS TAB ============= */}
      {activeTab === 'integrations' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Payroll Integrations</h3>
            <p className="text-sm text-slate-400">Connect your preferred payroll provider or use built-in processing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Built-in */}
            <div className="rounded-xl bg-slate-900/60 border border-emerald-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Wallet className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Built-in Payroll</h4>
                  <p className="text-xs text-emerald-400">Active</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Process payroll directly from your wallet balance. Supports hourly and salary pay, overtime, and bonuses.
              </p>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>

            {/* Stripe Treasury */}
            <div className="rounded-xl bg-slate-900/60 border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <CreditCard className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Stripe Treasury</h4>
                  <p className="text-xs text-slate-400">Direct deposits & debit cards</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Send payroll via ACH direct deposit. Issue team debit cards for expenses.
              </p>
              <Button size="sm" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Configure
              </Button>
            </div>

            {/* Gusto */}
            <div className="rounded-xl bg-slate-900/60 border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Building2 className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Gusto</h4>
                  <p className="text-xs text-slate-400">Full-service payroll & benefits</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Automated tax filing, direct deposits, W-2s, benefits administration, and compliance.
              </p>
              <Button size="sm" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Connect Gusto
              </Button>
            </div>

            {/* ADP */}
            <div className="rounded-xl bg-slate-900/60 border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Building2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">ADP</h4>
                  <p className="text-xs text-slate-400">Enterprise payroll & HR</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Payroll processing, tax services, time tracking sync, and HR management for larger teams.
              </p>
              <Button size="sm" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Connect ADP
              </Button>
            </div>

            {/* Paychex */}
            <div className="rounded-xl bg-slate-900/60 border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Building2 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Paychex</h4>
                  <p className="text-xs text-slate-400">Payroll, HR & benefits</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Payroll processing, employee benefits, retirement plans, and insurance services.
              </p>
              <Button size="sm" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Connect Paychex
              </Button>
            </div>

            {/* QuickBooks */}
            <div className="rounded-xl bg-slate-900/60 border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">QuickBooks</h4>
                  <p className="text-xs text-slate-400">Accounting & payroll sync</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Sync payroll data with QuickBooks for seamless accounting and tax preparation.
              </p>
              <Button size="sm" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Connect QuickBooks
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============= BONUS DIALOG ============= */}
      <Dialog open={isBonusOpen} onOpenChange={setIsBonusOpen}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-400" />
              Send Bonus Payment
            </DialogTitle>
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
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBonusOpen(false)} className="border-white/10">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-gradient-to-r from-purple-500 to-violet-500">
                {isPending ? 'Sending...' : 'Send Bonus'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============= COMPENSATION SETUP DIALOG ============= */}
      <Dialog open={isCompSetupOpen} onOpenChange={setIsCompSetupOpen}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-sky-400" />
              Compensation Setup — {selectedMemberForComp?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMemberForComp && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Pay Type</Label>
                <Select
                  value={selectedMemberForComp.payType}
                  onValueChange={(v) => setSelectedMemberForComp({ ...selectedMemberForComp, payType: v as 'hourly' | 'salary' })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedMemberForComp.payType === 'hourly' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Hourly Rate ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={selectedMemberForComp.hourlyRate}
                      onChange={(e) => setSelectedMemberForComp({ ...selectedMemberForComp, hourlyRate: e.target.value })}
                      placeholder="25.00"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Overtime Rate ($ — defaults to 1.5× hourly)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={selectedMemberForComp.overtimeRate}
                      onChange={(e) => setSelectedMemberForComp({ ...selectedMemberForComp, overtimeRate: e.target.value })}
                      placeholder={selectedMemberForComp.hourlyRate ? (parseFloat(selectedMemberForComp.hourlyRate) * 1.5).toFixed(2) : '37.50'}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-slate-300">Annual Salary ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={selectedMemberForComp.salaryAmount}
                    onChange={(e) => setSelectedMemberForComp({ ...selectedMemberForComp, salaryAmount: e.target.value })}
                    placeholder="52000.00"
                    className="bg-white/5 border-white/10"
                  />
                  {selectedMemberForComp.salaryAmount && (
                    <p className="text-xs text-slate-500">
                      ≈ ${(parseFloat(selectedMemberForComp.salaryAmount) / 26).toFixed(2)}/biweekly · ${(parseFloat(selectedMemberForComp.salaryAmount) / 2080).toFixed(2)}/hr implied
                    </p>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCompSetupOpen(false)} className="border-white/10">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCompensation}
                  disabled={isPending}
                  className="bg-gradient-to-r from-sky-500 to-cyan-500"
                >
                  {isPending ? 'Saving...' : 'Save Compensation'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
