/**
 * POST /api/contractor/route-optimize
 *
 * Given a list of job addresses and an optional starting address (warehouse/office),
 * returns the optimized drive order using the Google Maps Directions API
 * with waypoint optimization enabled.
 *
 * Falls back to the original order if the API key is missing or the call fails.
 *
 * Body:
 *   origin: string          — starting address (e.g. office/warehouse)
 *   jobs: Array<{
 *     id: string
 *     title: string
 *     address: string       — full address string
 *     estimatedHours: number | null
 *   }>
 *
 * Returns:
 *   optimizedOrder: same jobs array reordered
 *   totalDistanceMiles: number
 *   totalDurationMinutes: number
 *   legs: Array<{ from, to, distanceMiles, durationMinutes }>
 *   mapsUrl: string         — Google Maps URL with all waypoints in order
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

interface JobStop {
  id: string;
  title: string;
  address: string;
  estimatedHours: number | null;
}

interface Leg {
  from: string;
  to: string;
  distanceMiles: number;
  durationMinutes: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { origin, jobs } = body as { origin?: string; jobs: JobStop[] };

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ error: 'No jobs provided' }, { status: 400 });
    }

    // Filter to jobs that have addresses
    const addressedJobs = jobs.filter((j) => j.address?.trim());
    if (addressedJobs.length === 0) {
      return NextResponse.json({ error: 'No jobs have addresses' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // ── No API key — return original order with a Maps URL ──────────────────
    if (!apiKey) {
      const mapsUrl = buildMapsUrl(origin, addressedJobs);
      return NextResponse.json({
        optimizedOrder: addressedJobs,
        totalDistanceMiles: null,
        totalDurationMinutes: null,
        legs: [],
        mapsUrl,
        note: 'Google Maps API key not configured — showing original order',
      });
    }

    // ── Single stop — no optimization needed ────────────────────────────────
    if (addressedJobs.length === 1) {
      const mapsUrl = buildMapsUrl(origin, addressedJobs);
      return NextResponse.json({
        optimizedOrder: addressedJobs,
        totalDistanceMiles: null,
        totalDurationMinutes: null,
        legs: [],
        mapsUrl,
      });
    }

    // ── Call Google Maps Directions API with waypoint optimization ───────────
    const waypoints = addressedJobs.slice(0, -1).map((j) => encodeURIComponent(j.address));
    const destination = encodeURIComponent(addressedJobs[addressedJobs.length - 1].address);
    const originParam = origin ? encodeURIComponent(origin) : encodeURIComponent(addressedJobs[0].address);

    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${originParam}` +
      `&destination=${destination}` +
      (waypoints.length > 0 ? `&waypoints=optimize:true|${waypoints.join('|')}` : '') +
      `&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      // API error — fall back to original order
      const mapsUrl = buildMapsUrl(origin, addressedJobs);
      return NextResponse.json({
        optimizedOrder: addressedJobs,
        totalDistanceMiles: null,
        totalDurationMinutes: null,
        legs: [],
        mapsUrl,
        note: `Maps API returned ${data.status} — showing original order`,
      });
    }

    const route = data.routes[0];
    const waypointOrder: number[] = route.waypoint_order ?? [];

    // Reconstruct optimized job order
    // The last job (destination) stays last; waypoints are reordered
    const waypointJobs = addressedJobs.slice(0, -1);
    const lastJob = addressedJobs[addressedJobs.length - 1];
    const optimizedWaypoints = waypointOrder.map((i) => waypointJobs[i]);
    const optimizedOrder = [...optimizedWaypoints, lastJob];

    // Build legs summary
    const legs: Leg[] = route.legs.map((leg: any, i: number) => ({
      from: i === 0 ? (origin ?? optimizedOrder[0].address) : optimizedOrder[i - 1]?.address ?? '',
      to: optimizedOrder[i]?.address ?? '',
      distanceMiles: parseFloat((leg.distance.value / 1609.34).toFixed(1)),
      durationMinutes: Math.round(leg.duration.value / 60),
    }));

    const totalDistanceMiles = parseFloat(
      legs.reduce((s, l) => s + l.distanceMiles, 0).toFixed(1)
    );
    const totalDurationMinutes = legs.reduce((s, l) => s + l.durationMinutes, 0);

    const mapsUrl = buildMapsUrl(origin, optimizedOrder);

    return NextResponse.json({
      optimizedOrder,
      totalDistanceMiles,
      totalDurationMinutes,
      legs,
      mapsUrl,
    });
  } catch (error) {
    console.error('[route-optimize]', error);
    return NextResponse.json({ error: 'Route optimization failed' }, { status: 500 });
  }
}

function buildMapsUrl(origin: string | undefined, jobs: JobStop[]): string {
  if (jobs.length === 0) return 'https://maps.google.com';

  const base = 'https://www.google.com/maps/dir/';
  const parts: string[] = [];

  if (origin) parts.push(encodeURIComponent(origin));
  for (const j of jobs) {
    if (j.address) parts.push(encodeURIComponent(j.address));
  }

  return base + parts.join('/');
}
