'use client';

import { useState } from 'react';
import {
  Clock, DollarSign, FileText, CheckCircle, AlertCircle,
  Calendar, TrendingUp, AlertTriangle, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  billableHours: number | null;
  hourlyRate: number | null;
  totalAmount: number | null;
  status: string;
  notes: string | null;
  jobId: string | null;
}

interface Paycheck {
  id: string;
  regularHours: number;
  overtimeHours: number;
  payRate: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  paidAt: string | null;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  payDate: string | null;
  createdAt: string;
}

interface Props {
  payRate: number;
  payType: string;
  periodStart: string;
  periodEnd: string;
  timeEntries: TimeEntry[];
  paychecks: Paycheck[];
}

export default function TimesheetsClient({ payRate, payType, periodStart, periodEnd, timeEntries, paychecks }: Props) {
  const [tab, setTab] = useState<'timesheet' | 'paystubs'>('timesheet');

  // Calculate period totals
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.billableHours || 0), 0);
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);
  const regularPay = regularHours * payRate;
  const overtimePay = overtimeHours * payRate * 1.5;
  const grossPay = regularPay + overtimePay;

  const approvedEntries = timeEntries.filter(e => e.status === 'approved').length;
  const pendingEntries = timeEntries.filter(e => e.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Timesheets & Pay</h1>
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setTab('timesheet')} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'timesheet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
            <Clock className="h-4 w-4 inline mr-1.5" />Timesheet
          </button>
          <button onClick={() => setTab('paystubs')} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'paystubs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
            <DollarSign className="h-4 w-4 inline mr-1.5" />Pay Stubs
          </button>
        </div>
      </div>

      {tab === 'timesheet' && (
        <>
          {/* Period summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard icon={<Clock className="h-5 w-5 text-blue-500" />} label="Total Hours" value={`${totalHours.toFixed(1)}h`} sub={`${regularHours.toFixed(1)} reg + ${overtimeHours.toFixed(1)} OT`} />
            <SummaryCard icon={<DollarSign className="h-5 w-5 text-emerald-500" />} label="Gross Earnings" value={`$${grossPay.toFixed(2)}`} sub={`$${payRate}/hr${overtimeHours > 0 ? ` · $${(payRate * 1.5).toFixed(2)}/hr OT` : ''}`} />
            <SummaryCard icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} label="Approved" value={`${approvedEntries}`} sub={`of ${timeEntries.length} entries`} />
            <SummaryCard icon={<AlertCircle className="h-5 w-5 text-amber-500" />} label="Pending" value={`${pendingEntries}`} sub="awaiting approval" />
          </div>

          {/* Period label */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Time entries table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">In</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Out</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Break</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Hours</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Earnings</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">No time entries this period.</td>
                    </tr>
                  ) : (
                    timeEntries.map((entry) => {
                      const hours = entry.billableHours || 0;
                      const earnings = entry.totalAmount || hours * payRate;
                      return (
                        <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {new Date(entry.clockIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(entry.clockIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(entry.clockOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">{entry.breakMinutes}m</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{hours.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-700">${earnings.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                              entry.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              entry.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            )}>
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {timeEntries.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={4} className="px-4 py-3 font-bold text-slate-900">Totals</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{totalHours.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">${grossPay.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'paystubs' && (
        <div className="space-y-4">
          {paychecks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No pay stubs yet. They&apos;ll appear here after payroll is processed.</p>
            </div>
          ) : (
            paychecks.map((check) => (
              <div key={check.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold',
                        check.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        check.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {check.status === 'paid' ? '✓ Paid' : check.status === 'pending' ? 'Pending' : check.status}
                      </span>
                      {check.periodStart && check.periodEnd && (
                        <span className="text-xs text-slate-500">
                          {new Date(check.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(check.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Regular</p>
                        <p className="font-medium text-slate-900">{check.regularHours.toFixed(1)}h · ${check.regularPay.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Overtime</p>
                        <p className="font-medium text-slate-900">{check.overtimeHours.toFixed(1)}h · ${check.overtimePay.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Deductions</p>
                        <p className="font-medium text-red-600">-${check.totalDeductions.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Net Pay</p>
                        <p className="font-bold text-emerald-700 text-base">${check.netPay.toFixed(2)}</p>
                      </div>
                    </div>
                    {check.paidAt && (
                      <p className="text-xs text-slate-400 mt-2">
                        Paid on {new Date(check.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-slate-500">{label}</span></div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}
