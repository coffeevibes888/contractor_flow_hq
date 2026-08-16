import { MetadataRoute } from 'next';
import { prisma } from '@/db/prisma';
import { SERVER_URL } from '@/lib/constants';

/**
 * Dynamic sitemap — Phase 1 SEO foundation.
 *
 * Covers:
 *  - Static marketing pages
 *  - Every public contractor subdomain  → /{slug}
 *  - Every landlord subdomain           → /{subdomain}
 *  - Every available landlord property  → /{subdomain}/properties/{slug}
 *  - Every agent subdomain              → /{subdomain}
 *  - Every active agent listing         → /{subdomain}/listings/{slug}
 *
 * All URLs use the canonical apex host so /c/{slug} duplicates don't split
 * ranking signals. If the total exceeds 50k URLs, split via generateSitemaps.
 */

const baseUrl = (SERVER_URL || 'https://www.propertyflowhq.com').replace(/\/+$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static pages ──────────────────────────────────────────────────────────
  // Only public-facing marketing/index pages belong here. Auth pages
  // (/sign-in, /sign-up) are intentionally excluded — they're noindexed
  // and there's no SEO value in surfacing them. /contractors is a 301
  // redirect to /contractor-marketplace, so we point Google at the canonical
  // destination instead.
  const staticEntries: MetadataRoute.Sitemap = (
    [
      { path: '',                        freq: 'weekly',  pri: 1.0  },
      { path: '/free-lease-builder',     freq: 'daily',   pri: 1.0  },
      { path: '/contractor',             freq: 'weekly',  pri: 0.9  },
      { path: '/contractor-marketplace', freq: 'daily',   pri: 0.9  },
      { path: '/listings',               freq: 'daily',   pri: 0.9  },
      { path: '/about',                  freq: 'monthly', pri: 0.6  },
      { path: '/contact',                freq: 'monthly', pri: 0.6  },
      { path: '/faq',                    freq: 'monthly', pri: 0.5  },
      { path: '/blog',                   freq: 'daily',   pri: 0.7  },
      { path: '/privacy',                freq: 'yearly',  pri: 0.3  },
      { path: '/terms',                  freq: 'yearly',  pri: 0.3  },
    ] as const
  ).map((p) => ({
    url: `${baseUrl}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.freq as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: p.pri,
  }));

  // ── Dynamic queries — all in parallel, each failure-tolerant ─────────────
  const [contractors, landlords, properties, agents, agentListings, cityData, blogPosts] = await Promise.all([

    // Contractors — use subdomain if set, otherwise slug
    prisma.contractorProfile
      .findMany({
        where: { isPublic: true },
        select: { slug: true, subdomain: true, updatedAt: true },
      })
      .catch(() => [] as { slug: string; subdomain: string | null; updatedAt: Date }[]),

    // Landlords — subdomain is non-nullable
    prisma.landlord
      .findMany({
        select: { subdomain: true, updatedAt: true },
      })
      .catch(() => [] as { subdomain: string; updatedAt: Date }[]),

    // Properties with available units — join landlord subdomain via separate query
    prisma.property
      .findMany({
        where: {
          status: 'active',
          isPublished: true,
          units: { some: { isAvailable: true } },
        },
        select: {
          slug: true,
          updatedAt: true,
          landlordId: true,
        },
      })
      .catch(() => [] as { slug: string; updatedAt: Date; landlordId: string }[]),

    // Agents — subdomain is non-nullable
    prisma.agent
      .findMany({
        select: { subdomain: true, updatedAt: true },
      })
      .catch(() => [] as { subdomain: string; updatedAt: Date }[]),

    // Active agent listings — join agent subdomain via separate query
    prisma.agentListing
      .findMany({
        where: { status: 'active' },
        select: {
          slug: true,
          updatedAt: true,
          agentId: true,
        },
      })
      .catch(() => [] as { slug: string; updatedAt: Date; agentId: string }[]),

    // Distinct cities from available units for city-specific listing pages
    prisma.unit
      .findMany({
        where: {
          isAvailable: true,
          property: { status: { not: 'deleted' } },
        },
        select: { property: { select: { address: true, updatedAt: true } } },
      })
      .catch(() => [] as { property: { address: any; updatedAt: Date } }[]),

    // Published blog posts
    prisma.blogPost
      .findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => [] as { slug: string; updatedAt: Date }[]),
  ]);

  // Build lookup maps for the join data

  // We need landlordId → subdomain for properties
  const landlordById = await (async () => {
    if (properties.length === 0) return new Map<string, string>();
    const ids = [...new Set(properties.map((p) => p.landlordId).filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map<string, string>();
    const rows = await prisma.landlord
      .findMany({ where: { id: { in: ids } }, select: { id: true, subdomain: true } })
      .catch(() => [] as { id: string; subdomain: string }[]);
    return new Map(rows.map((r) => [r.id, r.subdomain]));
  })();

  // We need agentId → subdomain for listings
  const agentById = await (async () => {
    if (agentListings.length === 0) return new Map<string, string>();
    const ids = [...new Set(agentListings.map((l) => l.agentId))];
    const rows = await prisma.agent
      .findMany({ where: { id: { in: ids } }, select: { id: true, subdomain: true } })
      .catch(() => [] as { id: string; subdomain: string }[]);
    return new Map(rows.map((r) => [r.id, r.subdomain]));
  })();

  // ── Build entries ─────────────────────────────────────────────────────────

  const contractorEntries: MetadataRoute.Sitemap = contractors.map((c) => ({
    url: `${baseUrl}/${c.subdomain || c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const landlordEntries: MetadataRoute.Sitemap = landlords.map((l) => ({
    url: `${baseUrl}/${l.subdomain}`,
    lastModified: l.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const propertyEntries: MetadataRoute.Sitemap = properties
    .map((p) => {
      if (!p.landlordId) return null;
      const subdomain = landlordById.get(p.landlordId);
      if (!subdomain) return null;
      return {
        url: `${baseUrl}/${subdomain}/properties/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.9,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const agentEntries: MetadataRoute.Sitemap = agents.map((a) => ({
    url: `${baseUrl}/${a.subdomain}`,
    lastModified: a.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const agentListingEntries: MetadataRoute.Sitemap = agentListings
    .map((al) => {
      const subdomain = agentById.get(al.agentId);
      if (!subdomain) return null;
      return {
        url: `${baseUrl}/${subdomain}/listings/${al.slug}`,
        lastModified: al.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.9,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  // Build city-specific listing page entries: /listings/las-vegas, /listings/chicago, etc.
  const citySlugMap = new Map<string, Date>();
  for (const row of cityData) {
    const city: string | undefined = (row.property.address as any)?.city;
    if (!city || typeof city !== 'string') continue;
    const slug = city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) continue;
    const existing = citySlugMap.get(slug);
    if (!existing || row.property.updatedAt > existing) {
      citySlugMap.set(slug, row.property.updatedAt);
    }
  }
  const cityEntries: MetadataRoute.Sitemap = Array.from(citySlugMap.entries()).map(([slug, updatedAt]) => ({
    url: `${baseUrl}/listings/${slug}`,
    lastModified: updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...blogEntries,
    ...contractorEntries,
    ...landlordEntries,
    ...propertyEntries,
    ...cityEntries,
    ...agentEntries,
    ...agentListingEntries,
  ];
}
