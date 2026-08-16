'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_TIERS, SubscriptionTier, getUpgradeTier } from '@/lib/config/subscription-tiers';
import { Check, Zap, Users, Bell, DollarSign, Briefcase, MessageSquare, Code, Palette, Webhook } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  currentUnitCount: number;
  unitLimit: number;
  reason?: 'unit_limit' | 'feature_locked';
  lockedFeature?: string;
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  automaticRentReminders: <Bell className="h-4 w-4" />,
  automaticLateFees: <DollarSign className="h-4 w-4" />,
  employmentChecksPerMonth: <Briefcase className="h-4 w-4" />,
  teamManagement: <Users className="h-4 w-4" />,
  teamCommunications: <MessageSquare className="h-4 w-4" />,
  customBranding: <Palette className="h-4 w-4" />,
  apiAccess: <Code className="h-4 w-4" />,
  webhooks: <Webhook className="h-4 w-4" />,
};

const FEATURE_LABELS: Record<string, string> = {
  automaticRentReminders: 'Automatic Rent Reminders',
  automaticLateFees: 'Automatic Late Fee Charges',
  employmentChecksPerMonth: 'Employment Verification Checks',
  teamManagement: 'Team Management',
  teamCommunications: 'Team Communications',
  freeBackgroundChecks: 'Free Background Checks',
  freeEvictionChecks: 'Free Eviction Checks',
  freeEmploymentVerification: 'Free Employment Verification',
  customBranding: 'Custom Branding',
  apiAccess: 'API Access',
  webhooks: 'Webhooks',
};

export function UpgradeModal({
  open,
  onClose,
  currentTier,
  currentUnitCount,
  unitLimit,
  reason = 'unit_limit',
  lockedFeature,
}: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Get the next tier up, default to 'pro' if current tier is invalid
  const upgradeTier = getUpgradeTier(currentTier) || 'pro';
  const upgradeConfig = SUBSCRIPTION_TIERS[upgradeTier];
  const currentConfig = SUBSCRIPTION_TIERS[currentTier] || SUBSCRIPTION_TIERS.starter;

  const handleUpgrade = async () => {
    setLoading(true);
    router.push(`/admin/settings/subscription?upgrade=${upgradeTier}`);
  };

  const getTitle = () => {
    if (reason === 'feature_locked') {
      return 'Upgrade to Unlock This Feature';
    }
    return 'Unit Limit Reached';
  };

  const getDescription = () => {
    if (reason === 'feature_locked' && lockedFeature) {
      return `${FEATURE_LABELS[lockedFeature] || lockedFeature} is available on the ${upgradeConfig.name} plan and above.`;
    }
    return `You've reached your ${unitLimit} unit limit on the ${currentConfig.name} plan. Upgrade to ${upgradeConfig.name} to add more units.`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 text-amber-400" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current usage */}
          {reason === 'unit_limit' && (
            <div className="rounded-lg bg-slate-800/50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Current Units</span>
                <span className="text-white font-medium">{currentUnitCount} / {unitLimit}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Upgrade tier card */}
          <div className="rounded-xl border border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{upgradeConfig.name}</h3>
                <p className="text-sm text-slate-400">{upgradeConfig.description}</p>
              </div>
              <div className="text-right">
                {upgradeConfig.price ? (
                  <>
                    <span className="text-2xl font-bold text-white">${upgradeConfig.price}</span>
                    <span className="text-slate-400 text-sm">/mo</span>
                  </>
                ) : (
                  <span className="text-lg font-semibold text-white">Contact Us</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                What you'll get:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-200">
                  <Check className="h-4 w-4 text-emerald-400" />
                  Up to {upgradeConfig.unitLimit === Infinity ? 'Unlimited' : upgradeConfig.unitLimit} units
                </li>
                {Object.entries(upgradeConfig.features).map(([key, value]) => {
                  if (!value || key.startsWith('free')) return null;
                  const label = FEATURE_LABELS[key] || key;
                  const icon = FEATURE_ICONS[key];
                  let displayValue = '';
                  if (typeof value === 'number' && value !== Infinity) {
                    displayValue = ` (${value}/month)`;
                  }
                  return (
                    <li key={key} className="flex items-center gap-2 text-sm text-slate-200">
                      {icon || <Check className="h-4 w-4 text-emerald-400" />}
                      {label}{displayValue}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:text-white">
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {loading ? 'Redirecting...' : `Upgrade to ${upgradeConfig.name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
