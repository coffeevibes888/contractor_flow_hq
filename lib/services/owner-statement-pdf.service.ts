/**
 * Owner Statement PDF generator.
 *
 * Mirrors the `investor-report` service pattern: build an HTML doc, hand it
 * to `htmlToPdfBuffer()` (puppeteer-core + @sparticuz/chromium-min), stream
 * the Buffer back to the API route.
 *
 * The rendered numbers come from the `OwnerStatement` row, not recomputed —
 * so once a statement is finalized the PDF reflects the locked snapshot.
 */

import { htmlToPdfBuffer } from './pdf';

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
}

export interface OwnerStatementPdfData {
  ownerName: string;
  ownerEmail: string | null;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  propertyName: string;
  lineItems: Array<{ accountCode: string; accountName: string; amount: number }>;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  managementFeePct: number;
  managementFee: number;
  distribution: number;
  status: 'draft' | 'finalized' | 'sent';
  notes?: string | null;
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function escapeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lineBucket(lines: OwnerStatementPdfData['lineItems'], kind: 'income' | 'expense') {
  return lines
    .filter((l) => (kind === 'income' ? l.amount > 0 : l.amount < 0))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

export async function generateOwnerStatementPdf(data: OwnerStatementPdfData): Promise<Buffer> {
  const html = buildOwnerStatementHtml(data);
  return htmlToPdfBuffer(html);
}

function buildOwnerStatementHtml(d: OwnerStatementPdfData): string {
  const income = lineBucket(d.lineItems, 'income');
  const expense = lineBucket(d.lineItems, 'expense');
  const periodLabel = `${fmtDate(d.periodStart)} – ${fmtDate(d.periodEnd)}`;
  const ownerSafe = escapeHtml(d.ownerName);
  const propertySafe = escapeHtml(d.propertyName || 'All properties');
  const statusClass = d.status === 'sent' ? 'sent' : d.status === 'finalized' ? 'finalized' : 'draft';
  const statusLabel = d.status.toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Owner Statement — ${ownerSafe}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #1e293b; background: #fff; }
  .page { padding: 40px 48px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 3px solid #6366f1; }
  .brand { font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px; }
  .brand .accent { color: #6366f1; }
  .brand .tagline { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; font-weight: 600; }
  .status-pill { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: 1px; }
  .status-pill.draft     { background: #fef3c7; color: #92400e; }
  .status-pill.finalized { background: #dbeafe; color: #1e40af; }
  .status-pill.sent      { background: #d1fae5; color: #065f46; }
  .meta-block { text-align: right; font-size: 10px; color: #475569; line-height: 1.6; }
  .meta-block .label { color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-size: 8px; font-weight: 600; }
  .meta-block .value { font-weight: 600; color: #1e293b; font-size: 11px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
  .party { padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .party .label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
  .party .name { font-size: 13px; font-weight: 700; color: #1e293b; }
  .party .line { font-size: 10px; color: #64748b; margin-top: 2px; }
  .section { margin-bottom: 22px; }
  .section-title { font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 8px; letter-spacing: 0.6px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .positive { color: #047857; }
  .negative { color: #b91c1c; }
  .subtotal-row { background: #f8fafc; font-weight: 700; }
  .subtotal-row td { border-top: 2px solid #cbd5e1; padding: 10px; }
  .totals { margin-top: 24px; padding: 18px 22px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 10px; }
  .totals .row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; font-size: 11px; }
  .totals .row.major { font-size: 18px; font-weight: 700; margin-top: 8px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3); }
  .totals .row .lbl { opacity: 0.85; }
  .totals .row .val { font-variant-numeric: tabular-nums; }
  .notes { margin-top: 22px; padding: 12px 16px; background: #fef9c3; border-left: 3px solid #facc15; border-radius: 4px; font-size: 10px; color: #713f12; }
  .notes .label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px; color: #92400e; }
  .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8px; color: #94a3b8; line-height: 1.7; }
  .empty { padding: 10px; color: #94a3b8; font-style: italic; text-align: center; font-size: 10px; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">Property<span class="accent">Flow</span></div>
        <div class="tagline">Owner Distribution Statement</div>
      </div>
      <div style="text-align: right;">
        <span class="status-pill ${statusClass}">${statusLabel}</span>
        <div class="meta-block" style="margin-top: 10px;">
          <div><span class="label">Statement Period</span></div>
          <div class="value">${escapeHtml(periodLabel)}</div>
          <div style="margin-top: 6px;"><span class="label">Generated</span></div>
          <div class="value">${fmtDate(d.generatedAt)}</div>
        </div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="label">Property Manager</div>
        <div class="name">PropertyFlow Management</div>
        <div class="line">PropertyFlow Inc.</div>
      </div>
      <div class="party">
        <div class="label">Property Owner</div>
        <div class="name">${ownerSafe}</div>
        ${d.ownerEmail ? `<div class="line">${escapeHtml(d.ownerEmail)}</div>` : ''}
        ${d.propertyName ? `<div class="line">Property: ${propertySafe}</div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Income</div>
      ${income.length === 0
        ? '<div class="empty">No income recorded this period.</div>'
        : `<table>
            <thead><tr><th style="width: 18%;">Code</th><th>Account</th><th class="num" style="width: 22%;">Amount</th></tr></thead>
            <tbody>
              ${income.map((l) => `<tr>
                <td style="font-family: 'Courier New', monospace; color: #64748b;">${escapeHtml(l.accountCode)}</td>
                <td>${escapeHtml(l.accountName)}</td>
                <td class="num positive">${fmtCurrency(Math.abs(l.amount))}</td>
              </tr>`).join('')}
              <tr class="subtotal-row">
                <td colspan="2">Total Income</td>
                <td class="num positive">${fmtCurrency(d.totalIncome)}</td>
              </tr>
            </tbody>
          </table>`}
    </div>

    <div class="section">
      <div class="section-title">Expenses</div>
      ${expense.length === 0
        ? '<div class="empty">No expenses recorded this period.</div>'
        : `<table>
            <thead><tr><th style="width: 18%;">Code</th><th>Account</th><th class="num" style="width: 22%;">Amount</th></tr></thead>
            <tbody>
              ${expense.map((l) => `<tr>
                <td style="font-family: 'Courier New', monospace; color: #64748b;">${escapeHtml(l.accountCode)}</td>
                <td>${escapeHtml(l.accountName)}</td>
                <td class="num negative">${fmtCurrency(Math.abs(l.amount))}</td>
              </tr>`).join('')}
              <tr class="subtotal-row">
                <td colspan="2">Total Expenses</td>
                <td class="num negative">${fmtCurrency(d.totalExpense)}</td>
              </tr>
            </tbody>
          </table>`}
    </div>

    <div class="totals">
      <div class="row"><span class="lbl">Gross Income</span><span class="val">${fmtCurrency(d.totalIncome)}</span></div>
      <div class="row"><span class="lbl">Less: Operating Expenses</span><span class="val">(${fmtCurrency(d.totalExpense)})</span></div>
      <div class="row"><span class="lbl">Net Operating Income</span><span class="val">${fmtCurrency(d.netIncome)}</span></div>
      <div class="row"><span class="lbl">Less: Management Fee (${Number(d.managementFeePct).toFixed(1)}% of income)</span><span class="val">(${fmtCurrency(d.managementFee)})</span></div>
      <div class="row major"><span class="lbl">Distribution to Owner</span><span class="val">${fmtCurrency(d.distribution)}</span></div>
    </div>

    ${d.notes ? `<div class="notes">
      <div class="label">Notes</div>
      ${escapeHtml(d.notes)}
    </div>` : ''}

    <div class="footer">
      This statement is generated from PropertyFlow's double-entry general ledger.<br/>
      Questions? Reply to the email this statement was attached to, or contact your property manager directly.<br/>
      &copy; ${new Date().getFullYear()} PropertyFlow Inc. &middot; Confidential
    </div>
  </div>
</body>
</html>`;
}
