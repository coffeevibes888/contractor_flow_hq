'use client';

import { useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cancelInvoice, markInvoicePaid, sendInvoiceByEmail } from '@/lib/actions/invoice.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Invoice {
  id: string;
  propertyName: string;
  tenantName: string;
  tenantEmail: string;
  amount: number;
  reason: string;
  description: string | null;
  dueDate: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled';
type SortField = 'createdAt' | 'dueDate' | 'amount' | 'tenantName';
type SortDir = 'asc' | 'desc';

const STATUS_CFG: Record<string, { badge: string; dot: string; label: string }> = {
  pending:   { badge: 'bg-amber-50 text-amber-700 border border-amber-200',   dot: 'bg-amber-400',  label: 'Pending' },
  paid:      { badge: 'bg-green-50 text-green-700 border border-green-200',   dot: 'bg-green-500',  label: 'Paid' },
  overdue:   { badge: 'bg-red-50 text-red-700 border border-red-200',         dot: 'bg-red-500',    label: 'Overdue' },
  cancelled: { badge: 'bg-gray-100 text-gray-500 border border-gray-200',     dot: 'bg-gray-400',   label: 'Cancelled' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG.cancelled;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${c.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── PDF Preview Modal ───────────────────────────────────────────────────────
function PdfPreviewModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const invoiceNum = invoice.id.slice(-8).toUpperCase();
  const html = buildInvoiceHtml(invoice, invoiceNum);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60' onClick={onClose}>
      <div
        className='bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50'>
          <p className='text-sm font-semibold text-gray-700'>Invoice #{invoiceNum}</p>
          <div className='flex gap-2'>
            <button
              onClick={handlePrint}
              className='px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity'
            >
              ⬇ Download / Print PDF
            </button>
            <button
              onClick={onClose}
              className='px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-300 transition-colors'
            >
              Close
            </button>
          </div>
        </div>
        <div className='flex-1 overflow-auto'>
          <iframe srcDoc={html} className='w-full h-full min-h-[520px] border-0' title={`Invoice ${invoiceNum}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Send Email Modal ────────────────────────────────────────────────────────
function SendEmailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState(invoice.tenantEmail);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const result = await sendInvoiceByEmail(invoice.id, email);
    if (result.success) {
      toast({ description: result.message });
      onClose();
    } else {
      toast({ variant: 'destructive', description: result.message });
    }
    setSending(false);
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60' onClick={onClose}>
      <div
        className='bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4'
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className='text-gray-900 font-semibold text-base'>Send Invoice by Email</h3>
          <p className='text-gray-500 text-sm mt-1'>
            Invoice #{invoice.id.slice(-8).toUpperCase()} · ${invoice.amount.toFixed(2)} · {invoice.reason}
          </p>
        </div>
        <div className='space-y-1'>
          <label className='text-xs text-gray-500 font-semibold uppercase tracking-wider'>Recipient Email</label>
          <Input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='border-gray-200 focus:ring-cyan-500/20 focus:border-cyan-400 text-gray-900'
          />
          <p className='text-xs text-gray-400'>You can change this to send to any email address</p>
        </div>
        <div className='flex gap-2 pt-1'>
          <Button
            onClick={handleSend}
            disabled={sending || !email}
            className='flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
          >
            {sending ? 'Sending…' : 'Send Email'}
          </Button>
          <Button variant='outline' onClick={onClose} className='border-gray-200 text-gray-600'>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function InvoiceList({ invoices: initialInvoices }: { invoices: Invoice[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCancel = async (invoice: Invoice) => {
    setLoadingId(invoice.id);
    const result = await cancelInvoice(invoice.id);
    if (result.success) {
      setInvoices((prev) => prev.map((inv) => inv.id === invoice.id ? { ...inv, status: 'cancelled' } : inv));
      toast({ description: result.message });
    } else {
      toast({ variant: 'destructive', description: result.message });
    }
    setLoadingId(null);
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    setLoadingId(invoice.id);
    const result = await markInvoicePaid(invoice.id);
    if (result.success) {
      setInvoices((prev) =>
        prev.map((inv) => inv.id === invoice.id ? { ...inv, status: 'paid', paidAt: new Date().toISOString() } : inv)
      );
      toast({ description: result.message });
      router.refresh();
    } else {
      toast({ variant: 'destructive', description: result.message });
    }
    setLoadingId(null);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let list = statusFilter !== 'all' ? invoices.filter((i) => i.status === statusFilter) : invoices;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.tenantName.toLowerCase().includes(q) ||
        i.propertyName.toLowerCase().includes(q) ||
        i.reason.toLowerCase().includes(q) ||
        i.tenantEmail.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortField === 'amount') { aVal = a.amount; bVal = b.amount; }
      else if (sortField === 'tenantName') { aVal = a.tenantName; bVal = b.tenantName; }
      else if (sortField === 'dueDate') { aVal = a.dueDate; bVal = b.dueDate; }
      else { aVal = a.createdAt; bVal = b.createdAt; }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, statusFilter, search, sortField, sortDir]);

  const SortBtn = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className='flex items-center gap-1 hover:text-gray-700 transition-colors select-none'
    >
      {children}
      <span className={sortField === field ? 'text-cyan-600' : 'text-gray-300'}>
        {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );

  if (invoices.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-center'>
        <div className='w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-2xl'>📄</div>
        <p className='text-gray-700 font-medium'>No invoices yet</p>
        <p className='text-gray-400 text-sm mt-1'>Create an invoice above to get started</p>
      </div>
    );
  }

  const counts: Record<string, number> = { all: invoices.length };
  for (const inv of invoices) counts[inv.status] = (counts[inv.status] || 0) + 1;

  return (
    <>
      {/* Toolbar */}
      <div className='space-y-3 mb-4'>
        {/* Search */}
        <div className='relative'>
          <svg className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
            <circle cx='11' cy='11' r='8' /><path d='m21 21-4.35-4.35' />
          </svg>
          <input
            type='search'
            placeholder='Search tenant, property, reason, invoice #…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all'
          />
        </div>

        {/* Status filter tabs */}
        <div className='flex items-center gap-1.5 flex-wrap border-b border-gray-100 pb-3'>
          {(['all', 'pending', 'overdue', 'paid', 'cancelled'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {s} {counts[s] !== undefined ? `(${counts[s]})` : ''}
            </button>
          ))}
          <span className='ml-auto text-xs text-gray-400'>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className='text-gray-400 text-sm py-8 text-center'>No invoices match your filters</p>
      ) : (
        <div className='overflow-x-auto rounded-lg border border-gray-200'>
          <table className='w-full text-sm min-w-[680px]'>
            <thead>
              <tr className='border-b border-gray-200 bg-gray-50'>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                  <SortBtn field='tenantName'>Tenant</SortBtn>
                </th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                  Charge
                </th>
                <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                  <SortBtn field='amount'>Amount</SortBtn>
                </th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                  <SortBtn field='dueDate'>Due</SortBtn>
                </th>
                <th className='px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {filtered.map((invoice) => {
                const isExpanded = expandedId === invoice.id;
                const isLoading = loadingId === invoice.id;
                const isLate = invoice.status === 'pending' && new Date(invoice.dueDate) < new Date();

                return (
                  <Fragment key={invoice.id}>
                    <tr className={`transition-colors hover:bg-gray-50/70 ${isExpanded ? 'bg-gray-50' : ''}`}>
                      <td className='px-4 py-3'>
                        <p className='font-medium text-gray-900 text-sm leading-tight'>{invoice.tenantName}</p>
                        <p className='text-xs text-gray-400 truncate max-w-[160px] mt-0.5'>{invoice.propertyName}</p>
                      </td>
                      <td className='px-4 py-3'>
                        <p className='text-gray-700 text-sm'>{invoice.reason}</p>
                        <p className='text-xs text-gray-400 font-mono mt-0.5'>#{invoice.id.slice(-8).toUpperCase()}</p>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <span className='font-semibold text-gray-900 tabular-nums'>${invoice.amount.toFixed(2)}</span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className={`text-xs font-medium ${isLate ? 'text-red-600' : 'text-gray-500'}`}>
                          {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {isLate && <span className='ml-1'>⚠</span>}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center justify-end gap-1'>
                          {/* Expand */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                            title='Details'
                            className='p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xs'
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                          {/* Preview PDF */}
                          <button
                            onClick={() => setPreviewInvoice(invoice)}
                            title='Preview & download PDF'
                            className='p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors'
                          >
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                              <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
                              <polyline points='14 2 14 8 20 8' />
                              <line x1='16' y1='13' x2='8' y2='13' />
                              <line x1='16' y1='17' x2='8' y2='17' />
                            </svg>
                          </button>
                          {/* Send email */}
                          <button
                            onClick={() => setEmailInvoice(invoice)}
                            title='Send by email'
                            className='p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors'
                          >
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                              <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
                              <polyline points='22,6 12,13 2,6' />
                            </svg>
                          </button>
                          {/* Mark paid */}
                          {invoice.status === 'pending' && (
                            <button
                              onClick={() => handleMarkPaid(invoice)}
                              disabled={isLoading}
                              title='Mark as paid'
                              className='p-1.5 rounded-md text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40'
                            >
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                                <polyline points='20 6 9 17 4 12' />
                              </svg>
                            </button>
                          )}
                          {/* Cancel */}
                          {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                            <button
                              onClick={() => handleCancel(invoice)}
                              disabled={isLoading}
                              title='Cancel invoice'
                              className='p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40'
                            >
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                                <line x1='18' y1='6' x2='6' y2='18' />
                                <line x1='6' y1='6' x2='18' y2='18' />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${invoice.id}-detail`} className='bg-blue-50/30'>
                        <td colSpan={6} className='px-6 py-4'>
                          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4'>
                            <div>
                              <p className='text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5'>Email</p>
                              <p className='text-gray-700 text-sm'>{invoice.tenantEmail}</p>
                            </div>
                            <div>
                              <p className='text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5'>Invoice #</p>
                              <p className='text-gray-700 font-mono text-sm'>{invoice.id.slice(-8).toUpperCase()}</p>
                            </div>
                            <div>
                              <p className='text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5'>Created</p>
                              <p className='text-gray-700 text-sm'>
                                {new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            {invoice.paidAt && (
                              <div>
                                <p className='text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5'>Paid On</p>
                                <p className='text-green-600 font-medium text-sm'>
                                  {new Date(invoice.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            )}
                            {invoice.description && (
                              <div className='col-span-2 md:col-span-4'>
                                <p className='text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5'>Notes</p>
                                <p className='text-gray-600 text-sm whitespace-pre-wrap'>{invoice.description}</p>
                              </div>
                            )}
                          </div>
                          <div className='flex gap-2 flex-wrap'>
                            <button
                              onClick={() => setPreviewInvoice(invoice)}
                              className='px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors'
                            >
                              Preview &amp; Download PDF
                            </button>
                            <button
                              onClick={() => setEmailInvoice(invoice)}
                              className='px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 text-xs font-semibold hover:bg-cyan-100 transition-colors border border-cyan-200'
                            >
                              Send by Email
                            </button>
                            {invoice.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleMarkPaid(invoice)}
                                  disabled={isLoading}
                                  className='px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors border border-green-200 disabled:opacity-50'
                                >
                                  Mark as Paid
                                </button>
                                <button
                                  onClick={() => handleCancel(invoice)}
                                  disabled={isLoading}
                                  className='px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50'
                                >
                                  Cancel Invoice
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewInvoice && <PdfPreviewModal invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
      {emailInvoice && <SendEmailModal invoice={emailInvoice} onClose={() => setEmailInvoice(null)} />}
    </>
  );
}

// ─── PDF HTML builder ────────────────────────────────────────────────────────
function buildInvoiceHtml(invoice: Invoice, invoiceNum: string): string {
  const statusLabel = STATUS_CFG[invoice.status]?.label || invoice.status;
  const lines = invoice.description
    ? invoice.description.split('\n').filter((l) => l.trim())
        .map((l) => `<li style="margin:2px 0;color:#374151;">${l}</li>`).join('')
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice #${invoiceNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f6fa; padding: 40px 20px; color: #1f2328; }
    .page { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg,#06b6d4,#3b82f6); padding: 36px 40px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .inv-label { color: rgba(255,255,255,.7); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .inv-num { color: white; font-size: 16px; font-weight: 700; margin-top: 2px; }
    .body { padding: 36px 40px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #9ca3af; font-weight: 600; margin-bottom: 6px; }
    .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .party-name { font-size: 15px; font-weight: 700; color: #111827; }
    .party-detail { font-size: 13px; color: #6b7280; margin-top: 2px; }
    .line-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .line-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; border-bottom: 2px solid #e5e7eb; padding: 8px 12px; }
    .line-table th:last-child { text-align: right; }
    .line-table td { padding: 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    .line-table td:last-child { text-align: right; font-weight: 600; color: #111827; }
    .total-row { background: #f9fafb; border-top: 2px solid #e5e7eb; }
    .total-row td { font-weight: 700 !important; font-size: 16px !important; color: #111827 !important; padding: 14px 12px !important; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; font-weight: 600; }
    .meta-value { font-size: 13px; color: #111827; font-weight: 600; margin-top: 3px; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .status-cancelled { background: #f1f5f9; color: #64748b; }
    .notes ul { padding-left: 18px; }
    .footer { padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
    @media print { body { padding: 0; background: white; } .page { box-shadow: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-row">
        <div>
          <div class="brand">INVOICE</div>
          <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:4px;">${invoice.propertyName}</div>
        </div>
        <div style="text-align:right;">
          <div class="inv-label">Invoice Number</div>
          <div class="inv-num">#${invoiceNum}</div>
        </div>
      </div>
    </div>
    <div class="body">
      <div class="party-grid">
        <div>
          <div class="section-title">Billed To</div>
          <div class="party-name">${invoice.tenantName}</div>
          <div class="party-detail">${invoice.tenantEmail}</div>
          <div class="party-detail">${invoice.propertyName}</div>
        </div>
        <div style="text-align:right;">
          <div class="section-title">Invoice Date</div>
          <div class="party-name">${new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>
      <div class="meta-grid">
        <div>
          <div class="meta-label">Due Date</div>
          <div class="meta-value">${new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div>
          <div class="meta-label">Status</div>
          <div class="meta-value"><span class="status-badge status-${invoice.status}">${statusLabel}</span></div>
        </div>
        ${invoice.paidAt ? `<div><div class="meta-label">Paid On</div><div class="meta-value" style="color:#065f46;">${new Date(invoice.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>` : '<div></div>'}
      </div>
      <table class="line-table">
        <thead><tr><th style="width:60%">Description</th><th>Amount</th></tr></thead>
        <tbody>
          <tr><td>${invoice.reason}</td><td>$${invoice.amount.toFixed(2)}</td></tr>
          <tr class="total-row">
            <td style="font-size:14px;font-weight:700;color:#111827;">Total Due</td>
            <td>$${invoice.amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      ${lines ? `<div class="notes"><div class="section-title" style="margin-bottom:8px;">Notes</div><ul>${lines}</ul></div>` : ''}
    </div>
    <div class="footer">
      <p>Generated by Property Flow HQ &nbsp;·&nbsp; ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}
