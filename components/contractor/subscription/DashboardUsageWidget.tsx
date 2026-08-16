'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lock,
  Infinity,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface UsageItem {
  feature: string;
  displayName: string;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isApproaching: boolean;
  isAtLimit: boolean;
  unlimited: boolean;
}

interface UsageData {
  activeJobs: UsageItem;
  invoicesPerMonth: UsageItem;
  customers: UsageItem;
  teamMembers: UsageItem;
  inventoryItems: UsageItem;
  equipmentItems: UsageItem;
  activeLeads: UsageItem;
}

interface DashboardUsageWidgetProps {
  className?: string;
}

export function DashboardUsageWidget({ className = '' }: DashboardUsageWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('starter');
  const [tierName, setTierName] = useState<string>('Starter');
  const [usage, setUsage] = useState<Partial<UsageData>>({});
  const [warnings, setWarnings] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contractor/subscription/usage');
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      
      if (data.success) {
        setTier(data.tier);
        setTierName(data.tierName);
        setUsage(data.usage);
        setWarnings(data.warnings || []);
      } else {
        throw new Error(data.message || 'Failed to fetch usage data');
      }
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 70) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusIcon = (item: UsageItem) => {
    if (item.limit === 0) {
      return <Lock className="h-4 w-4 text-slate-500" />;
    }
    if (item.unlimited) {
      return <Infinity className="h-4 w-4 text-violet-400" />;
    }
    if (item.isAtLimit) {
      return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
    if (item.isApproaching) {
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-400" />;
  };

  const formatLimit = (limit: number): string => {
    if (limit === -1) return 'Unlimited';
    if (limit === 0) return 'Locked';
    return limit.toString();
  };

  const renderUsageItem = (item: UsageItem) => {
    const isLocked = item.limit === 0;
    const isUnlimited = item.unlimited;

    return (
      <div key={item.feature} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(item)}
            <span className={`text-sm ${isLocked ? 'text-slate-500' : 'text-slate-300'}`}>
              {item.displayName}
            </span>
            {isLocked && (
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-500">
                Locked
              </Badge>
            )}
            {isUnlimited && (
              <Badge variant="outline" className="text-xs border-violet-500 text-violet-400">
                Unlimited
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isLocked ? 'text-slate-500' : getTextColor(item.percentage)}`}>
              {item.current}
            </span>
            {!isUnlimited && (
              <>
                <span className="text-slate-500 text-sm">/</span>
                <span className="text-slate-400 text-sm">
                  {formatLimit(item.limit)}
                </span>
              </>
            )}
          </div>
        </div>
        
        {!isUnlimited && !isLocked && (
          <div className="relative">
            <Progress 
              value={item.percentage} 
              className="h-2 bg-slate-800"
            />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(item.percentage)}`}
              style={{ width: `${Math.min(item.percentage, 100)}%` }}
            />
          </div>
        )}

        {item.isAtLimit && (
          <p className="text-xs text-red-400 pl-6">
            ⚠️ Limit reached - upgrade to continue
          </p>
        )}
        {!item.isAtLimit && item.isApproaching && (
          <p className="text-xs text-yellow-400 pl-6">
            ⚠️ Approaching limit ({item.percentage.toFixed(0)}%)
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={`bg-slate-900 border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Subscription Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-800 rounded animate-pulse" />
                <div className="h-2 bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-slate-900 border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Subscription Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">{error}</p>
            <Button
              onClick={fetchUsageData}
              variant="outline"
              size="sm"
              className="mt-4 border-white/20 text-white hover:bg-white/10"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usageArray = Object.values(usage).filter(Boolean) as UsageItem[];
  const displayedItems = isExpanded ? usageArray : usageArray.slice(0, 3);
  const hasCritical = warnings.some((w: any) => w.level === 'critical');
  const hasWarnings = warnings.length > 0;

  return (
    <Card className={`bg-slate-900 border-white/10 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Subscription Usage</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-violet-600 text-white text-xs">
                  {tierName}
                </Badge>
                {hasCritical && (
                  <span className="text-red-400 text-xs">• Critical</span>
                )}
                {!hasCritical && hasWarnings && (
                  <span className="text-yellow-400 text-xs">• Warning</span>
                )}
              </div>
            </div>
          </div>
          <Link href="/contractor-dashboard/settings/subscription">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-white/5"
            >
              View Details
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Usage Items */}
        <div className="space-y-4">
          {displayedItems.map((item) => renderUsageItem(item))}
        </div>

        {/* Expand/Collapse Button */}
        {usageArray.length > 3 && (
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="sm"
            className="w-full text-slate-400 hover:text-white hover:bg-white/5"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Show All ({usageArray.length - 3} more) <ChevronDown className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className={`rounded-lg p-3 border ${
            hasCritical 
              ? 'bg-red-500/10 border-red-500/20' 
              : 'bg-yellow-500/10 border-yellow-500/20'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`h-4 w-4 mt-0.5 ${hasCritical ? 'text-red-400' : 'text-yellow-400'}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${hasCritical ? 'text-red-300' : 'text-yellow-300'}`}>
                  {hasCritical ? 'Action Required' : 'Approaching Limits'}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {warnings[0]?.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {(hasWarnings || tier === 'starter') && tier !== 'enterprise' && (
          <div className="bg-gradient-to-br from-violet-600/10 to-purple-600/10 border border-violet-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold text-sm mb-1">
                  {hasCritical ? 'Upgrade to Continue' : 'Unlock More Capacity'}
                </h4>
                <p className="text-slate-300 text-xs mb-3">
                  {hasCritical ? (
                    'You\'re running out of capacity. Upgrade now to avoid interruptions.'
                  ) : tier === 'starter' ? (
                    'Upgrade to Pro for more jobs, team management, CRM, and more.'
                  ) : (
                    'Upgrade to Enterprise for unlimited capacity and advanced features.'
                  )}
                </p>
                <Link href="/contractor-dashboard/settings/subscription">
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8"
                  >
                    Upgrade Now
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* All Good Message */}
        {!hasWarnings && tier !== 'starter' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p className="text-green-200 text-xs">
                You're well within your limits. Keep up the great work!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
