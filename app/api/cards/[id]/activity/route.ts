/**
 * GET /api/cards/:id/activity
 *
 * Returns the card's authorizations + completed transactions (joined and
 * ordered for the "Card Activity" tab).
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listCardActivity, IssuingError } from '@/lib/services/issuing.service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const data = await listCardActivity(session.user.id, id);
    return NextResponse.json({
      authorizations: data.authorizations.map((a) => ({
        id: a.id,
        amount: Number(a.amount),
        approved: a.approved,
        merchantName: a.merchantName,
        merchantCategory: a.merchantCategory,
        merchantCity: a.merchantCity,
        merchantState: a.merchantState,
        declineReason: a.declineReason,
        createdAt: a.createdAt.toISOString(),
      })),
      transactions: data.transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        merchantName: t.merchantName,
        merchantCategory: t.merchantCategory,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    if (err instanceof IssuingError) {
      return NextResponse.json(
        { error: err.userMessage },
        { status: err.code === 'card_not_found' ? 404 : 400 }
      );
    }
    console.error('[cards/activity] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not load card activity.' },
      { status: 500 }
    );
  }
}
