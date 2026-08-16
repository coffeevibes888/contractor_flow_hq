'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Crown,
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Download,
  Settings,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { TierComparisonClient } from './tier-comparison-client';

interface UsageData {
  activeJobsCount: number;
  invoicesThisMonth: number;
  totalCustomers: number;
  teamMembersCount: number;
  inventoryCount: number;
  equipmentCount: number;
  activeLeadsCount: number;
}

interface PaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface SubscriptionSettingsClientProps {
  currentTier: string;
  subscriptionStatus: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  paymentMethod: PaymentMethod | null;
  usage: UsageData;
  subscriptionEndsAt?: Date | null;
}

const TIER_CONFIG = {
  starter: {
    name: 'Starter',
    price: 39,
    color: 'from-blue-600 to-cyan-600',
    limits: {
      activeJobs: 15,
      invoices: 20,
      customers: 50,
      teamMembers: 0,
      inventory: 0,
      equipment: 0,
      leads: 0,
    },
  },
  pro: {
    name: 'Pro',
    price: 99,
    color: 'from-violet-600 to-purple-600',
    limits: {
      activeJobs: 50,
      invoices: -1,
      customers: 500,
      teamMembers: 6,
      inventory: 200,
      equipment: 20,
      leads: 100,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    color: 'from-amber-600 to-orange-600',
    limits: {
      activeJobs: -1,
      invoices: -1,
      customers: -1,
      teamMembers: -1,
      inventory: -1,
      equipment: -1,
      leads: -1,
    },
  },
};

export function SubscriptionSettingsClient({
  currentTier,
  subscriptionStatus,
  currentPeriodStart,
  currentPeriodEnd,
  stripeCustomerId,
  stripeSubscriptionId,
  paymentMethod,
  usage,
  subscriptionEndsAt,
}: SubscriptionSettingsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const tierConfig = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG];

  const getUsagePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0;
    if (limit === 0) return 100;
    return Math.min(100, Math.round((current / limit) * 100));
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number): string => {
    if (limit === -1) return 'Unlimited';
    if (limit === 0) return 'Not Available';
    return limit.toString();
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const response = await fetch('/api/contractor/subscription/cancel', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      toast({
        title: 'Subscription Canceled',
        description: 'Your subscription will remain active until the end of the billing period.',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: 'Something went wrong. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setCanceling(false);
      setShowCancelDialog(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      const response = await fetch('/api/contractor/subscription/payment-method', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create payment method update session');
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payment method. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: { label: 'Active', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
      trialing: { label: 'Trial', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      past_due: { label: 'Past Due', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
      canceled: { label: 'Canceled', className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
      incomplete: { label: 'Incomplete', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    };

    const config = statusConfig[status] || statusConfig.active;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const usageItems = [
    { label: 'Active Jobs', current: usage.activeJobsCount, limit: tierConfig.limits.activeJobs },
    { label: 'Invoices This Month', current: usage.invoicesThisMonth, limit: tierConfig.limits.invoices },
    { label: 'Customers', current: usage.totalCustomers, limit: tierConfig.limits.customers },
    { label: 'Team Members', current: usage.teamMembersCount, limit: tierConfig.limits.teamMembers },
    { label: 'Inventory Items', current: usage.inventoryCount, limit: tierConfig.limits.inventory },
    { label: 'Equipment Items', current: usage.equipmentCount, limit: tierConfig.limits.equipment },
    { label: 'Active Leads', current: usage.activeLeadsCount, limit: tierConfig.limits.leads },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Subscription Settings</h1>
          <p className="text-slate-400">Manage your subscription, usage, and billing information</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-violet-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-violet-600">
              Usage
            </TabsTrigger>
            <TabsTrigger value="plans" className="data-[state=active]:bg-violet-600">
              Plans
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-violet-600">
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Current Plan Card */}
            <Card className="bg-slate-900 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${tierConfig.color} flex items-center justify-center`}>
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl">{tierConfig.name} Plan</CardTitle>
                      <p className="text-slate-400 text-sm mt-1">
                        ${tierConfig.price}/month
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(subscriptionStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-slate-400 text-sm">Billing Cycle</p>
                    <p className="text-white font-medium">Monthly</p>
                  </div>
                  {currentPeriodEnd && (
                    <div className="space-y-1">
                      <p className="text-slate-400 text-sm">Next Billing Date</p>
                      <p className="text-white font-medium">
                        {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {currentPeriodStart && (
                    <div className="space-y-1">
                      <p className="text-slate-400 text-sm">Current Period Started</p>
                      <p className="text-white font-medium">
                        {new Date(currentPeriodStart).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-slate-400 text-sm">Status</p>
                    <p className="text-white font-medium capitalize">{subscriptionStatus.replace('_', ' ')}</p>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setActiveTab('plans')}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                  <Button
                    onClick={handleUpdatePaymentMethod}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/5"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Update Payment Method
                  </Button>
                  {subscriptionStatus === 'active' && !subscriptionEndsAt && (
                    <Button
                      onClick={() => setShowCancelDialog(true)}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  )}
                  {subscriptionEndsAt && (
                    <span className="text-sm text-amber-400 flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" />
                      Cancels on{' '}
                      {new Date(subscriptionEndsAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Usage Overview */}
            <Card className="bg-slate-900 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Usage Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {usageItems.slice(0, 6).map((item) => {
                    const percentage = getUsagePercentage(item.current, item.limit);
                    const isUnlimited = item.limit === -1;
                    const isLocked = item.limit === 0;

                    return (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 text-sm">{item.label}</span>
                          <span className="text-white font-semibold text-sm">
                            {item.current} / {formatLimit(item.limit)}
                          </span>
                        </div>
                        {!isUnlimited && !isLocked && (
                          <div className="relative">
                            <Progress value={percentage} className="h-2 bg-slate-800" />
                            <div
                              className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(percentage)}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button
                  onClick={() => setActiveTab('usage')}
                  variant="ghost"
                  className="w-full mt-4 text-violet-400 hover:text-violet-300 hover:bg-white/5"
                >
                  View Detailed Usage →
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card className="bg-slate-900 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Detailed Usage Statistics</CardTitle>
                <p className="text-slate-400 text-sm">
                  Track your usage across all features. Monthly counters reset on your billing date.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {usageItems.map((item) => {
                  const percentage = getUsagePercentage(item.current, item.limit);
                  const isUnlimited = item.limit === -1;
                  const isLocked = item.limit === 0;
                  const isApproaching = percentage >= 70 && percentage < 90;
                  const isCritical = percentage >= 90;

                  return (
                    <div key={item.label} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isLocked ? (
                            <AlertTriangle className="h-5 w-5 text-slate-500" />
                          ) : isCritical ? (
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                          ) : isApproaching ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          )}
                          <span className="text-white font-medium">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">
                            {item.current} / {formatLimit(item.limit)}
                          </div>
                          {!isUnlimited && !isLocked && (
                            <div className="text-slate-400 text-sm">
                              {item.limit - item.current} remaining
                            </div>
                          )}
                        </div>
                      </div>

                      {!isUnlimited && !isLocked && (
                        <div className="relative">
                          <Progress value={percentage} className="h-3 bg-slate-800" />
                          <div
                            className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(percentage)}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      )}

                      {isCritical && (
                        <p className="text-red-400 text-sm">
                          ⚠️ You've reached {percentage}% of your limit. Consider upgrading to avoid interruptions.
                        </p>
                      )}
                      {isApproaching && (
                        <p className="text-yellow-400 text-sm">
                          ⚠️ You're approaching your limit ({percentage}%).
                        </p>
                      )}
                      {isLocked && (
                        <p className="text-slate-500 text-sm">
                          🔒 This feature is not available on your current plan. Upgrade to unlock.
                        </p>
                      )}

                      <Separator className="bg-white/5" />
                    </div>
                  );
                })}

                {currentPeriodEnd && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Monthly counters will reset on{' '}
                        <span className="font-semibold text-white">
                          {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <TierComparisonClient
              currentTier={currentTier}
              subscriptionStatus={subscriptionStatus}
              currentPeriodEnd={currentPeriodEnd}
              usage={usage}
            />
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card className="bg-slate-900 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-slate-300" />
                    </div>
                    <div>
                      {paymentMethod ? (
                        <>
                          <p className="text-white font-medium capitalize">
                            {paymentMethod.brand} ending in {paymentMethod.last4}
                          </p>
                          <p className="text-slate-400 text-sm">
                            Expires {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-white font-medium">Payment Method on File</p>
                          <p className="text-slate-400 text-sm">
                            {stripeCustomerId ? 'Card on file (details loading)' : 'No payment method added'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleUpdatePaymentMethod}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/5"
                  >
                    Update
                  </Button>
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <h3 className="text-white font-medium mb-3">Billing History</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Download className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-white text-sm">
                            {currentPeriodStart
                              ? new Date(currentPeriodStart).toLocaleDateString('en-US', {
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : 'Current Period'}
                          </p>
                          <p className="text-slate-400 text-xs">${tierConfig.price}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-violet-400 hover:text-violet-300"
                      >
                        Download
                      </Button>
                    </div>
                    <p className="text-slate-500 text-sm text-center py-4">
                      More invoices will appear here as they're generated
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Billing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-slate-400 text-sm">Current Plan</p>
                    <p className="text-white font-medium">{tierConfig.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 text-sm">Monthly Cost</p>
                    <p className="text-white font-medium">${tierConfig.price}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 text-sm">Billing Frequency</p>
                    <p className="text-white font-medium">Monthly</p>
                  </div>
                  {currentPeriodEnd && (
                    <div className="space-y-1">
                      <p className="text-slate-400 text-sm">Next Payment</p>
                      <p className="text-white font-medium">
                        {new Date(currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to cancel your subscription? You'll continue to have access until the end of your
              current billing period ({currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : 'N/A'}).
              <br />
              <br />
              After that, you'll lose access to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All premium features</li>
                <li>Increased limits</li>
                <li>Priority support</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/5">
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {canceling ? 'Canceling...' : 'Yes, Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
