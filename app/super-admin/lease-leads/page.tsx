import { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { CheckCircle, Clock, Mail, MapPin, Home, DollarSign, Globe, TrendingUp } from 'lucide-react';
import LeadsTableClient from './leads-table-client';

export const metadata: Metadata = { title: 'Free Lease Leads — SuperAdmin' };

export const dynamic = 'force-dynamic';

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

export default async function FreeLeaseLeadsPage() {
  await requireSuperAdmin();

  const [leads, totalCount, convertedCount, thisWeekCount] = await Promise.all([
    prisma.freeLeaseUsage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.freeLeaseUsage.count(),
    prisma.freeLeaseUsage.count({ where: { converted: true } }),
    prisma.freeLeaseUsage.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const conversionRate = totalCount > 0 ? ((convertedCount / totalCount) * 100).toFixed(1) : '0.0';

  // Top states
  const stateCounts: Record<string, number> = {};
  for (const l of leads) {
    if (l.state) stateCounts[l.state] = (stateCounts[l.state] || 0) + 1;
  }
  const topStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top UTM sources
  const sourceCounts: Record<string, number> = {};
  for (const l of leads) {
    const src = l.utmSource || l.utmMedium || 'direct';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Avg rent among leads that provided it
  const rents = leads.map((l) => Number(l.monthlyRent)).filter((r) => r > 0);
  const avgRent = rents.length > 0 ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) : 0;

  const serializedLeads = leads.map((l) => ({
    id: l.id,
    email: l.email,
    landlordName: l.landlordName ?? null,
    state: l.state ?? null,
    propertyType: l.propertyType ?? null,
    propertyAddress: l.propertyAddress ?? null,
    monthlyRent: l.monthlyRent ? Number(l.monthlyRent) : null,
    utmSource: l.utmSource ?? null,
    utmMedium: l.utmMedium ?? null,
    utmCampaign: l.utmCampaign ?? null,
    referrer: l.referrer ?? null,
    ipAddress: l.ipAddress ?? null,
    converted: l.converted,
    convertedAt: l.convertedAt ? l.convertedAt.toISOString() : null,
    notes: l.notes ?? null,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6 p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Free Lease Builder Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Everyone who used the public lease builder — sorted newest first.
          </p>
        </div>
        <Link
          href="/free-lease-builder"
          target="_blank"
          className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600 hover:underline"
        >
          <Globe className="h-3.5 w-3.5" />
          View Public Page
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: <Mail className="h-5 w-5 text-sky-500" />,
            label: 'Total Leads',
            value: totalCount.toLocaleString(),
            sub: 'all time',
            bg: 'bg-sky-50 border-sky-200',
          },
          {
            icon: <Clock className="h-5 w-5 text-violet-500" />,
            label: 'This Week',
            value: thisWeekCount.toLocaleString(),
            sub: 'last 7 days',
            bg: 'bg-violet-50 border-violet-200',
          },
          {
            icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
            label: 'Converted',
            value: convertedCount.toLocaleString(),
            sub: `${conversionRate}% rate`,
            bg: 'bg-emerald-50 border-emerald-200',
          },
          {
            icon: <DollarSign className="h-5 w-5 text-amber-500" />,
            label: 'Avg Rent',
            value: avgRent > 0 ? `$${avgRent.toLocaleString()}` : '—',
            sub: 'among leads who provided it',
            bg: 'bg-amber-50 border-amber-200',
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{s.label}</span></div>
            <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Breakdown row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top states */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-sky-500" />
            <p className="text-sm font-bold text-slate-800">Top States</p>
          </div>
          <div className="space-y-2">
            {topStates.map(([code, count]) => (
              <div key={code} className="flex items-center gap-2">
                <div
                  className="h-2 rounded-full bg-sky-400"
                  style={{ width: `${Math.round((count / (topStates[0]?.[1] ?? 1)) * 120)}px`, minWidth: '8px' }}
                />
                <span className="text-sm text-slate-700 font-medium">{STATE_NAMES[code] || code}</span>
                <span className="ml-auto text-xs font-bold text-slate-500">{count}</span>
              </div>
            ))}
            {topStates.length === 0 && <p className="text-xs text-slate-400">No data yet</p>}
          </div>
        </div>

        {/* Top sources */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-bold text-slate-800">Traffic Sources</p>
          </div>
          <div className="space-y-2">
            {topSources.map(([src, count]) => (
              <div key={src} className="flex items-center gap-2">
                <div
                  className="h-2 rounded-full bg-violet-400"
                  style={{ width: `${Math.round((count / (topSources[0]?.[1] ?? 1)) * 120)}px`, minWidth: '8px' }}
                />
                <span className="text-sm text-slate-700 font-medium capitalize">{src}</span>
                <span className="ml-auto text-xs font-bold text-slate-500">{count}</span>
              </div>
            ))}
            {topSources.length === 0 && <p className="text-xs text-slate-400">No data yet</p>}
          </div>
        </div>

      </div>

      {/* ── Full table (client component for search/filter/mark-converted) ── */}
      <LeadsTableClient leads={serializedLeads} stateNames={STATE_NAMES} />

    </div>
  );
}
