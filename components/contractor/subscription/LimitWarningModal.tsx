'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

interface LimitWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  current: number;
  limit: number;
  percentage: number;
  tier: string;
  nextTier: string;
  nextTierLimit: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function LimitWarningModal({
  open,
  onOpenChange,
  feature,
  current,
  limit,
  percentage,
  tier,
  nextTier,
  nextTierLimit,
  onUpgrade,
  onDismiss,
}: LimitWarningModalProps) {
  const router = useRouter();

  const tierNames: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
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

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-white text-lg">Approaching Limit</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                You're running out of {feature.toLowerCase()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Usage Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Current Usage</span>
              <span className="text-white font-medium">
                {current} of {limit === -1 ? 'Unlimited' : limit}
              </span>
            </div>
            <div className="relative">
              <Progress value={percentage} className="h-2 bg-slate-800" />
              <div 
                className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-amber-500">{percentage}% used</span>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <p className="text-amber-200 text-sm">
              You've used {current} of your {limit} {feature.toLowerCase()} on the {tierNames[tier]} plan. 
              Upgrade to {tierNames[nextTier]} to get {nextTierLimit === -1 ? 'unlimited' : nextTierLimit} {feature.toLowerCase()}.
            </p>
          </div>

          {/* Upgrade Preview */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs mb-1">Upgrade to</div>
                <div className="text-white font-semibold">{tierNames[nextTier]}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-xs mb-1">New Limit</div>
                <div className="text-violet-400 font-semibold">
                  {nextTierLimit === -1 ? 'Unlimited' : nextTierLimit}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <X className="h-4 w-4 mr-2" />
            Dismiss
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
