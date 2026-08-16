'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Ban, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  limit: number;
  tier: string;
  nextTier: string;
  nextTierLimit: number;
  benefits?: string[];
  onUpgrade?: () => void;
  cannotDismiss?: boolean;
}

export function LimitReachedModal({
  open,
  onOpenChange,
  feature,
  limit,
  tier,
  nextTier,
  nextTierLimit,
  benefits = [],
  onUpgrade,
  cannotDismiss = false,
}: LimitReachedModalProps) {
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

  const handleClose = (open: boolean) => {
    if (!cannotDismiss) {
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="bg-slate-900 border-white/10 max-w-lg"
        onPointerDownOutside={(e) => cannotDismiss && e.preventDefault()}
        onEscapeKeyDown={(e) => cannotDismiss && e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Ban className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-white text-xl">Limit Reached</DialogTitle>
              <DialogDescription className="text-slate-400">
                You've reached your {feature.toLowerCase()} limit
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Current Limit Info */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Ban className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-200 font-medium text-sm mb-1">
                  Maximum {feature} Reached
                </p>
                <p className="text-red-300/80 text-sm">
                  You've used all {limit} {feature.toLowerCase()} available on your {tierNames[tier]} plan. 
                  Upgrade to continue creating more.
                </p>
              </div>
            </div>
          </div>

          {/* Upgrade Offer */}
          <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-lg p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-violet-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">
                  Upgrade to {tierNames[nextTier]}
                </h3>
                <p className="text-violet-200 text-sm">
                  Get {nextTierLimit === -1 ? 'unlimited' : nextTierLimit} {feature.toLowerCase()} and unlock more features
                </p>
              </div>
            </div>

            {/* Benefits */}
            {benefits.length > 0 && (
              <div className="space-y-2 mb-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pricing */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div>
                <div className="text-violet-300 text-xs mb-1">Starting at</div>
                <div className="text-white font-bold text-2xl">
                  ${tierPrices[nextTier]}
                  <span className="text-sm text-slate-400 font-normal">/month</span>
                </div>
              </div>
              <Button
                onClick={handleUpgrade}
                size="lg"
                className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/20"
              >
                Upgrade Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-slate-400 text-xs">
              {cannotDismiss 
                ? 'You must upgrade to continue using this feature'
                : 'You can also manage your subscription in settings'
              }
            </p>
          </div>
        </div>

        {!cannotDismiss && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/20 text-white hover:bg-white/10 w-full"
            >
              Maybe Later
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
