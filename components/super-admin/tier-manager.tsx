'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Loader2, Crown, Building2, DollarSign, X, Gift, Calendar, Search, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Landlord {
  id: string;
  name: string;
  email: string;
  currentTier: string;
  status: string;
  propertyCount: number;
  periodEnd?: string;
  isGranted?: boolean;
  isCurrentUser?: boolean;
}

interface Tier {
  id: string;
  name: string;
  price: number | null;
  unitLimit: number;
  noCashoutFees: boolean;
}

interface ContractorProfile {
  id: string;
  name: string;
  email: string;
  currentTier: string;
  status: string;
  periodEnd?: string;
}

interface ContractorTierOption {
  id: string;
  name: string;
  price: number;
}

const DURATION_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days (3 months)' },
  { value: '180', label: '180 days (6 months)' },
  { value: '365', label: '1 year' },
  { value: '36500', label: 'Lifetime' },
];

export default function TierManager() {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [currentUserLandlordId, setCurrentUserLandlordId] = useState<string | null>(null);
  const [currentUserTier, setCurrentUserTier] = useState<string>('free');
  
  // Search and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('pro');
  const [selectedDuration, setSelectedDuration] = useState<string>('30');
  const [showDropdown, setShowDropdown] = useState(false);

  // Contractor state
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [contractorTiers, setContractorTiers] = useState<ContractorTierOption[]>([]);
  const [contractorSearchQuery, setContractorSearchQuery] = useState('');
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [selectedContractorTier, setSelectedContractorTier] = useState<string>('pro');
  const [selectedContractorDuration, setSelectedContractorDuration] = useState<string>('30');
  const [showContractorDropdown, setShowContractorDropdown] = useState(false);
  const [updatingContractor, setUpdatingContractor] = useState<string | null>(null);
  const [revokingContractor, setRevokingContractor] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    fetchContractorData();
  }, []);

  const fetchContractorData = async () => {
    try {
      const res = await fetch('/api/super-admin/set-contractor-tier');
      if (res.ok) {
        const data = await res.json();
        setContractors(data.contractors);
        setContractorTiers(data.availableTiers);
      }
    } catch (error) {
      console.error('Failed to fetch contractors:', error);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/super-admin/set-tier');
      if (res.ok) {
        const data = await res.json();
        setLandlords(data.landlords);
        setTiers(data.availableTiers);
        setCurrentUserLandlordId(data.currentUserLandlordId);
        setCurrentUserTier(data.currentUserTier);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({ title: 'Error', description: 'Failed to load landlords', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedLandlord = useMemo(() => 
    landlords.find(l => l.id === selectedLandlordId),
    [landlords, selectedLandlordId]
  );

  const filteredLandlords = useMemo(() => {
    if (!searchQuery.trim()) return landlords.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return landlords.filter(l => 
      l.name.toLowerCase().includes(query) || 
      l.email.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [landlords, searchQuery]);

  const grantedLandlords = useMemo(() => 
    landlords.filter(l => l.isGranted || (l.currentTier !== 'free' && !l.isCurrentUser)),
    [landlords]
  );

  const grantTier = async () => {
    if (!selectedLandlordId || !selectedTier) {
      toast({ title: 'Error', description: 'Please select a landlord and tier' });
      return;
    }

    const duration = parseInt(selectedDuration || '30');

    setUpdating(selectedLandlordId);
    try {
      const res = await fetch('/api/super-admin/set-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          landlordId: selectedLandlordId, 
          tier: selectedTier,
          durationDays: duration,
          isGrant: true,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({ 
          title: 'Success', 
          description: `Granted ${data.tier} tier for ${duration} days` 
        });
        setLandlords(prev =>
          prev.map(l =>
            l.id === selectedLandlordId 
              ? { ...l, currentTier: selectedTier, isGranted: true, periodEnd: data.periodEnd } 
              : l
          )
        );
        if (selectedLandlordId === currentUserLandlordId) {
          setCurrentUserTier(selectedTier);
        }
        // Reset selection
        setSelectedLandlordId('');
        setSearchQuery('');
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to grant tier', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to grant tier:', error);
      toast({ title: 'Error', description: 'Failed to grant tier', variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  const selectedContractor = useMemo(
    () => contractors.find((c) => c.id === selectedContractorId),
    [contractors, selectedContractorId]
  );

  const filteredContractors = useMemo(() => {
    if (!contractorSearchQuery.trim()) return contractors.slice(0, 10);
    const query = contractorSearchQuery.toLowerCase();
    return contractors
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [contractors, contractorSearchQuery]);

  const grantedContractors = useMemo(
    () => contractors.filter((c) => c.currentTier !== 'starter'),
    [contractors]
  );

  const grantContractorTier = async () => {
    if (!selectedContractorId || !selectedContractorTier) {
      toast({ title: 'Error', description: 'Please select a contractor and tier' });
      return;
    }
    const duration = parseInt(selectedContractorDuration || '30');
    setUpdatingContractor(selectedContractorId);
    try {
      const res = await fetch('/api/super-admin/set-contractor-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorProfileId: selectedContractorId,
          tier: selectedContractorTier,
          durationDays: duration,
          isGrant: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Success', description: `Granted ${data.tier} tier for ${duration} days` });
        setContractors((prev) =>
          prev.map((c) =>
            c.id === selectedContractorId
              ? { ...c, currentTier: selectedContractorTier, periodEnd: data.periodEnd }
              : c
          )
        );
        setSelectedContractorId('');
        setContractorSearchQuery('');
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to grant tier', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to grant contractor tier:', error);
      toast({ title: 'Error', description: 'Failed to grant tier', variant: 'destructive' });
    } finally {
      setUpdatingContractor(null);
    }
  };

  const revokeContractorTier = async (contractorProfileId: string) => {
    if (!confirm('Are you sure you want to revoke this contractor subscription? They will be reset to Starter.')) return;
    setRevokingContractor(contractorProfileId);
    try {
      const res = await fetch('/api/super-admin/set-contractor-tier', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorProfileId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Success', description: 'Contractor subscription revoked' });
        setContractors((prev) =>
          prev.map((c) =>
            c.id === contractorProfileId ? { ...c, currentTier: 'starter', periodEnd: undefined } : c
          )
        );
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to revoke', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to revoke contractor tier:', error);
      toast({ title: 'Error', description: 'Failed to revoke subscription', variant: 'destructive' });
    } finally {
      setRevokingContractor(null);
    }
  };

  const revokeTier = async (landlordId: string) => {
    if (!confirm('Are you sure you want to revoke this subscription? The landlord will be reset to the Starter tier.')) {
      return;
    }

    setRevoking(landlordId);
    try {
      const res = await fetch('/api/super-admin/set-tier', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({ title: 'Success', description: 'Subscription revoked' });
        setLandlords(prev =>
          prev.map(l =>
            l.id === landlordId 
              ? { ...l, currentTier: 'starter', isGranted: false, periodEnd: undefined } 
              : l
          )
        );
        if (landlordId === currentUserLandlordId) {
          setCurrentUserTier('free');
        }
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to revoke', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to revoke:', error);
      toast({ title: 'Error', description: 'Failed to revoke subscription', variant: 'destructive' });
    } finally {
      setRevoking(null);
    }
  };

  const toggleMyProAccess = async () => {
    if (!currentUserLandlordId) {
      toast({ title: 'Error', description: 'No landlord account found for your user', variant: 'destructive' });
      return;
    }

    const isCurrentlyPro = currentUserTier === 'pro' || currentUserTier === 'enterprise';
    
    if (isCurrentlyPro) {
      await revokeTier(currentUserLandlordId);
    } else {
      setUpdating(currentUserLandlordId);
      try {
        const res = await fetch('/api/super-admin/set-tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            landlordId: currentUserLandlordId, 
            tier: 'enterprise',
            durationDays: 36500,
            isGrant: true,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          toast({ title: 'Pro Access Enabled', description: 'You now have full Enterprise access!' });
          setCurrentUserTier('enterprise');
          setLandlords(prev =>
            prev.map(l =>
              l.id === currentUserLandlordId 
                ? { ...l, currentTier: 'enterprise', isGranted: true, periodEnd: data.periodEnd } 
                : l
            )
          );
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to enable pro access', variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to enable pro access', variant: 'destructive' });
      } finally {
        setUpdating(null);
      }
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'pro':
        return <Building2 className="h-4 w-4 text-violet-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pro':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isMyProEnabled = currentUserTier === 'pro' || currentUserTier === 'enterprise';

  return (
    <div className="space-y-6">
      {/* Super Admin Quick Toggle */}
      <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Owner Pro Access
          </CardTitle>
          <CardDescription>
            Toggle full Enterprise access for your own account. Unlocks all features without payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">
                {isMyProEnabled ? (
                  <span className="text-emerald-600 flex items-center gap-2">
                    <Check className="h-4 w-4" /> All Pro Features Unlocked
                  </span>
                ) : (
                  <span className="text-slate-600">Currently on Starter Tier</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {isMyProEnabled 
                  ? 'You have access to all Enterprise features' 
                  : 'Enable to unlock all features for testing'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {isMyProEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={isMyProEnabled}
                onCheckedChange={toggleMyProAccess}
                disabled={updating === currentUserLandlordId || !currentUserLandlordId}
              />
            </div>
          </div>
          {!currentUserLandlordId && (
            <p className="mt-3 text-sm text-amber-600">
              ⚠️ You don&apos;t have a landlord account yet. Create one first to use this feature.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Grant Pro Access - Searchable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-violet-500" />
            Grant Pro Access
          </CardTitle>
          <CardDescription>
            Search for a landlord and grant them Pro or Enterprise access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Landlord Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Landlord</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="pl-10"
              />
              {showDropdown && (searchQuery || !selectedLandlordId) && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredLandlords.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No landlords found</div>
                  ) : (
                    filteredLandlords.map((landlord) => (
                      <button
                        key={landlord.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center justify-between"
                        onClick={() => {
                          setSelectedLandlordId(landlord.id);
                          setSearchQuery(landlord.name);
                          setShowDropdown(false);
                        }}
                      >
                        <div>
                          <p className="font-medium text-sm">{landlord.name}</p>
                          <p className="text-xs text-muted-foreground">{landlord.email}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getTierBadgeColor(landlord.currentTier)}`}>
                          {landlord.currentTier}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedLandlord && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Selected: <strong>{selectedLandlord.name}</strong></span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-auto"
                  onClick={() => {
                    setSelectedLandlordId('');
                    setSearchQuery('');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Tier and Duration Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiers.filter(t => t.id !== 'free').map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      <div className="flex items-center gap-2">
                        {getTierIcon(tier.id)}
                        {tier.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={grantTier}
            disabled={!selectedLandlordId || updating === selectedLandlordId}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {updating === selectedLandlordId ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Gift className="h-4 w-4 mr-2" />
            )}
            Grant {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Access
          </Button>
        </CardContent>
      </Card>

      {/* Active Granted Subscriptions */}
      {grantedLandlords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Granted Subscriptions</CardTitle>
            <CardDescription>
              Landlords with manually granted Pro/Enterprise access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {grantedLandlords.map((landlord) => (
                <div
                  key={landlord.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{landlord.name}</p>
                      <p className="text-xs text-muted-foreground">{landlord.email}</p>
                    </div>
                    <Badge variant="outline" className={getTierBadgeColor(landlord.currentTier)}>
                      {getTierIcon(landlord.currentTier)}
                      <span className="ml-1">{landlord.currentTier}</span>
                    </Badge>
                    {landlord.periodEnd && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(landlord.periodEnd).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeTier(landlord.id)}
                    disabled={revoking === landlord.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {revoking === landlord.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grant Contractor Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            Grant Contractor Access
          </CardTitle>
          <CardDescription>
            Search for a contractor and grant them Pro or Enterprise access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Contractor</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by business name or email..."
                value={contractorSearchQuery}
                onChange={(e) => {
                  setContractorSearchQuery(e.target.value);
                  setShowContractorDropdown(true);
                }}
                onFocus={() => setShowContractorDropdown(true)}
                className="pl-10"
              />
              {showContractorDropdown && (contractorSearchQuery || !selectedContractorId) && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredContractors.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No contractors found</div>
                  ) : (
                    filteredContractors.map((contractor) => (
                      <button
                        key={contractor.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center justify-between"
                        onClick={() => {
                          setSelectedContractorId(contractor.id);
                          setContractorSearchQuery(contractor.name);
                          setShowContractorDropdown(false);
                        }}
                      >
                        <div>
                          <p className="font-medium text-sm">{contractor.name}</p>
                          <p className="text-xs text-muted-foreground">{contractor.email}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getTierBadgeColor(contractor.currentTier)}`}>
                          {contractor.currentTier}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedContractor && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Selected: <strong>{selectedContractor.name}</strong></span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-auto"
                  onClick={() => {
                    setSelectedContractorId('');
                    setContractorSearchQuery('');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select value={selectedContractorTier} onValueChange={setSelectedContractorTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractorTiers.filter((t) => t.id !== 'free').map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      <div className="flex items-center gap-2">
                        {getTierIcon(tier.id)}
                        {tier.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Select value={selectedContractorDuration} onValueChange={setSelectedContractorDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={grantContractorTier}
            disabled={!selectedContractorId || updatingContractor === selectedContractorId}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {updatingContractor === selectedContractorId ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Gift className="h-4 w-4 mr-2" />
            )}
            Grant {selectedContractorTier.charAt(0).toUpperCase() + selectedContractorTier.slice(1)} Access
          </Button>
        </CardContent>
      </Card>

      {/* Active Granted Contractor Subscriptions */}
      {grantedContractors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Granted Contractor Subscriptions</CardTitle>
            <CardDescription>Contractors with manually granted Pro/Enterprise access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {grantedContractors.map((contractor) => (
                <div
                  key={contractor.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{contractor.name}</p>
                      <p className="text-xs text-muted-foreground">{contractor.email}</p>
                    </div>
                    <Badge variant="outline" className={getTierBadgeColor(contractor.currentTier)}>
                      {getTierIcon(contractor.currentTier)}
                      <span className="ml-1">{contractor.currentTier}</span>
                    </Badge>
                    {contractor.periodEnd && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(contractor.periodEnd).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeContractorTier(contractor.id)}
                    disabled={revokingContractor === contractor.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {revokingContractor === contractor.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tier Features Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Feature</th>
                  <th className="text-center py-2 px-2">Free</th>
                  <th className="text-center py-2 px-2">Pro</th>
                  <th className="text-center py-2 px-2">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-4">Unit Limit</td>
                  <td className="text-center py-2 px-2">24</td>
                  <td className="text-center py-2 px-2">250</td>
                  <td className="text-center py-2 px-2">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">No Cashout Fees</td>
                  <td className="text-center py-2 px-2">❌</td>
                  <td className="text-center py-2 px-2">✅</td>
                  <td className="text-center py-2 px-2">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Rent Reminders</td>
                  <td className="text-center py-2 px-2">❌</td>
                  <td className="text-center py-2 px-2">✅</td>
                  <td className="text-center py-2 px-2">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Team Management</td>
                  <td className="text-center py-2 px-2">❌</td>
                  <td className="text-center py-2 px-2">✅</td>
                  <td className="text-center py-2 px-2">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Custom Branding</td>
                  <td className="text-center py-2 px-2">❌</td>
                  <td className="text-center py-2 px-2">❌</td>
                  <td className="text-center py-2 px-2">✅</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">API Access</td>
                  <td className="text-center py-2 px-2">❌</td>
                  <td className="text-center py-2 px-2">❌</td>
                  <td className="text-center py-2 px-2">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
