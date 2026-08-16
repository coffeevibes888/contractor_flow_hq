/**
 * Short-lived signed tokens for owner statement public downloads.
 *
 * Format: base64url(payload).base64url(hmac_sha256(payload, secret))
 * Payload: { sid: statementId, exp: epochMs }
 *
 * Used so we can email an owner a link like
 *   /api/public/owner-statements/{id}/pdf?token=...
 * without exposing the PDF to the world forever. The link expires after
 * the configured TTL (default 90 days).
 */

import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_SECRET = process.env.OWNER_STATEMENT_TOKEN_SECRET
  || process.env.NEXTAUTH_SECRET
  || process.env.AUTH_SECRET
  || 'propertyflow-owner-statement-token-fallback-dev-only';

const DEFAULT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function b64urlEncode(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (s.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function sign(payload: string): string {
  return b64urlEncode(createHmac('sha256', TOKEN_SECRET).update(payload).digest());
}

export function issueOwnerStatementToken(statementId: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const payload = { sid: statementId, exp: Date.now() + ttlMs };
  const payloadStr = b64urlEncode(JSON.stringify(payload));
  const sig = sign(payloadStr);
  return `${payloadStr}.${sig}`;
}

export type VerifyResult = { ok: true; statementId: string } | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export function verifyOwnerStatementToken(token: string): VerifyResult {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [payloadStr, sig] = parts;
  const expected = sign(payloadStr);
  // Constant-time compare (both same length due to HMAC size)
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }
  let payload: { sid: string; exp: number };
  try {
    payload = JSON.parse(b64urlDecode(payloadStr).toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof payload.sid !== 'string' || typeof payload.exp !== 'number') {
    return { ok: false, reason: 'malformed' };
  }
  if (Date.now() > payload.exp) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, statementId: payload.sid };
}
