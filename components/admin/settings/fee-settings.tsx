'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Check, DollarSign, Clock, PawPrint, Sparkles, Crown, Bell, Building2, Settings2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface FeeSettingsProps {
  isPro: boolean;
}

interface Property {
  id: string;
  name: string;
}

interface FeeConfig {
  enabled: boolean;
  amount: number;
  applyToAll: boolean;
  selectedProperties: string[];
}

interface RentReminderSettings {
  enabled: boolean;
  reminderDaysBefore: number[];
  reminderChannels: string[];
}

interface LateFeeSettings {
  enabled: boolean;
  gracePeriodDays: number;
  feeType: 'flat' | 'percentage';
  feeAmount: number;
  maxFee?: number;
  notifyTenant: boolean;
}

interface PropertyFeeOverride {
  securityDepositMonths?: number | null;
  noSecurityDeposit?: boolean;
  lastMonthRentRequired?: boolean | null;
  petDepositEnabled?: boolean | null;
  petDepositAmount?: number | null;
  petRentEnabled?: boolean | null;
  petRentAmount?: number | null;
  noPetFees?: boolean;
  cleaningFeeEnabled?: boolean | null;
  cleaningFeeAmount?: number | null;
  noCleaningFee?: boolean;
  applicationFeeEnabled?: boolean | null;
  applicationFeeAmount?: number | null;
  noApplicationFee?: boolean;
}

