'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Check, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FeatureLockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredTier: string;
  currentTier: string;
  benefits?: string[];
  pricing?: {
    current: number;
    required: number;
    difference: number;
  };
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function FeatureLockedModal({
  open,
  onOpenChange,
  feature,
  requiredTier,
  currentTier,
  benefits = [],
  pricing,
  onUpgrade,
  onDismiss,
}: FeatureLockedModalProps) {
  const router = useRouter();

  const tierNames: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  const tierPrices: Record<string, number> = {
    starter: 39,
    pro: 99,
    enterprise: 199,
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/contractor-dashboard/settings/subscription');
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    onOpenChange(false);
  };

  const currentPrice = pricing?.current || tierPrices[currentTier];
  const requiredPrice = pricing?.required || tierPrices[requiredTier];
  const priceDifference = pricing?.difference || (requiredPrice - currentPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Lock className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-white text-xl">Feature Locked</DialogTitle>
              <DialogDescription className="text-slate-400">
                {feature} requires {tierNames[requiredTier]} plan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Feature Info */}
          <div className="bg-slate-800/50 border border-white/5 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium text-sm mb-1">
                  {feature} is a {tierNames[requiredTier]} Feature
                </p>
                <p className="text-slate-400 text-sm">
                  You're currently on the {tierNames[currentTier]} plan. 
                  Upgrade to {tierNames[requiredTier]} to unlock this feature and more.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          {benefits.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-400" />
                <h3 className="text-white font-semibold text-sm">
                  What you'll unlock with {tierNames[requiredTier]}:
                </h3>
              </div>
              <div className="space-y-2">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2 pl-6">
                    <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Comparison */}
          <div className="bg-gradient-to-br from-violet-600/10 to-purple-600/10 border border-violet-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-slate-400 text-xs mb-1">Current Plan</div>
                <div className="text-white font-semibold">
                  {tierNames[currentTier]}
                </div>
                <div className="text-slate-400 text-sm">
                  ${currentPrice.toFixed(2)}/month
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </div>

              <div>
                <div className="text-violet-300 text-xs mb-1">Upgrade To</div>
                <div className="text-white font-semibold">
                  {tierNames[requiredTier]}
                </div>
                <div className="text-violet-300 text-sm">
                  ${requiredPrice.toFixed(2)}/month
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-slate-300 text-sm">
                    Additional investment
                  </span>
                </div>
                <span className="text-white font-semibold">
                  +${priceDifference.toFixed(2)}/month
                </span>
              </div>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-200 text-xs text-center">
              💡 Unlock powerful features to grow your business and save time
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="border-white/20 text-white hover:bg-white/10 flex-1"
          >
            Not Now
          </Button>
          <Button
            onClick={handleUpgrade}
            className="bg-violet-600 hover:bg-violet-700 text-white flex-1 shadow-lg shadow-violet-600/20"
          >
            Upgrade to {tierNames[requiredTier]}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
