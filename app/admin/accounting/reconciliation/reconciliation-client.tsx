'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, RefreshCw, Upload, Check, X, Search, Filter, AlertCircle,
  CheckCircle2, Eye, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { fmtCurrency, fmtDate } from '../_components/format';
import AccountingHelp from '../_components/accounting-help';

type BankTransactionStatus = 'unmatched' | 'matched' | 'ignored' | 'needs_review';
type BankTransactionSource =
  | 'stripe_charge'
  | 'stripe_payout'
  | 'stripe_transfer'
  | 'stripe_outbound_xfer'
  | 'stripe_inbound_xfer'
  | 'stripe_application_fee'
  | 'csv';

interface BankTransactionRow {
  id: string;
  landlordId: string;
  financialAccountId: string | null;
  stripeConnectedAccountId: string | null;
  source: BankTransactionSource;
  externalId: string;
  stripeEventId: string | null;
  amount: number;
  currency: string;
  description: string | null;
  postedAt: Date | string;
  status: BankTransactionStatus;
  matchedJournalEntryId: string | null;
  matchedAt: Date | string | null;
  matchedBy: string | null;
  notes: string | null;
}

interface JournalEntryLite {
  id: string;
  memo: string | null;
  effectiveDate: Date | string;
  source: string;
  sourceId: string | null;
  score?: number;
  lines?: Array<{
    id: string;
    account: { code: string; name: string };
    debit: number | string;
    credit: number | string;
  }>;
}

interface SummaryTiles {
  matched: { count: number; total: number };
  unmatched: { count: number; total: number };
  needs_review: { count: number; total: number };
  ignored: { count: number; total: number };
  total: { count: number; total: number };
}

const STATUS_LABEL: Record<BankTransactionStatus, string> = {
  unmatched: 'Unmatched',
  matched: 'Matched',
  needs_review: 'Needs review',
  ignored: 'Ignored',
};
const STATUS_BADGE: Record<BankTransactionStatus, string> = {
  unmatched: 'bg-amber-100 text-amber-800 border-amber-200',
  matched: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  needs_review: 'bg-violet-100 text-violet-800 border-violet-200',
  ignored: 'bg-gray-100 text-gray-600 border-gray-200',
};
const SOURCE_LABEL: Record<BankTransactionSource, string> = {
  stripe_charge: 'Charge',
  stripe_payout: 'Payout',
  stripe_transfer: 'Connect transfer',
  stripe_outbound_xfer: 'Outbound (Treasury)',
  stripe_inbound_xfer: 'Inbound (Treasury)',
  stripe_application_fee: 'Platform fee',
  csv: 'CSV import',
};

