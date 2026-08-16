/**
 * Receipt extraction service
 *
 * Single source of truth for turning a receipt image (or PDF) into structured
 * expense data: { vendor, amount, date, category, ocrText, confidence }.
 *
 * Strategy (tried in order, first one that succeeds wins):
 *   1. OpenAI GPT-4o-mini Vision — accurate, understands receipt structure,
 *      returns JSON. Default when OPENAI_API_KEY is set. ~$0.001-0.005/page.
 *   2. Tesseract.js with Cloudinary preprocessing — free fallback for when
 *      OpenAI is unavailable or rate-limited. Less accurate on phone photos.
 *
 * The route handlers should treat every code path here as recoverable; this
 * module never throws past its own boundary — it returns partial data with a
 * `source` discriminator so callers can decide what to do.
 */

export interface ExtractedReceipt {
  amount: string | null;
  vendor: string | null;
  date: string | null; // YYYY-MM-DD
  category: string;
  ocrText: string;
  confidence: number; // 0-100
  source: 'openai' | 'tesseract' | 'tesseract-preprocessed' | 'none';
  warning?: string;
  /** Optional structured fields populated by the OpenAI extractor. */
  subtotal?: number | null;
  taxAmount?: number | null;
  lineItems?: { description: string; amount: number }[];
}

const EMPTY: ExtractedReceipt = {
  amount: null,
  vendor: null,
  date: null,
  category: 'other',
  ocrText: '',
  confidence: 0,
  source: 'none',
};

/**
 * Main entry point — extract structured data from a receipt image URL.
 */
export async function extractReceipt(
  fileUrl: string,
  fileType?: string,
): Promise<ExtractedReceipt> {
  if (!fileUrl) return { ...EMPTY, warning: 'No file URL provided' };

  // PDFs aren't supported by Tesseract directly. OpenAI Vision *can* read
  // PDFs but we'd need to convert pages first. Skip for now and let the
  // caller fill in manually.
  if (fileType?.toLowerCase().includes('pdf')) {
    return {
      ...EMPTY,
      warning: 'PDF receipts must be filled in manually',
    };
  }

  // ── 1) Try OpenAI Vision first when configured ───────────────────────────
  if (process.env.OPENAI_API_KEY) {
    const aiResult = await tryOpenAI(fileUrl);
    // Accept any result with a parsed amount or vendor — partial wins.
    if (aiResult && (aiResult.amount || aiResult.vendor)) {
      return aiResult;
    }
    // Fall through if OpenAI returned nothing useful.
  }

  // ── 2) Tesseract fallback ────────────────────────────────────────────────
  // Try the pre-processed image first (much better accuracy on photos)
  const preprocessedUrl = buildPreprocessedUrl(fileUrl);
  if (preprocessedUrl && preprocessedUrl !== fileUrl) {
    const preResult = await tryTesseract(preprocessedUrl);
    if (preResult && preResult.confidence > 50 && preResult.amount) {
      return { ...preResult, source: 'tesseract-preprocessed' };
    }
    // If preprocessing gave us text but no amount, fall through to original
    // image — sometimes preprocessing over-sharpens and hides decimals.
    if (preResult && preResult.ocrText && !preResult.amount) {
      const rawResult = await tryTesseract(fileUrl);
      if (rawResult?.amount) return { ...rawResult, source: 'tesseract' };
      return { ...preResult, source: 'tesseract-preprocessed' };
    }
    if (preResult) return { ...preResult, source: 'tesseract-preprocessed' };
  }

  // Fall back to the original image
  const rawResult = await tryTesseract(fileUrl);
  if (rawResult) return rawResult;

  return { ...EMPTY, warning: 'OCR engine unavailable' };
}

// ─── OpenAI Vision (primary) ──────────────────────────────────────────────────

/**
 * The set of categories the prompt asks the model to choose from. Must match
 * `VALID_CATEGORIES` below so `normalizeCategory` accepts whatever comes
 * back. Keeping this list tight reduces hallucinated values.
 */
const ALLOWED_CATEGORIES = [
  'maintenance',
  'utilities',
  'insurance',
  'taxes',
  'supplies',
  'landscaping',
  'cleaning',
  'legal',
  'advertising',
  'management',
  'other',
] as const;

