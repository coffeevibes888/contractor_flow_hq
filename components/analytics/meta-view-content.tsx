'use client';

import { useEffect } from 'react';

/**
 * Fires a Meta Pixel `ViewContent` event and a Reddit Pixel `ViewContent` event
 * once when the component mounts. Drop into any landing page so both ad platforms
 * learn who converts on that funnel.
 *
 * PageView / PageVisit already fire globally from app/layout.tsx — this adds
 * the richer content-specific event tied to the ad landing page.
 */
export default function MetaViewContent({
  contentName,
  contentCategory,
  value,
  currency = 'USD',
}: {
  contentName: string;
  contentCategory: string;
  value?: number;
  currency?: string;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Meta
    if (typeof window.fbq === 'function') {
      try {
        window.fbq('track', 'ViewContent', {
          content_name: contentName,
          content_category: contentCategory,
          ...(typeof value === 'number' ? { value, currency } : {}),
        });
      } catch {}
    }

    // Reddit
    if (typeof window.rdt === 'function') {
      try {
        window.rdt('track', 'ViewContent', {
          ...(typeof value === 'number' ? { value, currency } : {}),
          products: [{ id: contentName, name: contentName, category: contentCategory }],
        });
      } catch {}
    }
  }, [contentName, contentCategory, value, currency]);

  return null;
}
