/**
 * POST /api/cards/:id/details
 *
 * Returns a one-shot Stripe ephemeral key the client can use with
 * Stripe.js Issuing Elements (`paymentMethodDomains`-style flow) to
 * render the FULL card number, CVV, and expiry. We never see the PAN
 * server-side.
 *
 * Body: { code: string }   // 6-digit TOTP or backup code from 2FA
 *
 * The user must have 2FA enrolled. Failing that, we return 403 with a
 * `code: twofa_required` so the UI can route to setup.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createCardEphemeralKey,
  IssuingError,
} from '@/lib/services/issuing.service';
import {
  has2FAEnabled,
  verify2FALogin,
} from '@/lib/security/two-factor-auth';
import { logAuditEvent } from '@/lib/security/audit-logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = (body.code || '').trim();
    if (!code) {
      return NextResponse.json(
        { error: 'Two-factor verification code is required.' },
        { status: 400 }
      );
    }

    const twoFAOn = await has2FAEnabled(session.user.id);
    if (!twoFAOn) {
      return NextResponse.json(
        {
          error:
            'Set up two-factor authentication before viewing full card details.',
          code: 'twofa_required',
        },
        { status: 403 }
      );
    }

    const ok = await verify2FALogin(session.user.id, code);
    if (!ok) {
      logAuditEvent({
        action: 'SENSITIVE_DATA_ACCESSED',
        userId: session.user.id,
        resourceType: 'issuing_card_reveal_attempt',
        severity: 'WARNING',
        metadata: { result: 'invalid_2fa_code', cardId: id },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Invalid verification code.' },
        { status: 400 }
      );
    }

    const result = await createCardEphemeralKey(session.user.id, id);

    logAuditEvent({
      action: 'SENSITIVE_DATA_ACCESSED',
      userId: session.user.id,
      resourceType: 'issuing_card_details',
      resourceId: result.cardId,
      severity: 'INFO',
    }).catch(() => {});

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    });
  } catch (err: any) {
    if (err instanceof IssuingError) {
      return NextResponse.json(
        { error: err.userMessage },
        { status: err.code === 'card_not_found' ? 404 : 400 }
      );
    }
    console.error('[cards/details] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not load card details.' },
      { status: 500 }
    );
  }
}
