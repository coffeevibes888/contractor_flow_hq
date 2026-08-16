/**
 * POST /api/stripe/treasury/reveal
 *
 * Returns the FULL routing + account number for the user's Treasury
 * financial account. Gated by:
 *   1. Auth (the landlord owner only — admins/employees cannot reveal)
 *   2. Either a fresh TOTP code or backup code from their 2FA enrollment
 *      (users without 2FA enrolled get a 403 telling them to set it up).
 *   3. We fetch the value live from Stripe — we never store the full
 *      account number in our DB, so a DB leak alone can't expose it.
 *
 * Body: { code: string }   // 6-digit TOTP or 8-char backup code
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { has2FAEnabled, verify2FALogin } from '@/lib/security/two-factor-auth';
import { logAuditEvent } from '@/lib/security/audit-logger';
import type { TreasuryRevealResponse } from '@/types/stripe';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json(
        { error: landlordResult.message || 'Landlord not found' },
        { status: 404 }
      );
    }
    const landlord = landlordResult.landlord;

    // Owner-only — employees and admins of THIS landlord cannot reveal.
    if (landlord.ownerUserId && landlord.ownerUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the account owner can reveal account numbers.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = (body?.code ?? '').toString().trim();
    if (!code) {
      return NextResponse.json(
        { error: 'Two-factor verification code is required.' },
        { status: 400 }
      );
    }

    // Require 2FA enrollment for this action — there is no insecure path
    // around this gate. If the user hasn't set up 2FA, send them there.
    const twoFAOn = await has2FAEnabled(session.user.id);
    if (!twoFAOn) {
      return NextResponse.json(
        {
          error:
            'Set up two-factor authentication before revealing account numbers.',
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
        landlordId: landlord.id,
        resourceType: 'treasury_reveal_attempt',
        severity: 'WARNING',
        metadata: { result: 'invalid_2fa_code' },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Invalid verification code.' },
        { status: 400 }
      );
    }

    // Find the financial account.
    const fa = await prisma.financialAccount.findFirst({
      where: { landlordId: landlord.id, status: { in: ['pending', 'active'] } },
    });
    if (!fa) {
      return NextResponse.json(
        { error: 'No Treasury account provisioned yet.' },
        { status: 404 }
      );
    }

    // Pull live ABA info from Stripe — never persisted in plaintext.
    const account = await stripe.treasury.financialAccounts.retrieve(
      fa.stripeFinancialAccountId,
      { expand: ['financial_addresses'] },
      { stripeAccount: fa.stripeConnectedAccountId }
    );
    const aba = account.financial_addresses?.find((a) => a.type === 'aba')?.aba;

    if (!aba?.account_number || !aba.routing_number) {
      return NextResponse.json(
        {
          error:
            'Account number not yet issued by Stripe. Try again in a minute.',
        },
        { status: 503 }
      );
    }

    // Audit every reveal — required for SOC2.
    logAuditEvent({
      action: 'SENSITIVE_DATA_ACCESSED',
      userId: session.user.id,
      landlordId: landlord.id,
      resourceType: 'treasury_account_number',
      resourceId: fa.stripeFinancialAccountId,
      severity: 'INFO',
    }).catch(() => {});

    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const payload: TreasuryRevealResponse = {
      success: true,
      routingNumber: aba.routing_number,
      accountNumber: aba.account_number,
      expiresAt,
    };
    return NextResponse.json(payload, {
      headers: {
        // Make double-sure no proxy caches the secret.
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('[stripe/treasury/reveal] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not reveal account information.' },
      { status: 500 }
    );
  }
}
