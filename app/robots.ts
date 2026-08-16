import { MetadataRoute } from 'next';

/**
 * robots.txt — keep dashboard-y surfaces out of search while letting
 * public marketing and SEO content through.
 *
 * IMPORTANT: Google treats `Disallow: /contractor` as a *prefix match*,
 * which means it also blocks `/contractor`, `/contractor-marketplace`,
 * `/contractor-start`, and any contractor public subdomain that happens
 * to share the prefix. The previous version of this file blocked the
 * marketing pages by accident — that's why only ~14 URLs were getting
 * indexed.
 *
 * Fix: use a trailing slash (`/contractor-dashboard/`) when we mean a
 * specific subtree, never bare-name prefixes that collide with public
 * pages. We also explicitly `Allow:` the marketing equivalents so the
 * crawler has no doubt.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.propertyflowhq.com').replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          // Marketing pages whose URLs share a prefix with private
          // subtrees below. Listed explicitly so crawlers don't apply
          // the disallow rules to them.
          '/free-lease-builder',
          '/contractor',
          '/contractor-marketplace',
          '/contractor-start',
          '/listings',
          '/blog',
          '/about',
          '/contact',
          '/faq',
          '/privacy',
          '/terms',
        ],
        disallow: [
          // Private app surfaces. Trailing slash matters — without it the
          // rule blocks the public marketing page too.
          '/api/',
          '/admin/',
          '/super-admin/',
          '/super-admin-sign-in',
          '/contractor-dashboard/',
          '/agent-dashboard/',
          '/landlord-dashboard/',
          '/onboarding/',
          // E-sign signing flow — per-user transactional pages, not for search
          '/sign/lease/',
          // Auth + flow surfaces — no SEO value, often have noindex too.
          '/sign-in',
          '/sign-up',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/resend-verification',
          '/accept-invite',
          '/unauthorized',
          // Per-user dashboards. Match only on the trailing slash so the
          // public listing/profile routes (e.g. /agent/some-slug, public
          // homeowner profile pages) keep their crawl access.
          '/user/',
          '/employee/',
          '/customer/',
          '/cart',
          '/checkout',
          '/order/',
          '/place-order',
          '/payment-method',
          '/shipping-address',
          '/verify-payment-method/',
          // Legacy paths that 301 redirect — no point letting Googlebot
          // chase them; the canonical destination is in the sitemap.
          '/contractors',
          '/contractors/',
          // Next internals
          '/_next/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
