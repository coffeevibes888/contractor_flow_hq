'use client';

import { useState } from 'react';
import {
  DollarSign,
  Users,
  CalendarDays,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { RunPayrollModal } from '@/components/contractor/payroll/run-payroll-modal';
import { PaycheckRow } from '@/components/contractor/payroll/paycheck-row';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  payRate: number;
  payType: string;
  employeeType: string;
}

interface Paycheck {
  id: string;
  status: string;
  grossPay: number;
  netPay: number;
  regularHours?: number;
  overtimeHours?: number;
  ptoHours?: number;
  ptoPay?: number;
  regularPay?: number;
  overtimePay?: number;
  payRate?: number;
  overtimeRate?: number;
  payType?: string;
  deductions?: Array<{ label: string; amount: number; type: string }>;
  totalDeductions?: number;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    employeeType?: string;
  };
}

interface Payroll {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  paySchedule: string;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  employeeCount: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  paychecks: Paycheck[];
}

interface Props {
  contractorId: string;
  businessName: string;
  initialPayrolls: Payroll[];
  employees: Employee[];
  canRun?: boolean;
  canMarkPaid?: boolean;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft:      { label: 'Draft',      icon: Clock,         className: 'bg-gray-100 text-gray-700' },
  processing: { label: 'Processing', icon: Clock,         className: 'bg-blue-100 text-blue-700' },
  completed:  { label: 'Completed',  icon: CheckCircle2,  className: 'bg-emerald-100 text-emerald-700' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,       className: 'bg-red-100 text-red-700' },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PayrollDashboard({ contractorId, businessName, initialPayrolls, employees, canRun = true, canMarkPaid = true }: Props) {
  const [payrolls, setPayrolls] = useState<Payroll[]>(initialPayrolls);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);

  // Aggregate stats
  const ytdGross = payrolls.filter(p => p.status === 'completed')
    .reduce((s, p) => s + Number(p.totalGrossPay), 0);
  const ytdNet = payrolls.filter(p => p.status === 'completed')
    .reduce((s, p) => s + Number(p.totalNetPay), 0);
  const pendingPaychecks = payrolls
    .flatMap(p => p.paychecks)
    .filter(pc => pc.status === 'pending').length;

  function onPayrollCreated(payroll: Payroll) {
    setPayrolls(prev => [payroll, ...prev]);
    setExpandedId(payroll.id);
    setShowRunModal(false);
  }

  function onPaycheckUpdated(payrollId: string, updated: Paycheck) {
    setPayrolls(prev =>
      prev.map(p =>
        p.id !== payrollId
          ? p
          : { ...p, paychecks: p.paychecks.map(pc => (pc.id === updated.id ? { ...pc, ...updated } : pc)) },
      ),
    );
  }

  function exportCSV(payroll: Payroll) {
    let csv = 'Employee,Pay Type,Regular Hrs,OT Hrs,PTO Hrs,Gross Pay,Deductions,Net Pay,Status,Payment Method,Ref\n';
    payroll.paychecks.forEach(pc => {
      const name = pc.employee ? `${pc.employee.firstName} ${pc.employee.lastName}` : 'Unknown';
      csv += `"${name}",${pc.payType || ''},${Number(pc.regularHours || 0).toFixed(2)},${Number(pc.overtimeHours || 0).toFixed(2)},${Number(pc.ptoHours || 0).toFixed(2)},${Number(pc.grossPay).toFixed(2)},${Number(pc.totalDeductions || 0).toFixed(2)},${Number(pc.netPay).toFixed(2)},${pc.status},${pc.paymentMethod || ''},${pc.paymentRef || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${payroll.periodStart.slice(0, 10)}-to-${payroll.periodEnd.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">Calculate pay, manage deductions, and generate pay stubs</p>
        </div>
        {canRun && (
          <Button
            onClick={() => setShowRunModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-2 border-black shadow-lg w-fit"
          >
            <Plus className="h-4 w-4 mr-2" />
            Run Payroll
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-500 font-medium">YTD Gross Payroll</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(ytdGross)}</p>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Banknote className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 font-medium">YTD Net Paid Out</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(ytdNet)}</p>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Pending Paychecks</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingPaychecks}</p>
        </div>
      </div>

      {/* Payroll runs */}
      <div className="space-y-3">
        {payrolls.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-1">No payroll runs yet</p>
            <p className="text-sm text-gray-500 mb-6">Run your first payroll to calculate pay for your team.</p>
            {canRun && (
              <Button onClick={() => setShowRunModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Run Payroll
              </Button>
            )}
          </div>
        )}

        {payrolls.map(payroll => {
          const isOpen = expandedId === payroll.id;
          const cfg = statusConfig[payroll.status] || statusConfig.draft;
          const StatusIcon = cfg.icon;
          const paidCount = payroll.paychecks.filter(pc => pc.status === 'paid').length;

          return (
            <div key={payroll.id} className="rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Payroll header row */}
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : payroll.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">
                      {fmt(payroll.periodStart)} – {fmt(payroll.periodEnd)}
                    </span>
                    <Badge className={cfg.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Pay date: {fmt(payroll.payDate)} · {payroll.employeeCount} employee{payroll.employeeCount !== 1 ? 's' : ''} · {paidCount}/{payroll.paychecks.length} paid
                  </p>
                </div>

                <div className="hidden sm:flex gap-8 text-right shrink-0">
                  <div>
                    <p className="text-xs text-gray-500">Gross</p>
                    <p className="font-bold text-gray-900">{formatCurrency(Number(payroll.totalGrossPay))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Net</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(Number(payroll.totalNetPay))}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); exportCSV(payroll); }}
                    title="Export CSV"
                  >
                    <Download className="h-4 w-4 text-gray-500" />
                  </Button>
                  {isOpen
                    ? <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                    : <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                  }
                </div>
              </button>

              {/* Mobile totals */}
              <div className="sm:hidden flex gap-6 px-5 pb-3 text-right border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Gross</p>
                  <p className="font-bold text-gray-900">{formatCurrency(Number(payroll.totalGrossPay))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(Number(payroll.totalNetPay))}</p>
                </div>
              </div>

              {/* Expanded: paychecks */}
              {isOpen && (
                <div className="border-t-2 border-gray-100">
                  {/* Table header */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_160px] gap-3 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>Employee</span>
                    <span className="text-right">Reg Hrs</span>
                    <span className="text-right">OT Hrs</span>
                    <span className="text-right">Gross</span>
                    <span className="text-right">Deductions</span>
                    <span className="text-right">Net Pay</span>
                    <span className="text-right">Status</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {payroll.paychecks.map(pc => (
                      <PaycheckRow
                        key={pc.id}
                        paycheck={pc}
                        payrollId={payroll.id}
                        canMarkPaid={canMarkPaid}
                        onUpdated={(updated) => onPaycheckUpdated(payroll.id, updated)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Run payroll modal */}
      {showRunModal && (
        <RunPayrollModal
          employees={employees}
          onClose={() => setShowRunModal(false)}
          onCreated={onPayrollCreated}
        />
      )}
    </div>
  );
}