export default function ReconciliationClient({ landlordId }: { landlordId: string }) {
  const [transactions, setTransactions] = useState<BankTransactionRow[]>([]);
  const [matchedEntries, setMatchedEntries] = useState<Record<string, JournalEntryLite>>({});
  const [tiles, setTiles] = useState<SummaryTiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BankTransactionStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<BankTransactionSource | 'all'>('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeMatch, setActiveMatch] = useState<BankTransactionRow | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ inserted: number; skipped: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ landlordId });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (search) params.set('q', search);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', `${toDate}T23:59:59Z`);
      params.set('limit', '200');

      const [txRes, sumRes] = await Promise.all([
        fetch(`/api/admin/accounting/reconciliation/transactions?${params}`, { cache: 'no-store' }),
        fetch(`/api/admin/accounting/reconciliation/summary?landlordId=${landlordId}&fromDate=${fromDate}&toDate=${toDate}T23:59:59Z`, { cache: 'no-store' }),
      ]);

      const txJson = await txRes.json();
      const sumJson = await sumRes.json();
      if (!txRes.ok) throw new Error(txJson?.message ?? 'Failed to load');
      if (!sumRes.ok) throw new Error(sumJson?.message ?? 'Failed to load summary');

      setTransactions(txJson.data.transactions);
      setMatchedEntries(txJson.data.matchedJournalEntries);
      setTiles(sumJson.data.tiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [landlordId, statusFilter, sourceFilter, search, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const onAction = async (id: string, action: 'match' | 'ignore' | 'unmatch', body: Record<string, unknown> = {}) => {
    try {
      const res = await fetch(`/api/admin/accounting/reconciliation/transactions/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Action failed');
      setActiveMatch(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const onCsvUpload = async (file: File) => {
    setCsvImporting(true);
    setCsvResult(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('landlordId', landlordId);
      const res = await fetch('/api/admin/accounting/reconciliation/import-csv', {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Import failed');
      setCsvResult(json.data);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setCsvImporting(false);
    }
  };

  return (
    <main className='w-full'>
      <div className='max-w-7xl space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'>
          <div>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Bank Reconciliation</h1>
            <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
              Match money in and out of your bank to the entries in your books — so nothing slips through the cracks.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <input
              ref={fileInputRef}
              type='file'
              accept='.csv,text/csv'
              className='hidden'
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCsvUpload(f);
                e.target.value = '';
              }}
            />
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              disabled={csvImporting}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50'
            >
              {csvImporting ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Upload className='h-3.5 w-3.5' />}
              {csvImporting ? 'Importing...' : 'Import CSV'}
            </button>
            <button
              type='button'
              onClick={load}
              disabled={loading}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 disabled:opacity-50'
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <AccountingHelp
          block={{
            summary: 'Match every dollar in and out of your bank to the entry in your books — so the books match reality.',
            whatItShows: 'Two feeds side by side: bank activity (Stripe payments, payouts, fees, and any CSV you upload) and your general ledger. You mark each bank transaction as Matched (linked to a journal entry), Ignored (a fee, a refund, something that does not need a journal entry), or Needs Review (something to look at later).',
            whenToUse: 'Once a month is usually enough. Many landlords do it on the same day they generate owner statements. A clean rec (everything matched or ignored, nothing in "needs review") is one of the strongest signals that the books are correct.',
            tips: [
              'Stripe transactions appear here automatically — you do not need to import them.',
              'If a bank account is not Stripe (like a local credit union checking account), use the Import CSV button. We accept the standard "date, amount, description" format from any major US bank.',
              'The system will try to auto-match obvious ones (same amount, same day, matching description). Anything it cannot be sure about will land in "Needs review" for you.',
              'Matched transactions get a green check, ignored ones get grayed out. Unmatched are amber — those need your attention.',
            ],
          }}
        />

        {csvResult && (
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2'>
            <CheckCircle2 className='h-4 w-4' />
            Imported {csvResult.inserted} of {csvResult.total} rows. {csvResult.skipped > 0 ? `${csvResult.skipped} duplicates skipped.` : ''}
          </div>
        )}

        {tiles && <SummaryTilesView tiles={tiles} />}

        <div className='bg-white rounded-lg border border-gray-200 p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-3'>
          <div className='flex items-center gap-2 flex-1'>
            <Search className='h-4 w-4 text-gray-400' />
            <input
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search description, notes, or Stripe id...'
              className='flex-1 border-0 focus:outline-none text-sm bg-transparent'
            />
          </div>
          <div className='flex items-center gap-2'>
            <Filter className='h-4 w-4 text-gray-400' />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BankTransactionStatus | 'all')}
              className='text-sm border border-gray-200 rounded-md px-2 py-1 bg-white'
            >
              <option value='all'>All statuses</option>
              <option value='unmatched'>Unmatched</option>
              <option value='matched'>Matched</option>
              <option value='needs_review'>Needs review</option>
              <option value='ignored'>Ignored</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as BankTransactionSource | 'all')}
              className='text-sm border border-gray-200 rounded-md px-2 py-1 bg-white'
            >
              <option value='all'>All sources</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              type='date'
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className='text-sm border border-gray-200 rounded-md px-2 py-1'
            />
            <span className='text-gray-400'>–</span>
            <input
              type='date'
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className='text-sm border border-gray-200 rounded-md px-2 py-1'
            />
          </div>
        </div>

        {error ? (
          <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2'>
            <AlertCircle className='h-4 w-4' /> {error}
          </div>
        ) : loading && transactions.length === 0 ? (
          <div className='flex items-center justify-center py-20 text-gray-400'>
            <Loader2 className='h-6 w-6 animate-spin mr-2' /> Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <TransactionsTable
            transactions={transactions}
            matchedEntries={matchedEntries}
            onAction={onAction}
            onMatch={(bt) => setActiveMatch(bt)}
          />
        )}
      </div>

      {activeMatch && (
        <MatchModal
          transaction={activeMatch}
          landlordId={landlordId}
          onClose={() => setActiveMatch(null)}
          onConfirm={(jeId) => onAction(activeMatch.id, 'match', { journalEntryId: jeId })}
        />
      )}
    </main>
  );
}

function SummaryTilesView({ tiles }: { tiles: SummaryTiles }) {
  const items: Array<{ key: keyof SummaryTiles; label: string; ringClass: string }> = [
    { key: 'unmatched', label: 'Unmatched', ringClass: 'ring-amber-200' },
    { key: 'needs_review', label: 'Needs review', ringClass: 'ring-violet-200' },
    { key: 'matched', label: 'Matched', ringClass: 'ring-emerald-200' },
    { key: 'ignored', label: 'Ignored', ringClass: 'ring-gray-200' },
  ];
  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
      {items.map((it) => {
        const t = tiles[it.key];
        return (
          <div key={it.key} className={`bg-white rounded-lg border border-gray-200 ring-1 ${it.ringClass} p-3`}>
            <div className='text-xs text-gray-500 uppercase tracking-wide'>{it.label}</div>
            <div className='text-2xl font-bold text-black mt-0.5'>{t.count}</div>
            <div className='text-xs text-gray-500 mt-0.5'>{fmtCurrency(t.total)}</div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-10 text-center'>
      <div className='mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center'>
        <FileText className='h-6 w-6 text-gray-400' />
      </div>
      <h3 className='mt-3 text-sm font-semibold text-black'>No bank transactions yet</h3>
      <p className='mt-1 text-sm text-gray-500 max-w-md mx-auto'>
        Stripe events appear here automatically as tenants pay rent, you pay owners, and Treasury moves money.
        Upload a CSV from your bank portal for ACH that doesn&apos;t go through Stripe.
      </p>
    </div>
  );
}

function TransactionsTable({
  transactions, matchedEntries, onAction, onMatch,
}: {
  transactions: BankTransactionRow[];
  matchedEntries: Record<string, JournalEntryLite>;
  onAction: (id: string, action: 'match' | 'ignore' | 'unmatch', body?: Record<string, unknown>) => Promise<void>;
  onMatch: (bt: BankTransactionRow) => void;
}) {
  return (
    <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 border-b border-gray-200'>
            <tr>
              <th className='text-left px-3 py-2 font-medium text-gray-500'>Date</th>
              <th className='text-left px-3 py-2 font-medium text-gray-500'>Source</th>
              <th className='text-left px-3 py-2 font-medium text-gray-500'>Description</th>
              <th className='text-right px-3 py-2 font-medium text-gray-500'>Amount</th>
              <th className='text-left px-3 py-2 font-medium text-gray-500'>Status</th>
              <th className='text-left px-3 py-2 font-medium text-gray-500'>Match</th>
              <th className='text-right px-3 py-2 font-medium text-gray-500'>Actions</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {transactions.map((bt) => {
              const isPositive = bt.amount >= 0;
              const je = matchedEntries[bt.id];
              return (
                <tr key={bt.id} className='hover:bg-gray-50'>
                  <td className='px-3 py-2 whitespace-nowrap text-gray-700'>{fmtDate(bt.postedAt)}</td>
                  <td className='px-3 py-2 whitespace-nowrap text-gray-600'>{SOURCE_LABEL[bt.source] ?? bt.source}</td>
                  <td className='px-3 py-2 max-w-md'>
                    <div className='truncate text-black'>{bt.description ?? '—'}</div>
                    {bt.notes && <div className='text-xs text-gray-400 mt-0.5'>{bt.notes}</div>}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{fmtCurrency(bt.amount)}
                  </td>
                  <td className='px-3 py-2'>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${STATUS_BADGE[bt.status]}`}>
                      {STATUS_LABEL[bt.status]}
                    </span>
                  </td>
                  <td className='px-3 py-2 max-w-xs'>
                    {je ? (
                      <div className='text-xs text-gray-700 truncate'>
                        <div className='font-medium'>{je.memo ?? '—'}</div>
                        <div className='text-gray-500'>{je.source} · {fmtDate(je.effectiveDate)}</div>
                      </div>
                    ) : <span className='text-xs text-gray-400'>—</span>}
                  </td>
                  <td className='px-3 py-2 text-right whitespace-nowrap'>
                    {bt.status === 'matched' || bt.status === 'ignored' ? (
                      <button
                        type='button'
                        onClick={() => onAction(bt.id, 'unmatch')}
                        className='inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-black'
                      >
                        <X className='h-3 w-3' /> Undo
                      </button>
                    ) : (
                      <div className='flex items-center gap-1 justify-end'>
                        <button
                          type='button'
                          onClick={() => onMatch(bt)}
                          className='inline-flex items-center gap-1 px-2 py-1 text-xs text-sky-700 hover:text-sky-900'
                        >
                          <Check className='h-3 w-3' /> Match
                        </button>
                        <button
                          type='button'
                          onClick={() => onAction(bt.id, 'ignore')}
                          className='inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700'
                        >
                          <Eye className='h-3 w-3' /> Ignore
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchModal({
  transaction, landlordId, onClose, onConfirm,
}: {
  transaction: BankTransactionRow;
  landlordId: string;
  onClose: () => void;
  onConfirm: (journalEntryId: string) => void;
}) {
  const [candidates, setCandidates] = useState<JournalEntryLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/accounting/reconciliation/candidates?landlordId=${landlordId}&bankTransactionId=${transaction.id}`,
          { cache: 'no-store' },
        );
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) setCandidates(json.data.candidates);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [landlordId, transaction.id]);

  const isPositive = transaction.amount >= 0;

  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={onClose}>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col' onClick={(e) => e.stopPropagation()}>
        <div className='px-5 py-4 border-b border-gray-200'>
          <h2 className='text-lg font-semibold text-black'>Match bank transaction</h2>
          <div className='mt-1 text-sm text-gray-600'>
            <span className={`font-medium ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{fmtCurrency(transaction.amount)}
            </span>
            {' · '}
            {fmtDate(transaction.postedAt)}
            {' · '}
            {transaction.description}
          </div>
        </div>
        <div className='flex-1 overflow-y-auto px-5 py-4'>
          {loading ? (
            <div className='flex items-center justify-center py-10 text-gray-400'>
              <Loader2 className='h-5 w-5 animate-spin mr-2' /> Loading candidates...
            </div>
          ) : candidates.length === 0 ? (
            <div className='text-center py-10'>
              <p className='text-sm text-gray-500 mb-2'>No automatic candidates found.</p>
              <p className='text-xs text-gray-400'>
                Post the matching journal entry, or ignore this bank row if it&apos;s a non-bookkeeping transfer.
              </p>
            </div>
          ) : (
            <div className='space-y-2'>
              {candidates.map((je) => (
                <button
                  key={je.id}
                  type='button'
                  onClick={() => onConfirm(je.id)}
                  className='w-full text-left rounded-lg border border-gray-200 p-3 hover:border-sky-300 hover:bg-sky-50/50 transition'
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <div className='text-sm font-medium text-black truncate'>{je.memo ?? '—'}</div>
                      <div className='text-xs text-gray-500 mt-0.5'>
                        {je.source} · {fmtDate(je.effectiveDate)}
                        {je.sourceId && <> · <code className='text-[10px]'>{je.sourceId.slice(0, 8)}</code></>}
                      </div>
                      {je.lines && je.lines.length > 0 && (
                        <div className='text-xs text-gray-600 mt-1.5 space-y-0.5'>
                          {je.lines.slice(0, 3).map((l) => (
                            <div key={l.id} className='flex items-center gap-2'>
                              <span className='font-mono text-[11px] bg-gray-100 px-1 rounded'>{l.account.code}</span>
                              <span className='truncate'>{l.account.name}</span>
                              <span className='ml-auto tabular-nums'>{Number(l.debit) > 0 ? `Dr ${fmtCurrency(Number(l.debit))}` : `Cr ${fmtCurrency(Number(l.credit))}`}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {je.score !== undefined && (
                      <div className='text-xs text-gray-400 tabular-nums'>
                        {Math.round(je.score * 100)}%
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className='px-5 py-3 border-t border-gray-200 flex items-center justify-between gap-2'>
          <Link
            href='/admin/accounting/trial-balance'
            className='text-xs text-sky-600 hover:underline'
            target='_blank'
          >
            Open Trial Balance ↗
          </Link>
          <button
            type='button'
            onClick={onClose}
            className='px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
