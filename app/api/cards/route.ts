/**
 * GET /api/cards
 *
 * List the signed-in user's issued cards (excluding canceled).
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listCardsForUser } from '@/lib/services/issuing.service';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await listCardsForUser(session.user.id);
  // Map rows to a slim shape — never expose stripe ids that aren't needed.
  const cards = rows.map((c) => ({
    id: c.id,
    type: c.type as 'virtual' | 'physical',
    status: c.status,
    frozen: c.frozen,
    last4: c.last4,
    brand: c.brand,
    expMonth: c.expMonth,
    expYear: c.expYear,
    monthlyLimitCents:
      c.monthlyLimitCents === null ? null : Number(c.monthlyLimitCents),
    blockedCategories: c.blockedCategories,
    shippingStatus: c.shippingStatus,
    shippingTrackingNumber: c.shippingTrackingNumber,
    shippingCarrier: c.shippingCarrier,
    createdAt: c.createdAt.toISOString(),
  }));
  return NextResponse.json({ cards });
}
