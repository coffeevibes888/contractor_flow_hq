/**
 * POST /api/mobile/auth/forgot-password
 *
 * Wraps the existing requestPasswordReset action so mobile clients can
 * trigger a reset email. Always returns success even when email isn't found
 * (prevents account enumeration).
 *
 * Body: { email: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/actions/auth.actions';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Fire and forget — never reveal whether email exists
    try {
      await requestPasswordReset(email.trim().toLowerCase());
    } catch (e) {
      console.error('[mobile/forgot-password]', e);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('[mobile/forgot-password]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
