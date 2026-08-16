/**
 * POST /api/admin/accounting/reconciliation/import-csv
 *
 * Manually import bank transactions from a CSV. Used by landlords whose
 * tenants don't pay through Stripe (i.e. ACH directly to a separate
 * property bank account) — they pull a CSV from their bank portal and
 * upload it here.
 *
 * Expected columns (case-insensitive, any order):
 *   date,amount,description
 *   posted_at,amount,desc        (alternate headers)
 *
 * Amount can be positive (money in) or negative (money out, prefixed with
 * `-` or wrapped in parens). A small set of format quirks are accepted:
 *   - "1,234.56" → 1234.56
 *   - "$1,234.56" → 1234.56
 *   - "(100.00)"  → -100.00
 *
 * Idempotency: a fingerprint hash of (date + amount + description) is
 * stored as the `externalId`. Re-uploading the same CSV is a no-op.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';
import { recordBankTransaction } from '@/lib/banking/stripe-bank-sync';

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json({ success: false, message: 'Expected multipart/form-data with a "file" field' }, { status: 415 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const landlordId = form.get('landlordId')?.toString();

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'file is required' }, { status: 400 });
    }
    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json({ success: false, message: 'File too large (max 2 MB)' }, { status: 413 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }
    await assertAccountingLedger(landlordId);

    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Could not parse CSV: ${parsed.errors[0]}`,
        errors: parsed.errors.slice(0, 10),
      }, { status: 400 });
    }
    if (parsed.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'CSV had no data rows' }, { status: 400 });
    }

    let inserted = 0;
    let skipped = 0;
    for (const row of parsed.rows) {
      const externalId = `csv_${row.fingerprint}`;
      const existing = await prisma.bankTransaction.findUnique({
        where: { landlordId_externalId: { landlordId, externalId } },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await recordBankTransaction({
        landlordId,
        source: 'csv',
        externalId,
        amount: row.amount,
        currency: 'usd',
        description: row.description,
        postedAt: row.date,
        rawPayload: { source: 'csv', originalRow: row.raw } as object,
      });
      inserted++;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: parsed.rows.length,
        inserted,
        skippedDuplicates: skipped,
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

interface CsvRow {
  date: Date;
  amount: number;
  description: string;
  raw: Record<string, string>;
  fingerprint: string;
}

interface CsvParseResult {
  rows: CsvRow[];
  errors: string[];
}

/**
 * Minimal RFC-4180-ish CSV parser. We don't pull in a library because the
 * imports would be heavy and our bank exports are simple. Handles quoted
 * fields and embedded commas.
 */
function parseCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must have a header row and at least one data row'] };
  }

  const headerLine = parseCsvLine(lines[0]);
  const lc = headerLine.map((h) => h.toLowerCase().trim());
  const dateIdx = lc.findIndex((h) => ['date', 'posted_at', 'posted at', 'post date', 'transaction date'].includes(h));
  const amountIdx = lc.findIndex((h) => ['amount', 'value', 'debit/credit'].includes(h));
  const descIdx = lc.findIndex((h) => ['description', 'desc', 'memo', 'narrative', 'details'].includes(h));

  if (dateIdx === -1 || amountIdx === -1 || descIdx === -1) {
    return { rows: [], errors: [`Missing required column. Need date, amount, description. Got: ${headerLine.join(', ')}`] };
  }

  const rows: CsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < headerLine.length) {
      errors.push(`Row ${i + 1} has ${cells.length} cells, expected ${headerLine.length}`);
      continue;
    }
    const dateRaw = cells[dateIdx];
    const amountRaw = cells[amountIdx];
    const desc = cells[descIdx];

    const date = parseDate(dateRaw);
    if (!date) {
      errors.push(`Row ${i + 1} unparseable date: "${dateRaw}"`);
      continue;
    }
    const amount = parseAmount(amountRaw);
    if (amount === null || Number.isNaN(amount)) {
      errors.push(`Row ${i + 1} unparseable amount: "${amountRaw}"`);
      continue;
    }

    const raw: Record<string, string> = {};
    for (let j = 0; j < headerLine.length; j++) raw[headerLine[j]] = cells[j];
    const fingerprint = createHash('sha256')
      .update(`${dateRaw}|${amountRaw}|${desc}`)
      .digest('hex')
      .slice(0, 40);

    rows.push({ date, amount, description: desc, raw, fingerprint });
  }

  return { rows, errors };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim();
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[\s$]/g, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  s = s.replace(/,/g, '');
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  // ISO YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // US MM/DD/YYYY
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (us) {
    const year = us[3].length === 2 ? 2000 + parseInt(us[3], 10) : parseInt(us[3], 10);
    const d = new Date(Date.UTC(year, parseInt(us[1], 10) - 1, parseInt(us[2], 10)));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Fall back to Date()
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
