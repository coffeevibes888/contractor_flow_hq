/**
 * POST /api/mobile/auth/logout
 *
 * Stateless JWT logout. The mobile client discards its locally-stored
 * token; we just respond 200 so the client's best-effort logout call
 * doesn't fail. A future server-side token revocation table can hook
 * in here without changing the mobile contract.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ success: true });
}
