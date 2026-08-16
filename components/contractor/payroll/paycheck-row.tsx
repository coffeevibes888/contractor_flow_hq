'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface Deduction {
  label: string;
  amount: number;
  type: string;
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
  deductions?: Deduction[];
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

interface Props {
  paycheck: Paycheck;
  payrollId: string;
  canMarkPaid?: boolean;
  onUpdated: (updated: Paycheck) => void;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-amber-100 text-amber-700' },
  paid:    { label: 'Paid',    icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' },
  void:    { label: 'Void',   icon: XCircle, className: 'bg-red-100 text-red-700' },
};

export function PaycheckRow({ paycheck: initial, payrollId, canMarkPaid = true, onUpdated }: Props) {
  const [paycheck, setPaycheck] = useState<Paycheck>(initial);
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(paycheck.paymentMethod || 'check');
  const [paymentRef, setPaymentRef] = useState(paycheck.paymentRef || '');

  const cfg = statusConfig[paycheck.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;
  const name = paycheck.employee
    ? `${paycheck.employee.firstName} ${paycheck.employee.lastName}`
    : 'Unknown';

  async function markAs(status: 'paid' | 'void') {
    setMarking(true);
    try {
      const res = await fetch(`/api/contractor/payroll/${payrollId}/paychecks/${paycheck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(status === 'paid' ? { paymentMethod, paymentRef: paymentRef || undefined } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaycheck(prev => ({ ...prev, ...data.paycheck }));
      onUpdated({ ...paycheck, ...data.paycheck });
      setShowMarkPaid(false);
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
        <button type="button" onClick={() => setExpanded(v => !v)} className="shrink-0">
          {expanded
            ? <ChevronDown className="h-4 w-4 text-gray-400" />
            : <ChevronRight className="h-4 w-4 text-gray-400" />
          }
        </button>

        {/* Employee name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          {paycheck.employee?.employeeType && (
            <p className="text-xs text-gray-400">{paycheck.employee.employeeType.toUpperCase()}</p>
          )}
        </div>

        {/* Hours columns (hidden on mobile) */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_160px] gap-3 w-[520px] text-right">
          <p className="text-sm text-gray-700">{Number(paycheck.regularHours || 0).toFixed(1)}h</p>
          <p className="text-sm text-gray-700">{Number(paycheck.overtimeHours || 0).toFixed(1)}h</p>
          <p className="text-sm font-medium text-gray-900">{formatCurrency(Number(paycheck.grossPay))}</p>
          <p className="text-sm text-red-600">−{formatCurrency(Number(paycheck.totalDeductions || 0))}</p>

          {/* Status + action */}
          <div className="flex items-center justify-end gap-2">
            <Badge className={cfg.className}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {cfg.label}
            </Badge>
            {canMarkPaid && paycheck.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-gray-200"
                onClick={() => setShowMarkPaid(true)}
              >
                Mark Paid
              </Button>
            )}
          </div>
        </div>

        {/* Mobile: net + badge */}
        <div className="md:hidden flex items-center gap-2 ml-auto">
          <span className="text-sm font-bold text-emerald-600">{formatCurrency(Number(paycheck.netPay))}</span>
          <Badge className={cfg.className}>{cfg.label}</Badge>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Pay breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Pay Rate</p>
              <p className="font-medium">${Number(paycheck.payRate || 0).toFixed(2)}/hr</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Regular Pay</p>
              <p className="font-medium">{formatCurrency(Number(paycheck.regularPay || 0))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">OT Pay (1.5×)</p>
              <p className="font-medium">{formatCurrency(Number(paycheck.overtimePay || 0))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">PTO Pay ({Number(paycheck.ptoHours || 0).toFixed(1)} hrs)</p>
              <p className="font-medium">{formatCurrency(Number(paycheck.ptoPay || 0))}</p>
            </div>
          </div>

          {/* Deductions */}
          {(paycheck.deductions || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deductions</p>
              <div className="space-y-1">
                {(paycheck.deductions || []).map((d, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{d.label}</span>
                    <span className="text-red-600 font-medium">−{formatCurrency(d.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1 mt-1">
                  <span>Total Deductions</span>
                  <span className="text-red-600">−{formatCurrency(Number(paycheck.totalDeductions || 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Net */}
          <div className="flex justify-between items-center rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <span className="font-semibold text-gray-800">Net Pay</span>
            <span className="text-xl font-bold text-emerald-700">{formatCurrency(Number(paycheck.netPay))}</span>
          </div>

          {/* Payment info if paid */}
          {paycheck.status === 'paid' && (
            <div className="text-sm text-gray-600 space-y-1">
              {paycheck.paymentMethod && <p><span className="font-medium">Method:</span> {paycheck.paymentMethod}</p>}
              {paycheck.paymentRef && <p><span className="font-medium">Ref #:</span> {paycheck.paymentRef}</p>}
              {paycheck.paidAt && <p><span className="font-medium">Paid at:</span> {new Date(paycheck.paidAt).toLocaleString()}</p>}
            </div>
          )}

          {/* Mark paid form */}
          {showMarkPaid && paycheck.status === 'pending' && (
            <div className="rounded-lg border-2 border-emerald-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Record Payment</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="check">Check</option>
                    <option value="direct_deposit">Direct Deposit</option>
                    <option value="cash">Cash</option>
                    <option value="zelle">Zelle</option>
                    <option value="venmo">Venmo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Reference # (optional)</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    placeholder="Check # or transaction ID"
                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-200"
                  onClick={() => setShowMarkPaid(false)}
                  disabled={marking}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => markAs('paid')}
                  disabled={marking}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {marking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Confirm Paid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 ml-auto"
                  onClick={() => markAs('void')}
                  disabled={marking}
                >
                  Void
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons if not yet showing form */}
          {canMarkPaid && !showMarkPaid && paycheck.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowMarkPaid(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Mark as Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => markAs('void')}
                disabled={marking}
              >
                Void
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
