import { SERVER_URL } from '@/lib/constants';

/**
 * Returns the canonical absolute URL for a given path on this site.
 * Uses SERVER_URL as the canonical host so all duplicate routes
 * (/c/{slug}, /{slug}, subdomain.host/...) collapse to one signal.
 */
export function canonicalUrl(path: string): string {
  const base = SERVER_URL.replace(/\/+$/, '');
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleaned}`;
}

/**
 * Truncates a description for `<meta name="description">` and OG tags.
 * Aims for under 160 chars with whole-word boundaries.
 */
export function truncateDescription(input: string | null | undefined, max = 160): string {
  if (!input) return '';
  // Collapse whitespace to single spaces and strip very basic HTML
  const cleaned = input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s.,;:!?-]+$/, '')}…`;
}

/**
 * Format USD amounts compactly for SEO copy.
 * 1500 → "$1,500", 1500000 → "$1,500,000"
 */
export function formatPriceShort(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * Compose a "City, ST" location string, falling back to whatever pieces are present.
 */
export function formatLocation(city?: string | null, state?: string | null): string {
  const c = (city || '').trim();
  const s = (state || '').trim();
  if (c && s) return `${c}, ${s}`;
  return c || s || '';
}
