'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  currentTier: string;
  requiredTier: string;
  currentLimit: number;
  requiredLimit: number;
  benefits?: string[];
}

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  currentTier,
  requiredTier,
  currentLimit,
  requiredLimit,
  benefits = [],
}: UpgradeModalProps) {
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
    router.push('/contractor-dashboard/settings/subscription');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Upgrade to {tierNames[requiredTier]}</DialogTitle>
          <DialogDescription className="text-slate-400">
            You've reached your {feature} limit on the {tierNames[currentTier]} plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current vs Required */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
              <div className="text-slate-400 text-sm mb-1">Current Plan</div>
              <div className="text-white font-semibold text-lg">{tierNames[currentTier]}</div>
              <div className="text-slate-400 text-sm mt-2">
                {currentLimit === -1 ? 'Unlimited' : currentLimit} {feature}
              </div>
            </div>

            <div className="bg-violet-600/20 rounded-lg p-4 border border-violet-500/30">
              <div className="text-violet-300 text-sm mb-1">Upgrade To</div>
              <div className="text-white font-semibold text-lg">{tierNames[requiredTier]}</div>
              <div className="text-violet-300 text-sm mt-2">
                {requiredLimit === -1 ? 'Unlimited' : requiredLimit} {feature}
              </div>
            </div>
          </div>

          {/* Benefits */}
          {benefits.length > 0 && (
            <div className="space-y-2">
              <div className="text-white font-medium text-sm">What you'll get:</div>
              <div className="space-y-2">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-sm">New Monthly Price</div>
                <div className="text-white font-semibold text-2xl">
                  ${tierPrices[requiredTier]}<span className="text-sm text-slate-400">/mo</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-sm">Current Price</div>
                <div className="text-slate-400 line-through">
                  ${tierPrices[currentTier]}/mo
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Upgrade Now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
