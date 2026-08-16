'use client';

import { ReactNode } from 'react';
import { TierFeatures } from '@/lib/config/subscription-tiers';
import { useSubscriptionTier } from '@/hooks/use-subscription-tier';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  landlordId: string;
  feature: keyof TierFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  featureName?: string;
}

export function FeatureGate({
  landlordId,
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  featureName,
}: FeatureGateProps) {
  const { hasFeature, loading, tierName } = useSubscriptionTier(landlordId);

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg bg-slate-200/20 h-32" />
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <Card className="border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-slate-900/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-violet-400" />
          <CardTitle className="text-lg text-slate-100">
            {featureName || 'Pro Feature'}
          </CardTitle>
        </div>
        <CardDescription className="text-slate-300/80">
          This feature is available on Pro and Enterprise plans
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 text-sm text-slate-300/70">
            You&apos;re currently on the <span className="font-medium text-slate-200">{tierName}</span> plan.
            Upgrade to unlock advanced features and grow your portfolio.
          </div>
          <Button asChild className="bg-violet-600 hover:bg-violet-500">
            <Link href="/admin/settings/subscription">
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProOnlyBadgeProps {
  className?: string;
}

export function ProOnlyBadge({ className }: ProOnlyBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-300 ${className || ''}`}>
      <Sparkles className="h-3 w-3" />
      Pro
    </span>
  );
}
