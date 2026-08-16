'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UsageItem {
  current: number;
  limit: number;
  percentage: number;
}

interface UsageData {
  activeJobs?: UsageItem;
  invoices?: UsageItem;
  customers?: UsageItem;
  teamMembers?: UsageItem;
  inventoryItems?: UsageItem;
  equipmentItems?: UsageItem;
  activeLeads?: UsageItem;
}

interface UsageWidgetProps {
  tier: string;
  usage: UsageData;
  onUpgrade?: () => void;
  className?: string;
}

export function UsageWidget({ 
  tier, 
  usage, 
  onUpgrade,
  className = ''
}: UsageWidgetProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

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

  const getColorClass = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 80) return 'text-amber-400';
    return 'text-green-400';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-red-400" />;
    if (percentage >= 80) return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    return <CheckCircle2 className="h-4 w-4 text-green-400" />;
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString();
  };

  const usageItems = [
    { key: 'activeJobs', label: 'Active Jobs', data: usage.activeJobs },
    { key: 'invoices', label: 'Invoices This Month', data: usage.invoices },
    { key: 'customers', label: 'Customers', data: usage.customers },
    { key: 'teamMembers', label: 'Team Members', data: usage.teamMembers },
    { key: 'inventoryItems', label: 'Inventory Items', data: usage.inventoryItems },
    { key: 'equipmentItems', label: 'Equipment Items', data: usage.equipmentItems },
    { key: 'activeLeads', label: 'Active Leads', data: usage.activeLeads },
  ].filter(item => item.data !== undefined);

  const hasWarnings = usageItems.some(item => item.data && item.data.percentage >= 80);
  const hasCritical = usageItems.some(item => item.data && item.data.percentage >= 90);

  return (
    <Card className={`bg-slate-900 border-white/10 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Usage Overview</h3>
                <p className="text-slate-400 text-xs">
                  {tierNames[tier]} Plan
                  {hasCritical && (
                    <span className="ml-2 text-red-400">• Critical</span>
                  )}
                  {!hasCritical && hasWarnings && (
                    <span className="ml-2 text-amber-400">• Warning</span>
                  )}
                </p>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-white/5"
              >
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            {/* Usage Items */}
            <div className="space-y-4 mb-4">
              {usageItems.map((item) => {
                if (!item.data) return null;
                
                const { current, limit, percentage } = item.data;
                const isUnlimited = limit === -1;

                return (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(percentage)}
                        <span className="text-slate-300 text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${getColorClass(percentage)}`}>
                          {current}
                        </span>
                        <span className="text-slate-500 text-sm">/</span>
                        <span className="text-slate-400 text-sm">
                          {formatLimit(limit)}
                        </span>
                      </div>
                    </div>
                    
                    {!isUnlimited && (
                      <div className="relative">
                        <Progress 
                          value={percentage} 
                          className="h-2 bg-slate-800"
                        />
                        <div 
                          className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(percentage)}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    )}

                    {!isUnlimited && percentage >= 80 && (
                      <p className="text-xs text-slate-400 pl-6">
                        {percentage >= 90 ? (
                          <span className="text-red-400">
                            ⚠️ You're at {percentage.toFixed(0)}% of your limit
                          </span>
                        ) : (
                          <span className="text-amber-400">
                            ⚠️ Approaching limit ({percentage.toFixed(0)}%)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upgrade CTA */}
            {(hasWarnings || tier === 'starter') && (
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
                    <Button
                      onClick={handleUpgrade}
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8"
                    >
                      View Plans
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
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
          </CollapsibleContent>
        </div>
      </Collapsible>
    </Card>
  );
}
