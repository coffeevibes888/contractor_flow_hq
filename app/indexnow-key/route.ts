/**
 * IndexNow domain-ownership proof.
 *
 * Served at `/indexnow-key` and pointed to by the `keyLocation` field in
 * every IndexNow submission so Bing knows where to verify ownership of
 * `propertyflowhq.com`. We don't need to live at `/<key>.txt` because
 * IndexNow accepts any URL via `keyLocation`.
 *
 * Reads INDEXNOW_KEY from env. Returns 404 when unset.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new NextResponse('Not Found', { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