const RECEIPT_PROMPT = `You are an OCR + expense classifier. Read the receipt image and respond with ONLY a JSON object matching this schema:

{
  "vendor": string | null,           // store/business name as printed
  "amount": string | null,           // grand total as a number string with 2 decimals (e.g. "12.34"). NEVER include currency symbols or thousands separators.
  "subtotal": number | null,
  "taxAmount": number | null,
  "date": string | null,             // ISO date, "YYYY-MM-DD". Use the receipt's printed date, not today.
  "category": string,                // one of: ${ALLOWED_CATEGORIES.join(', ')}
  "lineItems": [{ "description": string, "amount": number }],
  "confidence": number               // 0-100, your overall confidence in the extracted fields
}

Rules:
- If a field is unreadable or missing, set it to null (or [] for lineItems).
- Pick the category that best fits the vendor / line items. Default to "other" if unsure.
- Do not invent fields. Do not include any prose outside the JSON.`;

/** Try the OpenAI Vision extraction. Returns null if it fails or is misconfigured. */
async function tryOpenAI(fileUrl: string): Promise<ExtractedReceipt | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      // 4o-mini is cheap and accurate enough for receipt OCR. Stay on it
      // unless we see structural errors that warrant the bigger model.
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: RECEIPT_PROMPT },
              { type: 'image_url', image_url: { url: fileUrl, detail: 'high' } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      console.error('[receipt-extraction] OpenAI HTTP error:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) return null;

    let parsed: any;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error('[receipt-extraction] OpenAI returned non-JSON:', e);
      return null;
    }

    return mapOpenAIResult(parsed);
  } catch (err) {
    console.error('[receipt-extraction] OpenAI call failed:', err);
    return null;
  }
}

/** Normalize OpenAI JSON into the ExtractedReceipt shape we promise callers. */
function mapOpenAIResult(parsed: any): ExtractedReceipt {
  // amount: prefer string (already 2dp), but accept number too.
  let amount: string | null = null;
  const rawAmount = parsed.amount ?? parsed.total ?? null;
  if (typeof rawAmount === 'number' && isFinite(rawAmount)) {
    amount = rawAmount.toFixed(2);
  } else if (typeof rawAmount === 'string') {
    const n = parseFloat(rawAmount.replace(/[^0-9.\-]/g, ''));
    if (!isNaN(n)) amount = n.toFixed(2);
  }

  // date: pass through if YYYY-MM-DD, otherwise normalize.
  let date: string | null = null;
  if (typeof parsed.date === 'string' && parsed.date.length >= 8) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      date = parsed.date;
    } else {
      const d = new Date(parsed.date);
      if (!isNaN(d.getTime())) date = d.toISOString().slice(0, 10);
    }
  }

  // confidence: clamp 0-100. OpenAI sometimes returns 0-1 instead.
  let confidence = 0;
  if (typeof parsed.confidence === 'number' && isFinite(parsed.confidence)) {
    confidence = parsed.confidence > 1 ? Math.min(parsed.confidence, 100) : parsed.confidence * 100;
  } else if (amount && parsed.vendor) {
    // No confidence reported but we got the two main fields — call it high.
    confidence = 85;
  }

  return {
    amount,
    vendor: typeof parsed.vendor === 'string' ? parsed.vendor.slice(0, 80).trim() || null : null,
    date,
    category: normalizeCategory(parsed.category),
    ocrText: '', // OpenAI Vision doesn't return raw OCR text; we don't need it.
    confidence,
    source: 'openai',
    subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
    taxAmount: typeof parsed.taxAmount === 'number' ? parsed.taxAmount : null,
    lineItems: Array.isArray(parsed.lineItems)
      ? parsed.lineItems
          .filter((li: any) => li && typeof li.description === 'string' && typeof li.amount === 'number')
          .slice(0, 50)
      : [],
  };
}

/**
 * Buffer-based variant of the OpenAI extractor. The mobile API receives
 * the receipt image as a multipart upload, not as a URL, so we encode it
 * inline as a data URL for the Vision call.
 */
export async function extractReceiptFromBuffer(
  buffer: Buffer,
  mimeType = 'image/jpeg',
): Promise<ExtractedReceipt> {
  if (!process.env.OPENAI_API_KEY) {
    return { ...EMPTY, warning: 'OPENAI_API_KEY not configured' };
  }

  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
  const result = await tryOpenAI(dataUrl);
  return result ?? { ...EMPTY, warning: 'OpenAI extraction failed' };
}

