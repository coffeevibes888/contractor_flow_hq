/**
 * Shared helpers for contractor API routes.
 *
 * Two cross-cutting concerns kept burning us:
 *
 * 1. Empty strings hitting Prisma. The browser sends `""` for unselected
 *    `<select>` and empty `<input>` values; Prisma rejects empty strings on
 *    `@db.Uuid` columns and similar. `normalizeRequestBody` walks the parsed
 *    JSON body and turns `""` into `null` recursively. Use it on all POST/PATCH
 *    bodies before passing them to Prisma.
 *
 * 2. Generic 500s with no detail. The original job creation 500 said
 *    "Failed to create job" with the actual error only in server logs. That
 *    drove a lot of the whack-a-mole. `errorResponse` returns a structured
 *    payload that includes the underlying message in non-production so future
 *    breakage shows up in the network tab without leaking secrets to prod.
 */

import { NextResponse } from 'next/server';

/**
 * Recursively replace empty strings with null in an object/array. Leaves
 * other primitives untouched. Mutates a new copy — input is not modified.
 */
export function normalizeRequestBody<T = unknown>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return (value === '' ? null : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => normalizeRequestBody(v)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalizeRequestBody(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Build a standard error JSON response. In non-production, includes a
 * `detail` field with the underlying error message so the network tab is
 * useful for debugging. In production, only the safe `error` string and the
 * caller-supplied `code` are returned.
 */
export function errorResponse(
  message: string,
  status: number,
  options?: { error?: unknown; code?: string }
) {
  const body: Record<string, unknown> = { error: message };
  if (options?.code) body.code = options.code;
  if (process.env.NODE_ENV !== 'production' && options?.error) {
    const err = options.error;
    body.detail = err instanceof Error ? err.message : String(err);
  }
  return NextResponse.json(body, { status });
}

/**
 * Convenience: typical "unexpected error" 500 response.
 * Logs server-side and returns the formatted error to the client.
 */
export function serverError(label: string, error: unknown) {
  console.error(`[contractor-route] ${label}:`, error);
  return errorResponse(label, 500, { error });
}

/**
 * Convert a date-like value (ISO string, Date, null, undefined) to a Date or
 * null. Used to coerce form `<input type="date">` values into Prisma
 * Timestamps. Empty strings (already normalized to null) and invalid dates
 * become null.
 */
export function parseDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return Number.isFinite(input.getTime()) ? input : null;
  if (typeof input === 'string' || typeof input === 'number') {
    const d = new Date(input);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}
