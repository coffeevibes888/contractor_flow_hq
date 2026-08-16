'use client';

import { useState, useCallback } from 'react';
import { Plus, X, Loader2, Trash2 } from 'lucide-react';

interface AccountOption { id: string; code: string; name: string; type: string }

interface LineInput { accountCode: string; debit: string; credit: string; memo: string }

const EMPTY_LINE: LineInput = { accountCode: '', debit: '', credit: '', memo: '' };

export default function NewJournalEntryButton({ landlordId, accounts }: { landlordId: string; accounts: AccountOption[] }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<LineInput[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const addLine = () => setLines([...lines, { ...EMPTY_LINE }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineInput, value: string) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: value };
    // When user enters debit, clear credit and vice versa
    if (field === 'debit' && value) next[i].credit = '';
    if (field === 'credit' && value) next[i].debit = '';
    setLines(next);
  };

  const handleSave = async () => {
    if (!isBalanced) { setError('Journal entry must be balanced (debits = credits)'); return; }
    const validLines = lines.filter((l) => l.accountCode && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) { setError('At least 2 lines are required'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/accounting/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId,
          effectiveDate: date,
          memo,
          lines: validLines.map((l) => ({
            accountCode: l.accountCode,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            memo: l.memo || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setOpen(false);
      // Refresh the page to show the new entry
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post entry');
    } finally {
      setSaving(false);
    }
  };

  const handleOpen = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setMemo('');
    setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
    setError(null);
    setOpen(true);
  };

  return (
    <>
      <button onClick={handleOpen}
        className='inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors'>
        <Plus className='h-4 w-4' />New Entry
      </button>

      {open && (
        <div className='fixed inset-0 z-50 flex'>
          <div className='flex-1 bg-black/40' onClick={() => setOpen(false)} />
          <div className='w-full max-w-2xl bg-white shadow-2xl flex flex-col'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200'>
              <h2 className='text-base font-semibold text-gray-900'>New Journal Entry</h2>
              <button onClick={() => setOpen(false)}><X className='h-5 w-5 text-gray-500' /></button>
            </div>

            <div className='flex-1 overflow-y-auto p-5 space-y-5'>
              {error && <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{error}</div>}

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-semibold text-gray-700 mb-1'>Date *</label>
                  <input type='date' value={date} onChange={(e) => setDate(e.target.value)}
                    className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500' />
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-700 mb-1'>Memo</label>
                  <input type='text' value={memo} onChange={(e) => setMemo(e.target.value)} placeholder='e.g. Manual adjustment — rent correction'
                    className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500' />
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='text-xs font-semibold text-gray-700'>Lines *</label>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {isBalanced ? '✓ Balanced' : `Δ ${Math.abs(totalDebits - totalCredits).toFixed(2)}`}
                  </span>
                </div>
                <div className='space-y-2'>
                  <div className='grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1'>
                    <span className='col-span-4'>Account</span>
                    <span className='col-span-3 text-right'>Debit</span>
                    <span className='col-span-3 text-right'>Credit</span>
                    <span className='col-span-2'>Memo</span>
                  </div>
                  {lines.map((line, i) => (
                    <div key={i} className='grid grid-cols-12 gap-2 items-center'>
                      <div className='col-span-4'>
                        <select value={line.accountCode} onChange={(e) => updateLine(i, 'accountCode', e.target.value)}
                          className='w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500'>
                          <option value=''>— Select —</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className='col-span-3'>
                        <input type='number' min='0' step='0.01' value={line.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)}
                          placeholder='0.00'
                          className='w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-right tabular-nums' />
                      </div>
                      <div className='col-span-3'>
                        <input type='number' min='0' step='0.01' value={line.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)}
                          placeholder='0.00'
                          className='w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-right tabular-nums' />
                      </div>
                      <div className='col-span-1'>
                        <input type='text' value={line.memo} onChange={(e) => updateLine(i, 'memo', e.target.value)} placeholder='note'
                          className='w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500' />
                      </div>
                      <div className='col-span-1 flex justify-center'>
                        {lines.length > 2 && (
                          <button onClick={() => removeLine(i)} className='p-1 text-gray-300 hover:text-red-500'>
                            <Trash2 className='h-3.5 w-3.5' />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={addLine} className='mt-2 text-xs text-violet-600 hover:text-violet-700 hover:underline'>
                  + Add line
                </button>
              </div>

              {/* Totals */}
              <div className='flex justify-end gap-8 text-xs font-semibold bg-gray-50 rounded-lg px-4 py-2.5'>
                <span>Debits: <span className='tabular-nums'>${totalDebits.toFixed(2)}</span></span>
                <span>Credits: <span className='tabular-nums'>${totalCredits.toFixed(2)}</span></span>
              </div>
            </div>

            <div className='px-5 py-4 border-t border-gray-200 flex justify-end gap-3'>
              <button onClick={() => setOpen(false)} className='px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50'>Cancel</button>
              <button onClick={handleSave} disabled={saving || !isBalanced}
                className='inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50'>
                {saving && <Loader2 className='h-4 w-4 animate-spin' />}Post Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