// ─── Cloudinary preprocessing ─────────────────────────────────────────────────

/**
 * Inject Cloudinary transformations into a stored secure_url to produce a
 * cleaned-up image that's much easier for Tesseract to read.
 *
 * Transformations applied:
 *   - a_auto:           auto-orient (handles rotated phone photos)
 *   - e_grayscale:      strip color (Tesseract reads grayscale better)
 *   - e_auto_contrast:  stretch histogram for crumpled / low-light photos
 *   - e_sharpen:100:    enhance text edges
 *   - e_improve:        Cloudinary's auto-tuning filter
 *   - q_auto:           auto-quality
 *   - w_2000,c_limit:   cap width to 2000px so big phone photos don't OOM
 *
 * Returns the same URL untouched if it's not a Cloudinary upload URL.
 */
function buildPreprocessedUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;

  // Only Cloudinary supports inline transformations
  const match = fileUrl.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/,
  );
  if (!match) return fileUrl;

  const [, base, rest] = match;
  // Don't double-apply if a transformation chain already exists
  if (
    /^(?:[a-z]_[^/]+,?)+\//i.test(rest) &&
    /e_grayscale|e_auto_contrast/.test(rest)
  ) {
    return fileUrl;
  }

  const transforms = [
    'a_auto',
    'e_grayscale',
    'e_auto_contrast',
    'e_sharpen:100',
    'e_improve',
    'q_auto:good',
    'w_2000',
    'c_limit',
    'f_jpg',
  ].join(',');

  return `${base}${transforms}/${rest}`;
}

// ─── Tesseract.js fallback ────────────────────────────────────────────────────

async function tryTesseract(fileUrl: string): Promise<ExtractedReceipt | null> {
  let worker: any = null;
  try {
    const imageRes = await fetch(fileUrl, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!imageRes.ok) {
      console.error('[receipt-extraction] Failed to fetch image:', imageRes.status);
      return { ...EMPTY, warning: 'Could not download receipt image' };
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tesseractMod = await import('tesseract.js').catch((e) => {
      console.error('[receipt-extraction] Tesseract import failed:', e);
      return null;
    });
    if (!tesseractMod?.createWorker) {
      return { ...EMPTY, warning: 'OCR engine unavailable' };
    }

    worker = await tesseractMod.createWorker('eng');

    // Receipt-tuned settings:
    //   - PSM 4 = single column of text of variable sizes (typical receipt)
    //   - OEM 1 = LSTM neural net only (more accurate than legacy)
    //   - Restrict the character set to what shows up on receipts so the
    //     engine doesn't waste time guessing exotic glyphs.
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: '4',
        tessedit_ocr_engine_mode: '1',
        preserve_interword_spaces: '1',
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,/:#$%-&\'',
      });
    } catch {
      // Some Tesseract.js versions ignore unknown params — fail soft
    }

    const { data } = await worker.recognize(buffer);

    const ocrText = data?.text || '';
    const confidence = data?.confidence ?? 0;

    return {
      ...extractFromText(ocrText),
      ocrText,
      confidence,
      source: 'tesseract',
    };
  } catch (err) {
    console.error('[receipt-extraction] Tesseract OCR failed:', err);
    return { ...EMPTY, warning: 'OCR processing failed' };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        /* swallow */
      }
    }
  }
}

// ─── Text-based extraction (used by Tesseract fallback) ───────────────────────

export function extractFromText(text: string): {
  amount: string | null;
  vendor: string | null;
  date: string | null;
  category: string;
} {
  return {
    amount: extractAmount(text),
    vendor: extractVendor(text),
    date: extractDate(text),
    category: detectCategory(text),
  };
}

