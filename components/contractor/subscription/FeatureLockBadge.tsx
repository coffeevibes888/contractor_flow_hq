'use client';

import { Lock, Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FeatureLockBadgeProps {
  requiredTier: 'pro' | 'enterprise';
  variant?: 'icon' | 'badge' | 'full';
  showTooltip?: boolean;
  tooltipContent?: string;
  className?: string;
}

export function FeatureLockBadge({
  requiredTier,
  variant = 'badge',
  showTooltip = true,
  tooltipContent,
  className = '',
}: FeatureLockBadgeProps) {
  const tierConfig = {
    pro: {
      label: 'Pro',
      color: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      icon: Crown,
      defaultTooltip: 'This feature requires a Pro plan',
    },
    enterprise: {
      label: 'Enterprise',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: Zap,
      defaultTooltip: 'This feature requires an Enterprise plan',
    },
  };

  const config = tierConfig[requiredTier];
  const Icon = config.icon;
  const tooltip = tooltipContent || config.defaultTooltip;

  const renderBadge = () => {
    switch (variant) {
      case 'icon':
        return (
          <div className={`inline-flex items-center ${className}`}>
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          </div>
        );

      case 'badge':
        return (
          <Badge
            variant="outline"
            className={`${config.color} text-xs font-medium ${className}`}
          >
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        );

      case 'full':
        return (
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${config.color} ${className}`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{config.label} Feature</span>
          </div>
        );

      default:
        return null;
    }
  };

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">{renderBadge()}</div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-slate-800 border-white/10 text-white max-w-xs"
          >
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return renderBadge();
}

interface LockedNavItemProps {
  children: React.ReactNode;
  locked: boolean;
  requiredTier?: 'pro' | 'enterprise';
  className?: string;
}

export function LockedNavItem({
  children,
  locked,
  requiredTier = 'pro',
  className = '',
}: LockedNavItemProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-60 grayscale pointer-events-none">
        {children}
      </div>
      <div className="absolute top-1/2 right-3 -translate-y-1/2">
        <FeatureLockBadge
          requiredTier={requiredTier}
          variant="icon"
          showTooltip={true}
          tooltipContent={`Upgrade to ${requiredTier === 'pro' ? 'Pro' : 'Enterprise'} to unlock this feature`}
        />
      </div>
    </div>
  );
}

interface LockedFeatureCardProps {
  children: React.ReactNode;
  locked: boolean;
  requiredTier?: 'pro' | 'enterprise';
  onClick?: () => void;
  className?: string;
}

export function LockedFeatureCard({
  children,
  locked,
  requiredTier = 'pro',
  onClick,
  className = '',
}: LockedFeatureCardProps) {
  if (!locked) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`relative cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="opacity-60 grayscale">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-lg">
        <div className="text-center space-y-2">
          <Lock className="h-8 w-8 text-slate-400 mx-auto" />
          <FeatureLockBadge
            requiredTier={requiredTier}
            variant="badge"
            showTooltip={false}
          />
          <p className="text-xs text-slate-400">Click to learn more</p>
        </div>
      </div>
    </div>
  );
}
