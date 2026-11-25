/**
 * GET /api/partner/marketplace/contractors
 *
 * Partner bridge endpoint. Lets a trusted sister site (Property Flow HQ)
 * fetch the public contractor marketplace listing from this site, which is
 * the single source of truth for contractor profiles.
 *
 * Only search/browse data crosses the boundary — no private contractor data.
 * Protected by the shared INTERNAL_API_SECRET (same pattern as
 * app/api/internal/check-blocked-ip). Requests without the matching
 * `x-internal-secret` header are rejected.
 *
 * Query params (all optional): q, specialty, location, sort, view.
 *
 * Response: { contractors: MarketplaceContractor[], normalizedSpecialty?: string }
 * The shape is identical to lib/services/load-marketplace-contractors so the
 * caller can render it without any remapping.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadMarketplaceContractors } from '@/lib/services/load-marketplace-contractors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const params = {
    q: searchParams.get('q') ?? undefined,
    specialty: searchParams.get('specialty') ?? undefined,
    location: searchParams.get('location') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    view: searchParams.get('view') ?? undefined,
  };

  try {
    const { contractors, normalizedSpecialty } =
      await loadMarketplaceContractors(params);
    // openJobsCount is intentionally omitted — open jobs belong to the
    // calling site's own database, not this one.
    return NextResponse.json(
      { contractors, normalizedSpecialty },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[partner/marketplace/contractors]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
