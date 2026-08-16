import type { NextConfig } from 'next';

// Content-Security-Policy. Built loose enough to keep Stripe, Google Analytics,
// Facebook Pixel, Google Maps (JS API + Static Maps + Street View), and our
// image hosts working, but tight enough that Lighthouse stops flagging Best
// Practices.
//
// We use 'unsafe-inline' for scripts and styles because Next.js inline-injects
// hydration data and Tailwind/styled JSX produce inline style tags. Without a
// nonce-based pipeline (which would require deeper Next.js plumbing), this is
// the pragmatic middle ground that most Next sites ship.
const cspDirectives = [
  "default-src 'self'",
  // Google Maps loader: maps.googleapis.com serves the bootstrap script and the
  // sub-modules it pulls (`maps-api-v3/api/js/...`). maps.gstatic.com hosts
  // map UI assets like marker icons.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://connect-js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://*.vercel-scripts.com https://va.vercel-scripts.com https://vercel.live https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Map tiles, Street View thumbnails, and marker icons come from many Google
  // hosts (khms*.google.com, maps.gstatic.com, streetviewpixels-pa, etc.).
  // We already permit `https:` for img-src below so all of these load fine,
  // but keeping the explicit hosts here documents intent if `https:` ever
  // gets tightened later.
  "img-src 'self' data: blob: https: https://*.fbcdn.net https://*.facebook.com https://*.googleapis.com https://*.gstatic.com https://*.ggpht.com https://*.googleusercontent.com",
  "media-src 'self' blob: https:",
  // Maps JS API makes XHR calls to maps.googleapis.com for tiles + place
  // metadata, and to maps.google.com for telemetry. Geocoding / Places /
  // Distance Matrix all share *.googleapis.com.
  "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net https://*.facebook.com https://*.vercel-insights.com https://vitals.vercel-insights.com https://vercel.live wss://ws-us3.pusher.com https://utfs.io https://uploadthing.com https://*.uploadthing.com https://maps.googleapis.com https://*.googleapis.com https://maps.google.com https://maps.gstatic.com https://api.datamuse.com https://api.dictionaryapi.dev",
  // Street View embeds + Stripe Checkout / Connect frames.
  // connect.facebook.net + www.facebook.com: Meta Pixel loads a tracking
  // iframe from www.facebook.com and posts conversion events to
  // www.facebook.com/tr. Without these the pixel either silently fails or
  // gets CSP-blocked errors in DevTools.
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://connect-js.stripe.com https://www.youtube.com https://player.vimeo.com https://vercel.live https://www.google.com https://maps.google.com https://www.facebook.com https://connect.facebook.net",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  // www.facebook.com: Meta Pixel's auto-form-tracking (Advanced Matching)
  // posts a hidden form to https://www.facebook.com/tr to record Lead/etc.
  // events. Blocking that POST breaks the original form too because the
  // pixel prevents default and only re-submits after the tracking succeeds.
  "form-action 'self' https://hooks.stripe.com https://www.facebook.com",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    // X-XSS-Protection is deprecated and modern security guidance (and
    // Lighthouse) wants this disabled — the browser's auditor caused more
    // bugs than it prevented. CSP below replaces it.
    key: 'X-XSS-Protection',
    value: '0',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Speed up dev server
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react', 'date-fns'],
  },
  // Drop legacy ES5 polyfills (Array.prototype.at, flat, flatMap, fromEntries,
  // hasOwn, trimStart/trimEnd) by targeting modern browsers only. Saves ~26 KiB
  // on every initial page load. Lighthouse "legacy-javascript" audit covers it.
  compiler: {
    // Remove dev-only console statements in production builds.
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  turbopack: {},
  async redirects() {
    return [
      // Old contractor marketplace URL → new canonical URL.
      // We deliberately only redirect the marketplace root. The
      // `/contractors/jobs/:id`, `/contractors/:id`, and
      // `/contractors/:id/apply` paths are real pages on this app and
      // should NOT be rewritten — earlier we had a wildcard
      // `/contractors/:path*` redirect, but it caught those legitimate
      // routes and sent users to a `/contractor-marketplace/...` page
      // that doesn't exist (manifesting as "page not found" when a PM
      // clicked an Open Bid card).
      {
        source: '/contractors',
        destination: '/contractor-marketplace',
        permanent: true,
      },
      // Old contractor landing (?for=contractor on homepage) → dedicated /contractor page
      {
        source: '/',
        has: [{ type: 'query', key: 'for', value: 'contractor' }],
        destination: '/contractor',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none',
          },
        ],
      },
      // Cache static asset files in /public (Next already long-caches
      // /_next/static/* automatically, so we only need to cover /public).
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|webp|avif|ico|woff|woff2|ttf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  images: {
    // Re-enabled. Without optimization the homepage was shipping a 1920x924
    // PNG to a 576x277 viewport (215 KiB savings flagged by Lighthouse).
    // Modern formats and on-demand resizing are worth the bandwidth cost.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '*.ufs.sh',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'uploadthing.com',
        port: '',
      },
      // Amazon product images for the contractor equipment shop
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        port: '',
      },
      // Google Maps Street View and Static Maps API
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
      },
    ],
  },
  // Reduce compilation overhead
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
};

export default nextConfig;
