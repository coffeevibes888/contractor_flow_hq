/**
 * POST /api/mobile/ocr/receipt
 *
 * Server-side proxy for receipt OCR. The mobile client uploads the image,
 * we run it through the most capable extractor available (OpenAI Vision →
 * Google Vision → heuristic parser fallback), and return a normalized shape:
 *
 *   { vendor, total, taxAmount, date, lineItems[], suggestedCategory, rawText, confidence }
 *
 * Why server-side: provider keys never ship to mobile. This also lets us
 * swap providers later without shipping a new app build.
 *
 * Body shape (multipart/form-data):
 *   file: Blob — the receipt image (jpg/png/heic).
 *
 * Recommended env (try in order):
 *   OPENAI_API_KEY                — primary, GPT-4o-mini Vision
 *   GOOGLE_CLOUD_VISION_API_KEY   — fallback OCR before the heuristic parser
 *
 * If neither is set we fall back to a deterministic heuristic parser so
 * the mobile flow still demos. We tag the response with `provider: 'fallback'`
 * so the UI can show an "OCR unavailable" hint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { extractReceiptFromBuffer } from '@/lib/services/receipt-extraction';

interface OcrResult {
  vendor: string | null;
  total: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  date: string | null;          // ISO timestamp
  lineItems: { description: string; amount: number }[];
  suggestedCategory: string;
  rawText: string;
  confidence: number;           // 0..1 overall
  fieldConfidence: {
    vendor: number;
    total: number;
    subtotal: number;
    tax: number;
    date: number;
  };
  provider: 'openai' | 'google-vision' | 'fallback';
}

async function authed(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return false;
  const payload = await verifyMobileToken(token);
  return !!payload;
}

// Vision calls can take a few seconds on cold starts. Allow up to 60s and
// keep this on the Node runtime so Buffer + multipart parsing work.
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!(await authed(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    let rawText = '';
    let provider: OcrResult['provider'] = 'fallback';

    // ── 1) Try OpenAI Vision first when configured ───────────────────────
    if (process.env.OPENAI_API_KEY) {
      try {
        const ai = await extractReceiptFromBuffer(buffer, file.type || 'image/jpeg');
        if (ai.source === 'openai' && (ai.amount || ai.vendor)) {
          // Map the shared ExtractedReceipt shape into the mobile response.
          // Field-level confidence values aren't returned by OpenAI, so we
          // synthesize them from overall confidence — high when fields are
          // present, low otherwise. This is what the mobile UI uses to
          // highlight low-confidence fields with a yellow border.
          const overall = Math.min(Math.max(ai.confidence / 100, 0), 1);
          const presence = (v: unknown) => (v != null && v !== '' ? overall : 0);
          const totalNum = ai.amount ? parseFloat(ai.amount) : null;

          const result: OcrResult = {
            vendor: ai.vendor,
            total: totalNum,
            subtotal: ai.subtotal ?? null,
            taxAmount: ai.taxAmount ?? null,
            date: ai.date ? new Date(ai.date).toISOString() : null,
            lineItems: ai.lineItems ?? [],
            suggestedCategory: ai.category,
            rawText: '',
            confidence: overall,
            fieldConfidence: {
              vendor: presence(ai.vendor),
              total: presence(totalNum),
              subtotal: presence(ai.subtotal),
              tax: presence(ai.taxAmount),
              date: presence(ai.date),
            },
            provider: 'openai',
          };
          return NextResponse.json(result);
        }
      } catch (err) {
        console.warn('[ocr/receipt] OpenAI extraction threw, falling back', err);
      }
    }

    // ── 2) Google Cloud Vision fallback (only if its key is set) ─────────
    if (apiKey) {
      const base64 = buffer.toString('base64');
      // Google Cloud Vision DOCUMENT_TEXT_DETECTION returns the most accurate
      // structured text for receipts.
      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64 },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            }],
          }),
        },
      );
      if (visionRes.ok) {
        const json = await visionRes.json();
        rawText = json?.responses?.[0]?.fullTextAnnotation?.text ?? '';
        provider = 'google-vision';
      } else {
        console.warn('Vision API error', visionRes.status, await visionRes.text());
      }
    }

    // ── 3) Final heuristic parse over whatever raw text we have ──────────
    const parsed = parseReceiptText(rawText);
    const result: OcrResult = { ...parsed, rawText, provider };
    return NextResponse.json(result);
  } catch (e) {
    console.error('ocr receipt', e);
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 });
  }
}

// ─── Heuristic parser ──────────────────────────────────────────────────────
// Extracts vendor, total, tax, date and category from raw OCR text. Built to
// handle US-style receipts (Home Depot, Lowe's, gas stations, hardware
// stores). The rules are intentionally simple and explainable — the user
// always reviews the extracted fields before saving.

function parseReceiptText(text: string): Omit<OcrResult, 'rawText' | 'provider'> {
  const empty = {
    vendor: null,
    total: null,
    subtotal: null,
    taxAmount: null,
    date: null,
    lineItems: [],
    suggestedCategory: 'other',
    confidence: 0,
    fieldConfidence: { vendor: 0, total: 0, subtotal: 0, tax: 0, date: 0 },
  };
  if (!text) return empty;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // ── Vendor (first non-empty, non-numeric, non-address-y line) ────────────
  let vendor: string | null = null;
  let vendorConfidence = 0;
  for (const line of lines.slice(0, 5)) {
    if (!line) continue;
    if (/^[\d\s\-:,.\/]+$/.test(line)) continue; // pure numbers / punctuation
    if (line.length > 50) continue; // likely an address line
    vendor = line.slice(0, 60);
    // Confidence rises if the line looks like a brand name
    vendorConfidence = /^[A-Z][A-Z\s&'\-.]+$/i.test(line) ? 0.85 : 0.55;
    break;
  }

  // ── Money fields (subtotal, tax, total) ──────────────────────────────────
  // Walk from the bottom up — totals are almost always near the end.
  let total: number | null = null;
  let subtotal: number | null = null;
  let taxAmount: number | null = null;
  let totalConfidence = 0;
  let subtotalConfidence = 0;
  let taxConfidence = 0;

  const moneyOnLine = (line: string): number | null => {
    const matches = [...line.matchAll(/\$?\s*(\d{1,5}(?:[,]\d{3})*(?:\.\d{2}))/g)];
    if (matches.length === 0) return null;
    // The total/tax value is usually the rightmost money on the line
    const last = matches[matches.length - 1];
    const v = parseFloat(last[1].replace(/,/g, ''));
    return isNaN(v) ? null : v;
  };

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const upper = line.toUpperCase();
    const v = moneyOnLine(line);
    if (v == null) continue;

    if (
      total == null &&
      /\b(GRAND\s*TOTAL|TOTAL\s*DUE|AMOUNT\s*DUE|BALANCE\s*DUE|TOTAL)\b/.test(upper) &&
      !/\b(SUB|SUBTOTAL|PAID|TAX)\b/.test(upper)
    ) {
      total = v;
      totalConfidence = /GRAND\s*TOTAL|TOTAL\s*DUE/.test(upper) ? 0.95 : 0.85;
    }
    if (subtotal == null && /\b(SUBTOTAL|SUB\s*TOTAL)\b/.test(upper)) {
      subtotal = v;
      subtotalConfidence = 0.85;
    }
    if (taxAmount == null && /\b(TAX|GST|HST|VAT|SALES\s*TAX)\b/.test(upper)) {
      taxAmount = v;
      taxConfidence = 0.85;
    }
  }

  // ── Fallback: largest money value on the receipt = probable total ────────
  if (total == null) {
    const allMoney = (text.match(/\$?\s*(\d{1,5}(?:[,]\d{3})*(?:\.\d{2}))/g) ?? [])
      .map((m) => parseFloat(m.replace(/[,$\s]/g, '')))
      .filter((n) => !isNaN(n));
    if (allMoney.length > 0) {
      total = Math.max(...allMoney);
      totalConfidence = 0.45; // weak — flag in UI
    }
  }

  // Sanity check — if subtotal looks bigger than total, swap them
  if (subtotal != null && total != null && subtotal > total + 0.01) {
    const tmp = total;
    total = subtotal;
    subtotal = tmp;
    totalConfidence *= 0.7;
    subtotalConfidence *= 0.7;
  }

  // ── Date ─────────────────────────────────────────────────────────────────
  let date: string | null = null;
  let dateConfidence = 0;
  const dateMatch =
    text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/) ||
    text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatch) {
    try {
      let d: Date;
      if (dateMatch[0].includes('-') && dateMatch[0].length >= 10) {
        d = new Date(dateMatch[0]);
      } else {
        const m = parseInt(dateMatch[1], 10);
        const day = parseInt(dateMatch[2], 10);
        let y = parseInt(dateMatch[3], 10);
        if (y < 100) y += 2000;
        d = new Date(y, m - 1, day);
      }
      if (!isNaN(d.getTime())) {
        // Reject futures and dates more than 3 years old
        const now = Date.now();
        const dms = d.getTime();
        if (dms <= now + 24 * 3600 * 1000 && dms > now - 3 * 365 * 24 * 3600 * 1000) {
          date = d.toISOString();
          dateConfidence = 0.85;
        }
      }
    } catch { /* ignore */ }
  }

  // ── Line items ───────────────────────────────────────────────────────────
  // A line item looks like: "DESCRIPTION ... $X.XX" with no TAX/TOTAL keyword.
  // We only count lines that have a single money value at the end.
  const lineItems: { description: string; amount: number }[] = [];
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (/\b(TOTAL|SUB|TAX|TIP|BALANCE|CHANGE|CASH|VISA|MASTERCARD|AMEX|DEBIT|CREDIT|AUTH|APPROVED|RECEIPT|MERCHANT|TRANSACTION|REF|PAID)\b/.test(upper)) continue;
    const m = line.match(/^(.+?)\s+\$?\s*(\d{1,4}(?:[,]\d{3})*(?:\.\d{2}))\s*$/);
    if (!m) continue;
    const desc = m[1].trim();
    if (desc.length < 2 || desc.length > 60) continue;
    if (/^[\d\s\-:,.\/]+$/.test(desc)) continue;
    const amt = parseFloat(m[2].replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0 || amt > 10000) continue;
    lineItems.push({ description: desc, amount: amt });
  }
  // Cap to 30 items so we don't return giant blobs.
  const trimmedLineItems = lineItems.slice(0, 30);

  // ── Suggested category from vendor keywords ──────────────────────────────
  const v = (vendor ?? '').toUpperCase();
  let suggestedCategory = 'other';
  if (/HOME\s*DEPOT|LOWES|ACE\s*HARDWARE|MENARDS|GRAINGER|TRUE\s*VALUE/.test(v)) suggestedCategory = 'maintenance';
  else if (/SHELL|CHEVRON|EXXON|MOBIL|BP|7-?ELEVEN|GAS|FUEL|SUNOCO|CITGO/.test(v)) suggestedCategory = 'travel';
  else if (/AT&T|VERIZON|COMCAST|XFINITY|UTILITY|ELECTRIC|WATER|POWER|GAS\s*COMPANY|PG&E|CONED/.test(v)) suggestedCategory = 'utilities';
  else if (/INSURANCE|GEICO|STATE\s*FARM|ALLSTATE|PROGRESSIVE/.test(v)) suggestedCategory = 'insurance';
  else if (/CLEAN|MAID|JANITOR/.test(v)) suggestedCategory = 'cleaning';
  else if (/STAPLES|OFFICE\s*MAX|OFFICE\s*DEPOT|AMAZON/.test(v)) suggestedCategory = 'supplies';
  else if (/DEPOT|HARDWARE|PAINT|PLUMB|ELECTRIC/.test(v)) suggestedCategory = 'maintenance';

  // ── Overall confidence (weighted average) ────────────────────────────────
  // Total carries the most weight — without it, the receipt is useless.
  const w = { vendor: 0.2, total: 0.45, date: 0.2, tax: 0.075, subtotal: 0.075 };
  const confidence =
    vendorConfidence * w.vendor +
    totalConfidence * w.total +
    dateConfidence * w.date +
    taxConfidence * w.tax +
    subtotalConfidence * w.subtotal;

  return {
    vendor,
    total,
    subtotal,
    taxAmount,
    date,
    lineItems: trimmedLineItems,
    suggestedCategory,
    confidence,
    fieldConfidence: {
      vendor: vendorConfidence,
      total: totalConfidence,
      subtotal: subtotalConfidence,
      tax: taxConfidence,
      date: dateConfidence,
    },
  };
}