export function FeeSettings({ isPro }: FeeSettingsProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [lateFeeModalOpen, setLateFeeModalOpen] = useState(false);
  const [propertyOverrideModalOpen, setPropertyOverrideModalOpen] = useState(false);
  const [selectedPropertyForOverride, setSelectedPropertyForOverride] = useState<Property | null>(null);
  const [savingReminders, setSavingReminders] = useState(false);
  const [savingLateFees, setSavingLateFees] = useState(false);
  const [savingPropertyOverride, setSavingPropertyOverride] = useState(false);

  // Property-specific overrides
  const [propertyOverrides, setPropertyOverrides] = useState<Record<string, PropertyFeeOverride>>({});
  const [currentPropertyOverride, setCurrentPropertyOverride] = useState<PropertyFeeOverride>({});
  
  // Rent automation settings
  const [reminderSettings, setReminderSettings] = useState<RentReminderSettings>({
    enabled: false,
    reminderDaysBefore: [7, 3, 1],
    reminderChannels: ['email'],
  });
  
  const [lateFeeSettings, setLateFeeSettings] = useState<LateFeeSettings>({
    enabled: false,
    gracePeriodDays: 5,
    feeType: 'flat',
    feeAmount: 50,
    notifyTenant: true,
  });
  
  // Individual fee settings with property selection
  const [petDeposit, setPetDeposit] = useState<FeeConfig>({
    enabled: false,
    amount: 300,
    applyToAll: true,
    selectedProperties: [],
  });
  
  const [petRent, setPetRent] = useState<FeeConfig>({
    enabled: false,
    amount: 50,
    applyToAll: true,
    selectedProperties: [],
  });
  
  const [cleaningFee, setCleaningFee] = useState<FeeConfig>({
    enabled: false,
    amount: 150,
    applyToAll: true,
    selectedProperties: [],
  });
  
  const [securityDeposit, setSecurityDeposit] = useState({
    months: 1,
    applyToAll: true,
    selectedProperties: [] as string[],
  });
  
  const [lastMonthRent, setLastMonthRent] = useState({
    required: true,
    applyToAll: true,
    selectedProperties: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [propsRes, feesRes, reminderRes, lateFeeRes] = await Promise.all([
        fetch('/api/landlord/properties'),
        fetch('/api/landlord/fee-settings'),
        fetch('/api/landlord/rent-automation/reminders'),
        fetch('/api/landlord/rent-automation/late-fees'),
      ]);

      if (propsRes.ok) {
        const data = await propsRes.json();
        setProperties(data.properties || []);
      }

      if (feesRes.ok) {
        const data = await feesRes.json();
        if (data.settings) {
          // Map the settings to our state structure
          if (data.settings.petDeposit) {
            setPetDeposit({
              enabled: data.settings.petDeposit.enabled ?? false,
              amount: data.settings.petDeposit.amount ?? 300,
              applyToAll: data.settings.petDeposit.applyToAll ?? true,
              selectedProperties: data.settings.petDeposit.selectedProperties ?? [],
            });
          }
          if (data.settings.petRent) {
            setPetRent({
              enabled: data.settings.petRent.enabled ?? false,
              amount: data.settings.petRent.amount ?? 50,
              applyToAll: data.settings.petRent.applyToAll ?? true,
              selectedProperties: data.settings.petRent.selectedProperties ?? [],
            });
          }
          if (data.settings.cleaningFee) {
            setCleaningFee({
              enabled: data.settings.cleaningFee.enabled ?? false,
              amount: data.settings.cleaningFee.amount ?? 150,
              applyToAll: data.settings.cleaningFee.applyToAll ?? true,
              selectedProperties: data.settings.cleaningFee.selectedProperties ?? [],
            });
          }
          if (data.settings.securityDeposit) {
            setSecurityDeposit({
              months: data.settings.securityDeposit.months ?? 1,
              applyToAll: data.settings.securityDeposit.applyToAll ?? true,
              selectedProperties: data.settings.securityDeposit.selectedProperties ?? [],
            });
          }
          if (data.settings.lastMonthRent) {
            setLastMonthRent({
              required: data.settings.lastMonthRent.required ?? true,
              applyToAll: data.settings.lastMonthRent.applyToAll ?? true,
              selectedProperties: data.settings.lastMonthRent.selectedProperties ?? [],
            });
          }
        }
        // Load property-specific overrides
        if (data.propertySettings) {
          setPropertyOverrides(data.propertySettings);
        }
      }

      if (reminderRes.ok) {
        const data = await reminderRes.json();
        if (data.settings) setReminderSettings(data.settings);
      }

      if (lateFeeRes.ok) {
        const data = await lateFeeRes.json();
        if (data.settings) setLateFeeSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReminderSettings = async () => {
    setSavingReminders(true);
    try {
      const res = await fetch('/api/landlord/rent-automation/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderSettings),
      });
      if (res.ok) {
        toast({ title: 'Rent reminder settings saved' });
        setReminderModalOpen(false);
      } else {
        const data = await res.json();
        toast({ title: data.message || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSavingReminders(false);
    }
  };

  const saveLateFeeSettings = async () => {
    setSavingLateFees(true);
    try {
      const res = await fetch('/api/landlord/rent-automation/late-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lateFeeSettings),
      });
      if (res.ok) {
        toast({ title: 'Late fee settings saved' });
        setLateFeeModalOpen(false);
      } else {
        const data = await res.json();
        toast({ title: data.message || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSavingLateFees(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/landlord/fee-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petDeposit,
          petRent,
          cleaningFee,
          securityDeposit,
          lastMonthRent,
        }),
      });

      if (res.ok) {
        toast({ title: 'Fee settings saved' });
      } else {
        toast({ title: 'Failed to save settings', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openPropertyOverrideModal = (property: Property) => {
    setSelectedPropertyForOverride(property);
    setCurrentPropertyOverride(propertyOverrides[property.id] || {});
    setPropertyOverrideModalOpen(true);
  };

  const savePropertyOverride = async () => {
    if (!selectedPropertyForOverride) return;
    
    setSavingPropertyOverride(true);
    try {
      const res = await fetch('/api/landlord/fee-settings/property', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyForOverride.id,
          ...currentPropertyOverride,
        }),
      });

      if (res.ok) {
        setPropertyOverrides({
          ...propertyOverrides,
          [selectedPropertyForOverride.id]: currentPropertyOverride,
        });
        toast({ title: `Fee settings saved for ${selectedPropertyForOverride.name}` });
        setPropertyOverrideModalOpen(false);
      } else {
        const data = await res.json();
        toast({ title: data.message || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to save property settings', variant: 'destructive' });
    } finally {
      setSavingPropertyOverride(false);
    }
  };

  const resetPropertyOverride = async () => {
    if (!selectedPropertyForOverride) return;
    
    setSavingPropertyOverride(true);
    try {
      const res = await fetch(`/api/landlord/fee-settings/property?propertyId=${selectedPropertyForOverride.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const newOverrides = { ...propertyOverrides };
        delete newOverrides[selectedPropertyForOverride.id];
        setPropertyOverrides(newOverrides);
        toast({ title: `Reset to default settings for ${selectedPropertyForOverride.name}` });
        setPropertyOverrideModalOpen(false);
      } else {
        toast({ title: 'Failed to reset settings', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to reset settings', variant: 'destructive' });
    } finally {
      setSavingPropertyOverride(false);
    }
  };

  const PropertySelector = ({ 
    applyToAll, 
    setApplyToAll, 
    selectedProperties, 
    setSelectedProperties,
    label 
  }: {
    applyToAll: boolean;
    setApplyToAll: (v: boolean) => void;
    selectedProperties: string[];
    setSelectedProperties: (v: string[]) => void;
    label: string;
  }) => {
    return (
      <div className="space-y-3 pt-3 border-t border-white/5">
        {/* Toggle for Apply to All */}
        <div 
          className={`
            flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300
            ${applyToAll 
              ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30' 
              : 'bg-slate-800/40 border border-white/5 hover:border-white/10'
            }
          `}
          onClick={() => {
            const newValue = !applyToAll;
            setApplyToAll(newValue);
            if (newValue) {
              setSelectedProperties([]);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded-lg transition-colors duration-300
              ${applyToAll ? 'bg-violet-500/30' : 'bg-slate-700/50'}
            `}>
              <Building2 className={`w-4 h-4 transition-colors duration-300 ${applyToAll ? 'text-violet-300' : 'text-slate-400'}`} />
            </div>
            <div>
              <span className={`text-sm font-medium transition-colors duration-300 ${applyToAll ? 'text-white' : 'text-slate-300'}`}>
                All Properties
              </span>
              <p className="text-[10px] text-slate-500">
                {applyToAll ? 'This fee applies to every property' : 'Click to apply to all properties'}
              </p>
            </div>
          </div>
          
          {/* Stylish Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={applyToAll}
            onClick={(e) => e.stopPropagation()}
            className={`
              relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full 
              border-2 transition-all duration-300 focus-visible:outline-none 
              focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
              ${applyToAll 
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 border-violet-500/50 shadow-lg shadow-violet-500/25' 
                : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
              }
            `}
          >
            <span
              className={`
                pointer-events-none flex items-center justify-center h-5 w-5 rounded-full shadow-md 
                ring-0 transition-all duration-300
                ${applyToAll 
                  ? 'translate-x-7 bg-white' 
                  : 'translate-x-1 bg-slate-400'
                }
              `}
            >
              {applyToAll && (
                <Check className="h-3 w-3 text-violet-600" />
              )}
            </span>
          </button>
        </div>

        {/* Property Selection - Only shows when toggle is OFF */}
        {!applyToAll && properties.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-slate-800/30 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Select specific properties for this fee:
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {properties.map((p) => {
                const hasCustomOverride = !!propertyOverrides[p.id];
                const isSelected = selectedProperties.includes(p.id);
                return (
                  <div 
                    key={p.id} 
                    className={`
                      flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/40 shadow-sm' 
                        : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50 hover:border-white/10'
                      }
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) {
                        setSelectedProperties(selectedProperties.filter(id => id !== p.id));
                      } else {
                        setSelectedProperties([...selectedProperties, p.id]);
                      }
                    }}
                  >
                    <div className={`
                      w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
                      ${isSelected 
                        ? 'bg-violet-600 border-violet-500' 
                        : 'bg-transparent border-slate-500 hover:border-slate-400'
                      }
                    `}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className={`text-sm flex-1 transition-colors ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>
                      {p.name}
                    </span>
                    {hasCustomOverride && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Custom
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedProperties.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
                <p className="text-xs text-violet-400">
                  {selectedProperties.length} {selectedProperties.length === 1 ? 'property' : 'properties'} selected
                </p>
              </div>
            )}
          </div>
        )}

        {!applyToAll && properties.length === 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 animate-in fade-in duration-300">
            <p className="text-xs text-amber-400/80 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              No properties available. Add properties first.
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Property-Specific Overrides Section */}
      {properties.length > 0 && (
        <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-2.5 sm:p-3 md:p-4 space-y-1 hover:border-slate-700 transition-colors shadow-2xl active:scale-[0.98]">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Property-Specific Settings</h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Customize fee settings for individual properties. For example, waive security deposit for specific agreements.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {properties.map((property) => {
              const hasOverride = !!propertyOverrides[property.id];
              return (
                <button
                  key={property.id}
                  onClick={() => openPropertyOverrideModal(property)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                    hasOverride 
                      ? 'border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20' 
                      : 'border-white/10 bg-slate-800/30 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-sm text-white truncate">{property.name}</span>
                  {hasOverride && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 ml-2 shrink-0">
                      Custom
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Rent Automation - Combined Pro Feature Card */}
      <div className="relative rounded-xl border border-violet-500/30 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600 p-4 sm:p-5 overflow-hidden">
        {!isPro && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
            <Crown className="w-10 h-10 text-amber-400 mb-3" />
            <p className="text-base text-white font-semibold mb-1">Pro Features</p>
            <p className="text-xs text-slate-400 mb-4 text-center px-6">
              Upgrade to Pro to enable automatic rent reminders and late fees
            </p>
            <Link href="/admin/settings/subscription">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-4 ">
          <Clock className="w-5 h-5 text-violet-400" />
          <h3 className="text-base font-semibold text-white">Rent Automation</h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">PRO</span>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Rent Reminders */}
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium text-white">Rent Reminders</span>
              </div>
              <Switch
                checked={reminderSettings.enabled}
                onCheckedChange={(checked) => setReminderSettings({ ...reminderSettings, enabled: checked })}
                disabled={!isPro}
              />
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {reminderSettings.enabled 
                ? `Sending ${reminderSettings.reminderDaysBefore.join(', ')} days before due`
                : 'Send automated reminders before rent is due'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 p-0 h-auto"
              onClick={() => setReminderModalOpen(true)}
              disabled={!isPro}
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Configure Settings
            </Button>
          </div>
          
          {/* Late Fees */}
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Late Fees</span>
              </div>
              <Switch
                checked={lateFeeSettings.enabled}
                onCheckedChange={(checked) => setLateFeeSettings({ ...lateFeeSettings, enabled: checked })}
                disabled={!isPro}
              />
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {lateFeeSettings.enabled 
                ? `$${lateFeeSettings.feeAmount} after ${lateFeeSettings.gracePeriodDays} day grace period`
                : 'Automatically apply late fees after grace period'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 p-0 h-auto"
              onClick={() => setLateFeeModalOpen(true)}
              disabled={!isPro}
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Configure Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Pet Fees */}
      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-2.5 sm:p-3 md:p-4 space-y-1 hover:border-slate-700 transition-colors shadow-2xl active:scale-[0.98]">
        <div className="flex items-center gap-2 mb-4">
          <PawPrint className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">Pet Fees</h3>
        </div>
        <div className="space-y-4">
          {/* Pet Deposit */}
          <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white font-medium">Pet Deposit</p>
                <p className="text-[11px] text-slate-500">One-time refundable deposit</p>
              </div>
              <Switch
                checked={petDeposit.enabled}
                onCheckedChange={(checked) => setPetDeposit({ ...petDeposit, enabled: checked })}
              />
            </div>
            {petDeposit.enabled && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">$</span>
                  <Input
                    type="number"
                    value={petDeposit.amount || ''}
                    onChange={(e) => setPetDeposit({ ...petDeposit, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="h-8 w-28 text-sm"
                    min={0}
                    placeholder="0"
                  />
                </div>
                <PropertySelector
                  applyToAll={petDeposit.applyToAll}
                  setApplyToAll={(v) => setPetDeposit({ ...petDeposit, applyToAll: v })}
                  selectedProperties={petDeposit.selectedProperties}
                  setSelectedProperties={(v) => setPetDeposit({ ...petDeposit, selectedProperties: v })}
                  label="petDeposit"
                />
              </div>
            )}
          </div>

          {/* Pet Rent */}
          <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white font-medium">Monthly Pet Rent</p>
                <p className="text-[11px] text-slate-500">Added to monthly rent</p>
              </div>
              <Switch
                checked={petRent.enabled}
                onCheckedChange={(checked) => setPetRent({ ...petRent, enabled: checked })}
              />
            </div>
            {petRent.enabled && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">$</span>
                  <Input
                    type="number"
                    value={petRent.amount || ''}
                    onChange={(e) => setPetRent({ ...petRent, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="h-8 w-28 text-sm"
                    min={0}
                    placeholder="0"
                  />
                  <span className="text-slate-500 text-xs">/month</span>
                </div>
                <PropertySelector
                  applyToAll={petRent.applyToAll}
                  setApplyToAll={(v) => setPetRent({ ...petRent, applyToAll: v })}
                  selectedProperties={petRent.selectedProperties}
                  setSelectedProperties={(v) => setPetRent({ ...petRent, selectedProperties: v })}
                  label="petRent"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move-in Fees */}
      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600 border border-black p-2.5 sm:p-3 md:p-4 space-y-1 hover:border-slate-700 transition-colors shadow-2xl active:scale-[0.98]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Move-in Fees</h3>
        </div>
        <div className="space-y-4">
          {/* Cleaning Fee */}
          <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white font-medium">Cleaning Fee</p>
                <p className="text-[11px] text-slate-500">Non-refundable move-in fee</p>
              </div>
              <Switch
                checked={cleaningFee.enabled}
                onCheckedChange={(checked) => setCleaningFee({ ...cleaningFee, enabled: checked })}
              />
            </div>
            {cleaningFee.enabled && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">$</span>
                  <Input
                    type="number"
                    value={cleaningFee.amount || ''}
                    onChange={(e) => setCleaningFee({ ...cleaningFee, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="h-8 w-28 text-sm"
                    min={0}
                    placeholder="0"
                  />
                </div>
                <PropertySelector
                  applyToAll={cleaningFee.applyToAll}
                  setApplyToAll={(v) => setCleaningFee({ ...cleaningFee, applyToAll: v })}
                  selectedProperties={cleaningFee.selectedProperties}
                  setSelectedProperties={(v) => setCleaningFee({ ...cleaningFee, selectedProperties: v })}
                  label="cleaningFee"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Requirements */}
      <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-2.5 sm:p-3 md:p-4 space-y-1 hover:border-slate-700 transition-colors shadow-2xl active:scale-[0.98]">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-semibold text-white">Deposit Requirements</h3>
        </div>
        <div className="space-y-4">
          {/* Security Deposit */}
          <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
            <div className="mb-2">
              <p className="text-sm text-white font-medium">Security Deposit</p>
              <p className="text-[11px] text-slate-500">Required at lease signing</p>
            </div>
            <div className="space-y-2">
              <Select
                value={String(securityDeposit.months)}
                onValueChange={(v) => setSecurityDeposit({ ...securityDeposit, months: Number(v) })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No security deposit</SelectItem>
                  <SelectItem value="0.5">Half month&apos;s rent</SelectItem>
                  <SelectItem value="1">1 month&apos;s rent</SelectItem>
                  <SelectItem value="1.5">1.5 months&apos; rent</SelectItem>
                  <SelectItem value="2">2 months&apos; rent</SelectItem>
                </SelectContent>
              </Select>
              <PropertySelector
                applyToAll={securityDeposit.applyToAll}
                setApplyToAll={(v) => setSecurityDeposit({ ...securityDeposit, applyToAll: v })}
                selectedProperties={securityDeposit.selectedProperties}
                setSelectedProperties={(v) => setSecurityDeposit({ ...securityDeposit, selectedProperties: v })}
                label="securityDeposit"
              />
            </div>
          </div>

          {/* Last Month's Rent */}
          <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white font-medium">Require Last Month&apos;s Rent</p>
                <p className="text-[11px] text-slate-500">Collected at move-in</p>
              </div>
              <Switch
                checked={lastMonthRent.required}
                onCheckedChange={(checked) => setLastMonthRent({ ...lastMonthRent, required: checked })}
              />
            </div>
            {lastMonthRent.required && (
              <div className="pt-2 border-t border-white/5">
                <PropertySelector
                  applyToAll={lastMonthRent.applyToAll}
                  setApplyToAll={(v) => setLastMonthRent({ ...lastMonthRent, applyToAll: v })}
                  selectedProperties={lastMonthRent.selectedProperties}
                  setSelectedProperties={(v) => setLastMonthRent({ ...lastMonthRent, selectedProperties: v })}
                  label="lastMonthRent"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-sm h-10"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Check className="w-4 h-4 mr-2" />
        )}
        Save Fee Settings
      </Button>

      {/* Rent Reminders Modal */}
      <Dialog open={reminderModalOpen} onOpenChange={setReminderModalOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Bell className="w-5 h-5 text-violet-400" />
              Rent Reminder Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Enable Reminders</p>
                <p className="text-xs text-slate-300">Send automated reminders before rent is due</p>
              </div>
              <Switch
                checked={reminderSettings.enabled}
                onCheckedChange={(checked) => setReminderSettings({ ...reminderSettings, enabled: checked })}
              />
            </div>

            {reminderSettings.enabled && (
              <>
                <div>
                  <p className="text-xs text-slate-200 mb-2">Remind tenants</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 3, 5, 7, 14].map((days) => (
                      <button
                        key={days}
                        onClick={() => {
                          const current = reminderSettings.reminderDaysBefore;
                          const updated = current.includes(days)
                            ? current.filter((d) => d !== days)
                            : [...current, days].sort((a, b) => b - a);
                          setReminderSettings({ ...reminderSettings, reminderDaysBefore: updated });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          reminderSettings.reminderDaysBefore.includes(days)
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        {days} day{days > 1 ? 's' : ''} before
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-200 mb-2">Notification channels</p>
                  <div className="flex gap-2">
                    {['email', 'in-app'].map((channel) => (
                      <button
                        key={channel}
                        onClick={() => {
                          const current = reminderSettings.reminderChannels;
                          const updated = current.includes(channel)
                            ? current.filter((c) => c !== channel)
                            : [...current, channel];
                          setReminderSettings({ ...reminderSettings, reminderChannels: updated });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          reminderSettings.reminderChannels.includes(channel)
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        {channel === 'in-app' ? 'In-App' : 'Email'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReminderModalOpen(false)} className="border-slate-600 text-slate-200 hover:bg-slate-700">
                Cancel
              </Button>
              <Button onClick={saveReminderSettings} disabled={savingReminders} className="bg-violet-600 hover:bg-violet-500">
                {savingReminders && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Late Fees Modal */}
      <Dialog open={lateFeeModalOpen} onOpenChange={setLateFeeModalOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Late Fee Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Enable Late Fees</p>
                <p className="text-xs text-slate-300">Automatically apply fees after grace period</p>
              </div>
              <Switch
                checked={lateFeeSettings.enabled}
                onCheckedChange={(checked) => setLateFeeSettings({ ...lateFeeSettings, enabled: checked })}
              />
            </div>

            {lateFeeSettings.enabled && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-200 mb-1.5">Grace period</p>
                    <Select
                      value={String(lateFeeSettings.gracePeriodDays)}
                      onValueChange={(v) => setLateFeeSettings({ ...lateFeeSettings, gracePeriodDays: Number(v) })}
                    >
                      <SelectTrigger className="h-9 text-sm bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 3, 5, 7, 10, 14].map((days) => (
                          <SelectItem key={days} value={String(days)}>
                            {days === 0 ? 'No grace period' : `${days} days`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs text-slate-200 mb-1.5">Fee type</p>
                    <Select
                      value={lateFeeSettings.feeType}
                      onValueChange={(v) => setLateFeeSettings({ ...lateFeeSettings, feeType: v as 'flat' | 'percentage' })}
                    >
                      <SelectTrigger className="h-9 text-sm bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat fee</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-200 mb-1.5">
                      {lateFeeSettings.feeType === 'flat' ? 'Fee amount ($)' : 'Fee percentage (%)'}
                    </p>
                    <Input
                      type="number"
                      value={lateFeeSettings.feeAmount || ''}
                      onChange={(e) => setLateFeeSettings({ ...lateFeeSettings, feeAmount: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="h-9 text-sm bg-slate-700 border-slate-600 text-white"
                      min={0}
                      step={lateFeeSettings.feeType === 'percentage' ? 0.5 : 1}
                      placeholder="0"
                    />
                  </div>

                  {lateFeeSettings.feeType === 'percentage' && (
                    <div>
                      <p className="text-xs text-slate-200 mb-1.5">Max fee cap ($)</p>
                      <Input
                        type="number"
                        value={lateFeeSettings.maxFee || ''}
                        onChange={(e) => setLateFeeSettings({ ...lateFeeSettings, maxFee: e.target.value ? Number(e.target.value) : undefined })}
                        className="h-9 text-sm bg-slate-700 border-slate-600 text-white"
                        placeholder="No cap"
                        min={0}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="notifyTenant"
                    checked={lateFeeSettings.notifyTenant}
                    onCheckedChange={(checked) => setLateFeeSettings({ ...lateFeeSettings, notifyTenant: !!checked })}
                  />
                  <label htmlFor="notifyTenant" className="text-xs text-slate-200">
                    Notify tenant when fee is applied
                  </label>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-100">
                    Late fees run daily at 10 AM UTC. Fees are applied to payments past the grace period.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setLateFeeModalOpen(false)} className="border-slate-600 text-slate-200 hover:bg-slate-700">
                Cancel
              </Button>
              <Button onClick={saveLateFeeSettings} disabled={savingLateFees} className="bg-amber-600 hover:bg-amber-500">
                {savingLateFees && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Property Override Modal */}
      <Dialog open={propertyOverrideModalOpen} onOpenChange={setPropertyOverrideModalOpen}>
        <DialogContent className="max-w-lg bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Building2 className="w-5 h-5 text-sky-400" />
              Fee Settings for {selectedPropertyForOverride?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-300">
              Override default fee settings for this property. Leave unchecked to use your default settings.
            </p>

            {/* Security Deposit Override */}
            <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white font-medium">Security Deposit</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="noSecurityDeposit"
                    checked={currentPropertyOverride.noSecurityDeposit || false}
                    onCheckedChange={(checked) => setCurrentPropertyOverride({
                      ...currentPropertyOverride,
                      noSecurityDeposit: !!checked,
                      securityDepositMonths: checked ? 0 : currentPropertyOverride.securityDepositMonths,
                    })}
                  />
                  <label htmlFor="noSecurityDeposit" className="text-xs text-slate-300">No deposit required</label>
                </div>
              </div>
              {!currentPropertyOverride.noSecurityDeposit && (
                <Select
                  value={currentPropertyOverride.securityDepositMonths !== null && currentPropertyOverride.securityDepositMonths !== undefined
                    ? String(currentPropertyOverride.securityDepositMonths)
                    : 'default'}
                  onValueChange={(v) => setCurrentPropertyOverride({
                    ...currentPropertyOverride,
                    securityDepositMonths: v === 'default' ? null : Number(v),
                  })}
                >
                  <SelectTrigger className="h-9 text-sm bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Use default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use default</SelectItem>
                    <SelectItem value="0">No security deposit</SelectItem>
                    <SelectItem value="0.5">Half month&apos;s rent</SelectItem>
                    <SelectItem value="1">1 month&apos;s rent</SelectItem>
                    <SelectItem value="1.5">1.5 months&apos; rent</SelectItem>
                    <SelectItem value="2">2 months&apos; rent</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Last Month's Rent Override */}
            <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white font-medium">Last Month&apos;s Rent</p>
                <Select
                  value={currentPropertyOverride.lastMonthRentRequired !== null && currentPropertyOverride.lastMonthRentRequired !== undefined
                    ? String(currentPropertyOverride.lastMonthRentRequired)
                    : 'default'}
                  onValueChange={(v) => setCurrentPropertyOverride({
                    ...currentPropertyOverride,
                    lastMonthRentRequired: v === 'default' ? null : v === 'true',
                  })}
                >
                  <SelectTrigger className="h-9 w-40 text-sm bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Use default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use default</SelectItem>
                    <SelectItem value="true">Required</SelectItem>
                    <SelectItem value="false">Not required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pet Fees Override */}
            <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white font-medium">Pet Fees</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="noPetFees"
                    checked={currentPropertyOverride.noPetFees || false}
                    onCheckedChange={(checked) => setCurrentPropertyOverride({
                      ...currentPropertyOverride,
                      noPetFees: !!checked,
                    })}
                  />
                  <label htmlFor="noPetFees" className="text-xs text-slate-200">No pet fees</label>
                </div>
              </div>
              {!currentPropertyOverride.noPetFees && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 w-24">Pet Deposit:</span>
                    <Input
                      type="number"
                      value={currentPropertyOverride.petDepositAmount ?? ''}
                      onChange={(e) => setCurrentPropertyOverride({
                        ...currentPropertyOverride,
                        petDepositAmount: e.target.value ? Number(e.target.value) : null,
                        petDepositEnabled: e.target.value ? true : null,
                      })}
                      className="h-8 w-28 text-sm bg-slate-700 border-slate-600 text-white"
                      placeholder="Default"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 w-24">Pet Rent:</span>
                    <Input
                      type="number"
                      value={currentPropertyOverride.petRentAmount ?? ''}
                      onChange={(e) => setCurrentPropertyOverride({
                        ...currentPropertyOverride,
                        petRentAmount: e.target.value ? Number(e.target.value) : null,
                        petRentEnabled: e.target.value ? true : null,
                      })}
                      className="h-8 w-28 text-sm bg-slate-700 border-slate-600 text-white"
                      placeholder="Default"
                    />
                    <span className="text-xs text-slate-400">/month</span>
                  </div>
                </div>
              )}
            </div>

            {/* Cleaning Fee Override */}
            <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white font-medium">Cleaning Fee</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="noCleaningFee"
                    checked={currentPropertyOverride.noCleaningFee || false}
                    onCheckedChange={(checked) => setCurrentPropertyOverride({
                      ...currentPropertyOverride,
                      noCleaningFee: !!checked,
                    })}
                  />
                  <label htmlFor="noCleaningFee" className="text-xs text-slate-200">No cleaning fee</label>
                </div>
              </div>
              {!currentPropertyOverride.noCleaningFee && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">$</span>
                  <Input
                    type="number"
                    value={currentPropertyOverride.cleaningFeeAmount ?? ''}
                    onChange={(e) => setCurrentPropertyOverride({
                      ...currentPropertyOverride,
                      cleaningFeeAmount: e.target.value ? Number(e.target.value) : null,
                      cleaningFeeEnabled: e.target.value ? true : null,
                    })}
                    className="h-8 w-28 text-sm bg-slate-700 border-slate-600 text-white"
                    placeholder="Default"
                  />
                </div>
              )}
            </div>

            {/* Application Fee Override */}
            <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white font-medium">Application Fee</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="noApplicationFee"
                    checked={currentPropertyOverride.noApplicationFee || false}
                    onCheckedChange={(checked) => setCurrentPropertyOverride({
                      ...currentPropertyOverride,
                      noApplicationFee: !!checked,
                    })}
                  />
                  <label htmlFor="noApplicationFee" className="text-xs text-slate-200">No application fee</label>
                </div>
              </div>
              {!currentPropertyOverride.noApplicationFee && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">$</span>
                  <Input
                    type="number"
                    value={currentPropertyOverride.applicationFeeAmount ?? ''}
                    onChange={(e) => setCurrentPropertyOverride({
                      ...currentPropertyOverride,
                      applicationFeeAmount: e.target.value ? Number(e.target.value) : null,
                      applicationFeeEnabled: e.target.value ? true : null,
                    })}
                    className="h-8 w-28 text-sm bg-slate-700 border-slate-600 text-white"
                    placeholder="Default"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={resetPropertyOverride} 
                disabled={savingPropertyOverride}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Reset to Defaults
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPropertyOverrideModalOpen(false)} className="border-slate-600 text-slate-200 hover:bg-slate-700">
                  Cancel
                </Button>
                <Button onClick={savePropertyOverride} disabled={savingPropertyOverride} className="bg-sky-600 hover:bg-sky-500">
                  {savingPropertyOverride && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
