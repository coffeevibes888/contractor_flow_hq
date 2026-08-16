/**
 * POST /api/cards/:id/freeze
 *
 * Toggle freeze state. Body: { frozen: boolean }
 *
 * Stripe Issuing represents this with `status: 'inactive' | 'active'`.
 * We persist a separate boolean for clarity and reflect both.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { setCardFrozen, IssuingError } from '@/lib/services/issuing.service';

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
    const body = (await req.json().catch(() => ({}))) as { frozen?: boolean };
    if (typeof body.frozen !== 'boolean') {
      return NextResponse.json(
        { error: 'frozen (boolean) is required.' },
        { status: 400 }
      );
    }
    await setCardFrozen(session.user.id, id, body.frozen);
    return NextResponse.json({ success: true, frozen: body.frozen });
  } catch (err: any) {
    if (err instanceof IssuingError) {
      return NextResponse.json(
        { error: err.userMessage },
        { status: err.code === 'card_not_found' ? 404 : 400 }
      );
    }
    console.error('[cards/freeze] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not update card.' },
      { status: 500 }
    );
  }
}