export function extractAmount(text: string): string | null {
  if (!text) return null;

  // Priority 1: explicit "Total" / "Amount Due" / "Grand Total" labels
  // Handle uppercase, asterisks around words, multiple spaces
  const labelPatterns = [
    /(?:grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*amount|total\s*paid)[^\d$]*\$?\s*(\d{1,3}(?:[,.]?\d{3})*(?:\.\d{2}))/i,
    /(?:^|\n)\s*\*?\s*total\s*\*?[^\d$]*\$?\s*(\d{1,3}(?:[,.]?\d{3})*(?:\.\d{2}))/im,
    /(?:^|\n)\s*subtotal[^\d$]*\$?\s*(\d{1,3}(?:[,.]?\d{3})*(?:\.\d{2}))/im,
  ];
  for (const p of labelPatterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0 && val < 1_000_000) return val.toFixed(2);
    }
  }

  // Priority 2: largest dollar amount on the page (usually the total)
  const withSign = [...text.matchAll(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g)];
  if (withSign.length > 0) {
    const nums = withSign
      .map((m) => parseFloat(m[1].replace(/,/g, '')))
      .filter((n) => !isNaN(n) && n > 0 && n < 1_000_000);
    if (nums.length > 0) return Math.max(...nums).toFixed(2);
  }

  // Priority 3: any decimal number that looks like a price
  const plain = [...text.matchAll(/(?:^|\s)(\d{1,3}(?:,\d{3})*\.\d{2})(?:\s|$)/g)];
  if (plain.length > 0) {
    const nums = plain
      .map((m) => parseFloat(m[1].replace(/,/g, '')))
      .filter((n) => !isNaN(n) && n > 1 && n < 100_000);
    if (nums.length > 0) return Math.max(...nums).toFixed(2);
  }

  return null;
}

export function extractVendor(text: string): string | null {
  if (!text) return null;

  // Known vendor name patterns (fuzzy match against OCR errors)
  const knownVendors: { name: string; patterns: RegExp[] }[] = [
    {
      name: 'Home Depot',
      patterns: [/home\s*depot/i, /h[o0]me\s*[d0]ep[o0]t/i, /homedep/i, /the\s+home\s+dep/i],
    },
    { name: "Lowe's", patterns: [/lowe['']?s/i, /l[o0]we[''s]/i] },
    { name: 'Menards', patterns: [/menards?/i] },
    { name: 'Ace Hardware', patterns: [/ace\s*hardware/i] },
    { name: 'Walmart', patterns: [/wal[\s-]?mart/i] },
    { name: 'Target', patterns: [/(?:^|\n)\s*target\s*$/im, /target\s*store/i] },
    { name: 'Costco', patterns: [/costco/i] },
    { name: 'Amazon', patterns: [/amazon\.com/i, /\bamzn\b/i] },
    { name: 'Sherwin-Williams', patterns: [/sherwin[\s-]?williams/i] },
    { name: 'Benjamin Moore', patterns: [/benjamin\s*moore/i] },
    { name: 'Grainger', patterns: [/grainger/i] },
    { name: 'Fastenal', patterns: [/fastenal/i] },
    { name: 'Ferguson', patterns: [/ferguson/i] },
    { name: 'Comcast', patterns: [/comcast/i, /xfinity/i] },
    { name: 'Spectrum', patterns: [/spectrum/i] },
    { name: 'AT&T', patterns: [/\bat\s*[&+]\s*t\b/i] },
    { name: 'Verizon', patterns: [/verizon/i] },
    { name: 'T-Mobile', patterns: [/t[\s-]?mobile/i] },
    { name: 'PG&E', patterns: [/pg\s*[&+]\s*e/i, /pacific\s+gas/i] },
    { name: 'State Farm', patterns: [/state\s+farm/i] },
    { name: 'Allstate', patterns: [/allstate/i] },
    { name: 'Farmers Insurance', patterns: [/farmers\s+insurance/i] },
    { name: 'Liberty Mutual', patterns: [/liberty\s+mutual/i] },
    { name: 'Stanley Steemer', patterns: [/stanley\s*steemer/i] },
  ];

  for (const v of knownVendors) {
    if (v.patterns.some((p) => p.test(text))) return v.name;
  }

  // Fallback: first non-numeric, non-date line (usually the store name)
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 60);

  for (const line of lines.slice(0, 6)) {
    if (
      !/^\d/.test(line) &&
      !/^\$/.test(line) &&
      !/^(total|subtotal|tax|date|receipt|invoice|thank|visit|www\.|http|store\s*#|tel|phone|tx|ref)/i.test(
        line,
      ) &&
      /[a-zA-Z]{3,}/.test(line) // must have at least 3 letters
    ) {
      return line.replace(/[^a-zA-Z0-9\s&'.,\-]/g, '').trim().slice(0, 60);
    }
  }

  return null;
}

export function extractDate(text: string): string | null {
  if (!text) return null;

  const patterns: RegExp[] = [
    /\b(\d{4}-\d{1,2}-\d{1,2})\b/, // ISO
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/, // US slash
    /\b(\d{1,2}-\d{1,2}-\d{2,4})\b/, // US dash
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i,
    /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})\b/i,
  ];

  const currentYear = new Date().getFullYear();
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const d = new Date(m[1]);
      if (
        !isNaN(d.getTime()) &&
        d.getFullYear() > 2000 &&
        d.getFullYear() <= currentYear + 1
      ) {
        return d.toISOString().split('T')[0];
      }
    }
  }

  return null;
}

