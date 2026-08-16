/**
 * POST /api/cards/request
 *
 * Issue a new card (virtual or physical) for the signed-in user.
 *
 * Body:
 *   {
 *     type: 'virtual' | 'physical',
 *     shippingAddress?: { line1, line2?, city, state, postal_code, country },
 *   }
 *
 * Guard rails:
 *   - User must own a verified Treasury wallet (resolveWallet enforces).
 *   - Stripe Issuing must be activated on the platform — surfaces a
 *     friendly `platform_not_enabled` reason if not.
 *   - Physical card requires a confirmed shipping address.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  IssuingError,
  requestCardForUser,
} from '@/lib/services/issuing.service';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      type?: 'virtual' | 'physical';
      shippingAddress?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: 'US';
      };
    };

    if (body.type !== 'virtual' && body.type !== 'physical') {
      return NextResponse.json(
        { error: 'Card type must be "virtual" or "physical".' },
        { status: 400 }
      );
    }
    if (body.type === 'physical' && !body.shippingAddress?.line1) {
      return NextResponse.json(
        { error: 'Confirm your shipping address before requesting a physical card.' },
        { status: 400 }
      );
    }

    const result = await requestCardForUser({
      userId: session.user.id,
      type: body.type,
      shippingAddress: body.shippingAddress,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof IssuingError) {
      return NextResponse.json(
        { success: false, code: err.code, error: err.userMessage },
        { status: 400 }
      );
    }
    console.error('[cards/request] failed', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err?.raw?.message ||
          err?.message ||
          'Could not issue card. Please try again.',
      },
      { status: 500 }
    );
  }
}
