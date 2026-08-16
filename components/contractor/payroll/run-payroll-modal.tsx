'use client';

import { useState } from 'react';
import { X, Loader2, Users, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  payRate: number;
  payType: string;
  employeeType: string;
}

interface Props {
  employees: Employee[];
  onClose: () => void;
  onCreated: (payroll: any) => void;
}

function getDefaultDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // Current biweekly period (1–15 or 16–end)
  let periodStart: Date, periodEnd: Date;
  if (day <= 15) {
    periodStart = new Date(year, month, 1);
    periodEnd = new Date(year, month, 15);
  } else {
    periodStart = new Date(year, month, 16);
    periodEnd = new Date(year, month + 1, 0); // last day of month
  }

  const payDate = new Date(periodEnd);
  payDate.setDate(payDate.getDate() + 3); // pay date 3 days after period end

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { periodStart: fmt(periodStart), periodEnd: fmt(periodEnd), payDate: fmt(payDate) };
}

export function RunPayrollModal({ employees, onClose, onCreated }: Props) {
  const defaults = getDefaultDates();
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [payDate, setPayDate] = useState(defaults.payDate);
  const [paySchedule, setPaySchedule] = useState('biweekly');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(employees.map(e => e.id)));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleEmployee(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map(e => e.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) { setError('Select at least one employee.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contractor/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          payDate,
          paySchedule,
          employeeIds: Array.from(selectedIds),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run payroll');
      onCreated(data.payroll);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const payTypeLabel = (t: string) => t === 'hourly' ? '/hr' : t === 'salary' ? '/period' : '/job';
  const empTypeColor = (t: string) => t === 'w2' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Run Payroll</h2>
            <p className="text-sm text-gray-500 mt-0.5">Calculate pay for approved time entries in the selected period</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pay period */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              Pay Period
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Period Start</label>
                <input
                  type="date"
                  required
                  value={periodStart}
                  onChange={e => setPeriodStart(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Period End</label>
                <input
                  type="date"
                  required
                  value={periodEnd}
                  onChange={e => setPeriodEnd(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pay Date</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Pay Schedule</label>
              <select
                value={paySchedule}
                onChange={e => setPaySchedule(e.target.value)}
                className="rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="semimonthly">Semi-monthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Employees */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                Include Employees ({selectedIds.size}/{employees.length})
              </h3>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedIds.size === employees.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {employees.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6 rounded-lg border-2 border-dashed border-gray-200">
                No active employees found. Add team members first.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto rounded-lg border-2 border-gray-200 p-2">
                {employees.map(emp => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="h-4 w-4 rounded accent-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-gray-500">${Number(emp.payRate).toFixed(2)}{payTypeLabel(emp.payType)}</p>
                    </div>
                    <Badge className={empTypeColor(emp.employeeType)}>{emp.employeeType.toUpperCase()}</Badge>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Regular bi-weekly payroll, includes holiday pay"
              className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none resize-none"
            />
          </div>

          {/* Info callout */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">How it works</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-700">
              <li>Pulls all <strong>approved</strong> time entries in the pay period</li>
              <li>Hours over 40/week are calculated at 1.5× overtime rate</li>
              <li>Estimated tax deductions shown for W-2 employees (1099s excluded)</li>
              <li>You can mark individual checks as paid after reviewing</li>
            </ul>
          </div>

          {error && (
            <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 p-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 border-2 border-gray-200" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedIds.size === 0}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-2 border-black shadow"
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</> : 'Run Payroll'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