export function detectCategory(text: string): string {
  if (!text) return 'other';
  const lower = text.toLowerCase();

  const rules: [string[], string][] = [
    [
      [
        'home depot',
        "lowe's",
        'lowes',
        'menards',
        'ace hardware',
        'hardware',
        'plumbing',
        'electrical supply',
        'lumber',
        'paint',
        'drywall',
        'tile',
        'flooring',
        'roofing',
        'repair',
        'replace',
        'install',
        'hvac',
        'furnace',
        'water heater',
        'appliance',
        'washer',
        'dryer',
        'refrigerator',
        'dishwasher',
        'sherwin',
        'benjamin moore',
        'grainger',
        'fastenal',
        'ferguson',
      ],
      'maintenance',
    ],
    [
      [
        'electric bill',
        'electricity',
        'gas bill',
        'natural gas',
        'water bill',
        'sewer',
        'trash',
        'waste management',
        'utility',
        'utilities',
        'power bill',
        'comcast',
        'spectrum',
        'at&t',
        'verizon',
        'internet',
        'cable',
        'pg&e',
        'con edison',
        'duke energy',
        'xcel',
        'xfinity',
      ],
      'utilities',
    ],
    [
      [
        'insurance',
        'policy',
        'premium',
        'coverage',
        'state farm',
        'allstate',
        'farmers',
        'liberty mutual',
        'nationwide',
      ],
      'insurance',
    ],
    [
      ['property tax', 'county tax', 'tax bill', 'tax assessment', 'irs', 'tax payment'],
      'taxes',
    ],
    [
      [
        'lawn',
        'landscap',
        'mow',
        'mulch',
        'tree service',
        'shrub',
        'garden',
        'irrigation',
        'sprinkler',
        'snow removal',
        'snow plow',
      ],
      'landscaping',
    ],
    [
      [
        'janitorial',
        'maid service',
        'housekeep',
        'carpet clean',
        'pressure wash',
        'window clean',
        'stanley steemer',
      ],
      'cleaning',
    ],
    [
      [
        'attorney',
        'lawyer',
        'legal fee',
        'court',
        'filing fee',
        'notary',
        'accountant',
        'cpa',
        'bookkeeping',
        'tax prep',
      ],
      'legal',
    ],
    [
      [
        'advertising',
        'listing fee',
        'zillow',
        'craigslist',
        'facebook ad',
        'marketing',
        'photography',
      ],
      'advertising',
    ],
    [
      [
        'management fee',
        'property management',
        'hoa',
        'association fee',
        'platform fee',
        'stripe fee',
        'processing fee',
      ],
      'management',
    ],
    [
      [
        'office supply',
        'staples',
        'office depot',
        'paper',
        'printer',
        'ink',
        'postage',
        'shipping',
        'fedex',
        'ups',
        'usps',
      ],
      'supplies',
    ],
  ];

  for (const [keywords, category] of rules) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }

  return 'other';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  'maintenance',
  'utilities',
  'insurance',
  'taxes',
  'supplies',
  'landscaping',
  'cleaning',
  'legal',
  'advertising',
  'management',
  'other',
]);

export function normalizeCategory(raw: unknown): string {
  if (!raw) return 'other';
  const lower = String(raw).toLowerCase().trim();
  if (VALID_CATEGORIES.has(lower)) return lower;
  // Map legacy / alternate names
  const map: Record<string, string> = {
    one_time_repairs: 'maintenance',
    owner_paid_utilities: 'utilities',
    platform_fees: 'management',
    recurring_expenses: 'management',
    repair: 'maintenance',
    repairs: 'maintenance',
    legal_professional: 'legal',
    professional: 'legal',
  };
  return map[lower] ?? 'other';
}
