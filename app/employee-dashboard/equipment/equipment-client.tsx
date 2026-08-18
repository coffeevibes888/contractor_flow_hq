'use client';

import { useState } from 'react';
import {
  Truck, Wrench, Package, Receipt, Plus, Send, Loader2,
  CheckCircle, AlertTriangle, DollarSign, Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TruckItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  category: string | null;
  quantity: number;
}

interface Equipment {
  id: string;
  name: string;
  serialNumber: string | null;
  category: string | null;
  status: string;
  condition: string | null;
  lastMaintenance: string | null;
  notes: string | null;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  hasReceipt: boolean;
  billable: boolean;
}

interface Props {
  employeeId: string;
  contractorId: string;
  employeeName: string;
  truck: { id: string; name: string; licensePlate: string | null; vehicle: string } | null;
  truckItems: TruckItem[];
  equipment: Equipment[];
  expenses: Expense[];
}

const EXPENSE_CATEGORIES = ['Fuel', 'Materials', 'Tools', 'Permits', 'Parking', 'Meals', 'Other'];

export default function EquipmentClient({ employeeId, contractorId, employeeName, truck, truckItems, equipment, expenses }: Props) {
  const [tab, setTab] = useState<'truck' | 'equipment' | 'expenses'>('truck');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'Fuel', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allExpenses, setAllExpenses] = useState(expenses);

  const handleLogExpense = async () => {
    if (!expenseForm.description.trim() || !expenseForm.amount) { setError('Description and amount required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/employee/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId, contractorId,
          category: expenseForm.category,
          description: expenseForm.description.trim(),
          amount: Number(expenseForm.amount),
          expenseDate: expenseForm.date,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to log expense.'); return; }
      setSuccess('Expense logged!');
      setShowExpenseForm(false);
      setAllExpenses(prev => [{
        id: json.id || Date.now().toString(),
        category: expenseForm.category,
        description: expenseForm.description.trim(),
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
        status: 'pending',
        hasReceipt: false,
        billable: true,
      }, ...prev]);
      setExpenseForm({ category: 'Fuel', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Equipment & Expenses</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setTab('truck')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', tab === 'truck' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              <Truck className="h-3.5 w-3.5 inline mr-1" /> Truck
            </button>
            <button onClick={() => setTab('equipment')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', tab === 'equipment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              <Wrench className="h-3.5 w-3.5 inline mr-1" /> Tools
            </button>
            <button onClick={() => setTab('expenses')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', tab === 'expenses' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              <Receipt className="h-3.5 w-3.5 inline mr-1" /> Expenses
            </button>
          </div>
          <button onClick={() => { setShowExpenseForm(true); setTab('expenses'); setError(''); setSuccess(''); }}
            className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs">
            <Plus className="h-3.5 w-3.5" /> Log Expense
          </button>
        </div>
      </div>

      {success && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700"><CheckCircle className="h-4 w-4" /> {success}</div>}

      {/* Truck Inventory */}
      {tab === 'truck' && (
        <div className="space-y-4">
          {truck ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center"><Truck className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="font-bold text-slate-900">{truck.name}</p>
                  <p className="text-xs text-slate-500">{truck.vehicle}{truck.licensePlate ? ` · ${truck.licensePlate}` : ''}</p>
                </div>
              </div>

              {truckItems.length === 0 ? (
                <p className="text-sm text-slate-400">No items tracked on this truck.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{truckItems.length} items on truck</p>
                  {truckItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category}{item.sku ? ` · ${item.sku}` : ''}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-700">{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Truck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No truck assigned to you.</p>
              <p className="text-xs text-slate-400 mt-1">Ask your manager to assign a truck from the Fleet page.</p>
            </div>
          )}
        </div>
      )}

      {/* Equipment / Tools */}
      {tab === 'equipment' && (
        <div className="space-y-3">
          {equipment.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No equipment checked out to you.</p>
            </div>
          ) : (
            equipment.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Wrench className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.serialNumber && <span className="text-xs text-slate-400">S/N: {item.serialNumber}</span>}
                        {item.category && <span className="text-xs text-slate-400">· {item.category}</span>}
                      </div>
                      {item.lastMaintenance && (
                        <p className="text-xs text-slate-400 mt-1">Last service: {new Date(item.lastMaintenance).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      item.status === 'available' || item.status === 'checked_out' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    )}>{item.status?.replace('_', ' ')}</span>
                    {item.condition && <span className="text-[10px] text-slate-400">{item.condition}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Expenses */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          {/* Expense form */}
          {showExpenseForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-500" /> Log Expense
              </h2>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select value={expenseForm.category} onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Diesel fill-up at Shell, 35 gallons" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>

              {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setShowExpenseForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleLogExpense} disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Log Expense
                </button>
              </div>
            </div>
          )}

          {/* Expenses list */}
          {allExpenses.length === 0 && !showExpenseForm ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No expenses logged yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Description</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allExpenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600">{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{exp.category}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{exp.description}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">${exp.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          exp.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          exp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        )}>{exp.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
