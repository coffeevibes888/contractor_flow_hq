'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wrench, Crown, Zap, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Contractor {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  businessName: string | null;
  email: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
  usage: {
    activeJobs: number;
    invoices: number;
    customers: number;
    teamMembers: number;
    inventory: number;
    equipment: number;
    leads: number;
  } | null;
}

export function ContractorSubscriptionManager() {
  const { toast } = useToast();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/contractors/subscription');
      const data = await response.json();
      if (data.success) {
        setContractors(data.contractors);
        // Initialize selected tiers
        const tiers: Record<string, string> = {};
        data.contractors.forEach((c: Contractor) => {
          tiers[c.id] = c.subscriptionTier;
        });
        setSelectedTier(tiers);
      }
    } catch (error) {
      console.error('Error fetching contractors:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load contractors',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (
    contractorId: string,
    tier: string,
    isLifetime: boolean = false
  ) => {
    setActionLoading(contractorId);
    try {
      const response = await fetch('/api/super-admin/contractors/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateTier',
          contractorId,
          tier,
          status: 'active',
          isLifetime,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
        });
        await fetchContractors();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update subscription',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const grantLifetime = async (contractorId: string) => {
    setActionLoading(`lifetime-${contractorId}`);
    try {
      const response = await fetch('/api/super-admin/contractors/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grantLifetime',
          contractorId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
        });
        await fetchContractors();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to grant lifetime access',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const resetUsage = async (contractorId: string) => {
    setActionLoading(`reset-${contractorId}`);
    try {
      const response = await fetch('/api/super-admin/contractors/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetUsage',
          contractorId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
        });
        await fetchContractors();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reset usage',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'pro':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const isLifetimeAccess = (contractor: Contractor) => {
    if (!contractor.currentPeriodEnd) return false;
    const endDate = new Date(contractor.currentPeriodEnd);
    const now = new Date();
    const yearsDiff = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return yearsDiff > 50; // If period end is more than 50 years away, it's lifetime
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-rose-400" />
            Contractor Subscriptions ({contractors.length})
          </div>
          <Button
            onClick={fetchContractors}
            variant="outline"
            size="sm"
            className="border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {contractors.map((contractor) => (
            <div
              key={contractor.id}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white">
                      {contractor.businessName || contractor.userName}
                    </p>
                    {isLifetimeAccess(contractor) && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                        <Crown className="h-3 w-3 mr-1" />
                        Lifetime
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{contractor.userEmail}</p>
                  {contractor.usage && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs border-slate-600">
                        Jobs: {contractor.usage.activeJobs}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-600">
                        Invoices: {contractor.usage.invoices}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-600">
                        Customers: {contractor.usage.customers}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Badge className={getTierColor(contractor.subscriptionTier)}>
                    {contractor.subscriptionTier.toUpperCase()}
                  </Badge>

                  <Select
                    value={selectedTier[contractor.id] || contractor.subscriptionTier}
                    onValueChange={(value) =>
                      setSelectedTier({ ...selectedTier, [contractor.id]: value })
                    }
                  >
                    <SelectTrigger className="w-32 h-8 bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-1">
                    <Button
                      onClick={() =>
                        updateSubscription(contractor.id, selectedTier[contractor.id])
                      }
                      disabled={
                        actionLoading === contractor.id ||
                        selectedTier[contractor.id] === contractor.subscriptionTier
                      }
                      size="sm"
                      className="h-8 bg-blue-600 hover:bg-blue-700"
                    >
                      {actionLoading === contractor.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                    </Button>

                    <Button
                      onClick={() => grantLifetime(contractor.id)}
                      disabled={actionLoading === `lifetime-${contractor.id}`}
                      size="sm"
                      variant="outline"
                      className="h-8 border-amber-500/30 hover:bg-amber-500/10"
                      title="Grant Lifetime Enterprise"
                    >
                      {actionLoading === `lifetime-${contractor.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Crown className="h-3 w-3 text-amber-400" />
                      )}
                    </Button>

                    <Button
                      onClick={() => resetUsage(contractor.id)}
                      disabled={actionLoading === `reset-${contractor.id}`}
                      size="sm"
                      variant="outline"
                      className="h-8 border-slate-600"
                      title="Reset Usage Counters"
                    >
                      {actionLoading === `reset-${contractor.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {contractors.length === 0 && (
            <p className="text-center text-slate-400 py-8">No contractors found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
