'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getAnalytics, initAnalytics } from '@/lib/analytics-tracker';

/**
 * Bootstraps the client analytics tracker on first mount, then notifies it on
 * every subsequent route change.
 *
 * The previous implementation only told the tracker to record a page view
 * during initial construction, so Next.js soft navigations never produced a
 * page-view event — which is the bulk of the "missing clicks and visits" bug.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Initialize once; subsequent renders just get the singleton back.
    const tracker = initAnalytics({
      enabled: true,
      trackClicks: true,
      trackScrollDepth: true,
      trackFormInteractions: true,
    });

    if (!tracker) return;

    const search = searchParams?.toString();
    const fullPath = pathname + (search ? `?${search}` : '');

    // The tracker's constructor already fires the first page view.
    // Skip re-firing it here for the very first mount to avoid duplicates.
    if (firstPathRef.current === null) {
      firstPathRef.current = fullPath;
      return;
    }

    if (firstPathRef.current === fullPath) return;
    firstPathRef.current = fullPath;

    // Push a fresh page view and funnel step on every route change.
    const t = getAnalytics();
    t?.trackRouteChange(fullPath);
    t?.trackFunnelStep('page_view', 1, {
      path: pathname,
      search: search || '',
    });
  }, [pathname, searchParams]);

  return null;
}
