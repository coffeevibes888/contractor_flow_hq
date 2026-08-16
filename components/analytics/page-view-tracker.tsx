'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Fires a page-view tracking call on every route change.
 *
 * Previously this component only fired once (empty dep array), so any
 * client-side navigation after the initial page load was silently dropped —
 * which is why ~half of real traffic was missing from the dashboard.
 */
const PageViewTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;

    const search = searchParams?.toString();
    const path = pathname + (search ? `?${search}` : '');
    const referrer = document.referrer || undefined;

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        referrer,
        screenWidth: window.screen?.width,
        screenHeight: window.screen?.height,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      keepalive: true,
    }).catch(() => {
      // Swallow network errors so analytics never breaks the page
    });
  }, [pathname, searchParams]);

  return null;
};

export default PageViewTracker;
