/**
 * POST /api/cards/:id/limits
 *
 * Update spend controls.
 *
 * Body:
 *   { monthlyLimitCents?: number | null, blockedCategories?: string[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateCardLimits, IssuingError } from '@/lib/services/issuing.service';

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
    const body = (await req.json().catch(() => ({}))) as {
      monthlyLimitCents?: number | null;
      blockedCategories?: string[];
    };

    await updateCardLimits(session.user.id, id, {
      monthlyLimitCents: body.monthlyLimitCents,
      blockedCategories: body.blockedCategories,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof IssuingError) {
      return NextResponse.json(
        { error: err.userMessage },
        { status: err.code === 'card_not_found' ? 404 : 400 }
      );
    }
    console.error('[cards/limits] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not update limits.' },
      { status: 500 }
    );
  }
}
