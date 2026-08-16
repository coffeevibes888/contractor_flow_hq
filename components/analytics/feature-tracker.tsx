'use client';

import { useEffect } from 'react';
import { getAnalytics } from '@/lib/analytics-tracker';

interface FeatureTrackerProps {
  /**
   * The funnel step name written to ConversionFunnel.step.
   * Use a consistent slug like "wallet_viewed", "settings_viewed", "accounting_viewed".
   */
  step: string;
  /** Extra key/value pairs stored in ConversionFunnel.metadata. */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Drop this invisible component inside any page to fire a named funnel event
 * on mount. It writes to the ConversionFunnel table so the super-admin
 * analytics dashboard can show exactly which features users actually open.
 *
 * Usage:
 *   import FeatureTracker from '@/components/analytics/feature-tracker';
 *   <FeatureTracker step="wallet_viewed" metadata={{ mode: 'landlord' }} />
 */
export default function FeatureTracker({ step, metadata }: FeatureTrackerProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tracker = getAnalytics();
    if (!tracker) return;

    tracker.trackFunnelStep(step, 1, {
      path: window.location.pathname,
      ...metadata,
    });
  // Run once per mount — step and metadata are intentionally excluded from
  // the dep array; they're stable construction-time values, not reactive state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
