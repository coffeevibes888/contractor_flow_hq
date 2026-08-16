'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  Calendar,
  Target,
  Zap,
} from 'lucide-react';

interface MetricsData {
  timeRange: {
    start: string;
    end: string;
    days: number;
  };
  metrics: {
    limitHitRate: {
      value: number;
      percentage: string;
      description: string;
    };
    upgradeConversionRate: {
      value: number;
      percentage: string;
      description: string;
    };
    averageUsageByTier: Record<string, any>;
    topLimitedFeatures: Array<{ feature: string; count: number }>;
  };
  insights: string[];
}

export function SubscriptionMetricsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricsData | null>(null);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000);

      const response = await fetch(
        `/api/contractor/subscription/metrics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        throw new Error(result.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatFeatureName = (feature: string): string => {
    const nameMap: Record<string, string> = {
      activeJobs: 'Active Jobs',
      invoicesPerMonth: 'Invoices',
      customers: 'Customers',
      teamMembers: 'Team Members',
      inventoryItems: 'Inventory',
      equipmentItems: 'Equipment',
      activeLeads: 'Leads',
    };
    return nameMap[feature] || feature;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscription Metrics</h1>
            <p className="text-gray-600 mt-1">Loading metrics...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Metrics</h3>
              <p className="text-gray-600 mb-4">{error || 'Unknown error occurred'}</p>
              <Button onClick={fetchMetrics}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics, insights } = data;
  const tierData = metrics.averageUsageByTier;
  const totalContractors =
    (tierData.starter?.count || 0) + (tierData.pro?.count || 0) + (tierData.enterprise?.count || 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Metrics</h1>
          <p className="text-gray-600 mt-1">Monitor subscription performance and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchMetrics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Contractors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContractors}</div>
            <p className="text-xs text-muted-foreground mt-1">Active subscriptions</p>
          </CardContent>
        </Card>

        {/* Limit Hit Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limit Hit Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.limitHitRate.percentage}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.limitHitRate.description}</p>
          </CardContent>
        </Card>

        {/* Upgrade Conversion */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upgrade Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.upgradeConversionRate.percentage}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.upgradeConversionRate.description}</p>
          </CardContent>
        </Card>

        {/* Revenue Potential */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {(
                (tierData.starter?.count || 0) * 39 +
                (tierData.pro?.count || 0) * 99 +
                (tierData.enterprise?.count || 0) * 199
              ).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Estimated MRR</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tier Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="font-medium">Starter</span>
                </div>
                <Badge variant="outline">{tierData.starter?.count || 0} contractors</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Jobs:</span>
                  <span className="font-medium">{tierData.starter?.avgJobs || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Invoices:</span>
                  <span className="font-medium">{tierData.starter?.avgInvoices || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Customers:</span>
                  <span className="font-medium">{tierData.starter?.avgCustomers || 0}</span>
                </div>
              </div>
            </div>

            {/* Pro */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-violet-500" />
                  <span className="font-medium">Pro</span>
                </div>
                <Badge variant="outline">{tierData.pro?.count || 0} contractors</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Jobs:</span>
                  <span className="font-medium">{tierData.pro?.avgJobs || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Invoices:</span>
                  <span className="font-medium">{tierData.pro?.avgInvoices || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Customers:</span>
                  <span className="font-medium">{tierData.pro?.avgCustomers || 0}</span>
                </div>
              </div>
            </div>

            {/* Enterprise */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-medium">Enterprise</span>
                </div>
                <Badge variant="outline">{tierData.enterprise?.count || 0} contractors</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Jobs:</span>
                  <span className="font-medium">{tierData.enterprise?.avgJobs || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Invoices:</span>
                  <span className="font-medium">{tierData.enterprise?.avgInvoices || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Customers:</span>
                  <span className="font-medium">{tierData.enterprise?.avgCustomers || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Limited Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Most Limited Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.topLimitedFeatures.map((feature, index) => (
              <div key={feature.feature} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium">{formatFeatureName(feature.feature)}</span>
                </div>
                <Badge variant="outline">{feature.count} hits</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
