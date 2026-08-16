'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Shield, 
  Zap, 
  PawPrint,
  Volume2,
  FileCheck,
  Loader2,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
  address?: any;
  amenities?: string[];
}

interface Unit {
  id: string;
  name: string;
  type: string;
  rentAmount: number;
}

interface InlinePropertyData {
  name: string;
  slug?: string;
  address: { street: string; city: string; state: string; zipCode: string };
  amenities: string[];
}

interface LeaseBuilderModalProps {
  open: boolean;
  onClose: () => void;
  property: Property;
  unit?: Unit | null;
  tenantId?: string;
  tenantName?: string;
  tenantEmail?: string;
  onLeaseGenerated?: (document: any) => void;
  /** Pass inline data instead of a DB property ID (e.g. wizard create flow) */
  inlinePropertyData?: InlinePropertyData;
}

const STEPS = [
  { id: 'term', title: 'Lease Term', icon: Calendar },
  { id: 'payment', title: 'Payment', icon: DollarSign },
  { id: 'deposit', title: 'Deposit & Fees', icon: Shield },
  { id: 'utilities', title: 'Utilities', icon: Zap },
  { id: 'pets', title: 'Pet Policy', icon: PawPrint },
  { id: 'rules', title: 'Rules', icon: Volume2 },
  { id: 'disclosures', title: 'Disclosures', icon: FileText },
  { id: 'review', title: 'Review', icon: FileCheck },
];

const UTILITY_OPTIONS = [
  'Electric', 'Gas', 'Water', 'Sewer', 'Trash', 'Internet', 'Cable', 'Phone',
];

export default function LeaseBuilderModal({
  open,
  onClose,
  property,
  unit,
  tenantId,
  tenantName,
  tenantEmail,
  onLeaseGenerated,
  inlinePropertyData,
}: LeaseBuilderModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Lease Term
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isMonthToMonth: true,
    autoRenewal: true,
    renewalNoticeDays: 30,
    earlyTerminationFee: '',
    earlyTerminationNoticeDays: 60,
    
    // Payment
    rentAmount: unit?.rentAmount || 0,
    unitName: unit?.name || '',
    rentDueDay: 1,
    gracePeriodDays: 5,
    lateFeePercent: 5,
    lateFeeStartDay: 6,
    bouncedCheckFee: 35,
    allowPartialPayments: false,
    
    // Deposit
    securityDepositMonths: 1,
    depositReturnDays: 30,
    
    // Utilities
    tenantPaysUtilities: ['Electric', 'Gas', 'Internet', 'Cable'],
    landlordPaysUtilities: ['Water', 'Sewer', 'Trash'],
    
    // Pets
    petsAllowed: false,
    petRestrictions: '',
    petDeposit: '',
    petRent: '',
    
    // Rules
    smokingAllowed: false,
    smokingAreas: '',
    quietHoursStart: '10:00 PM',
    quietHoursEnd: '8:00 AM',
    entryNoticeDays: 24,
    moveOutNoticeDays: 30,
    rentersInsuranceRequired: false,
    minInsuranceCoverage: 100000,
    
    // Additional
    parkingRules: '',
    additionalTerms: '',
    
    // Disclosures
    leadPaintDisclosure: false,
    moldDisclosure: false,
    bedBugDisclosure: false,
    radonDisclosure: false,
    floodZoneDisclosure: false,
    propertyBuiltBefore1978: false,
  });
  
  // Get the effective rent amount (from unit or form)
  const effectiveRentAmount = unit?.rentAmount || formData.rentAmount;
  const effectiveUnitName = unit?.name || formData.unitName || 'Unit';

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleUtility = (utility: string, type: 'tenant' | 'landlord') => {
    const tenantList = [...formData.tenantPaysUtilities];
    const landlordList = [...formData.landlordPaysUtilities];
    
    if (type === 'tenant') {
      if (tenantList.includes(utility)) {
        tenantList.splice(tenantList.indexOf(utility), 1);
      } else {
        tenantList.push(utility);
        const idx = landlordList.indexOf(utility);
        if (idx > -1) landlordList.splice(idx, 1);
      }
    } else {
      if (landlordList.includes(utility)) {
        landlordList.splice(landlordList.indexOf(utility), 1);
      } else {
        landlordList.push(utility);
        const idx = tenantList.indexOf(utility);
        if (idx > -1) tenantList.splice(idx, 1);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      tenantPaysUtilities: tenantList,
      landlordPaysUtilities: landlordList,
    }));
  };

  const handlePreview = async () => {
    try {
      const res = await fetch('/api/lease-builder/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(inlinePropertyData ? { propertyData: inlinePropertyData } : { propertyId: property.id }),
          unitId: unit?.id || undefined,
          tenantId,
          leaseTerms: {
            startDate: formData.startDate,
            endDate: formData.isMonthToMonth ? null : formData.endDate,
            isMonthToMonth: formData.isMonthToMonth,
            billingDayOfMonth: formData.rentDueDay,
          },
          customizations: buildCustomizations(),
          rentAmount: (!unit?.id) ? (unit?.rentAmount || formData.rentAmount) : undefined,
          unitName: (!unit?.id) ? (unit?.name || formData.unitName) : undefined,
        }),
      });
      
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
        setShowPreview(true);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Preview failed' });
    }
  };

  const buildCustomizations = () => ({
    gracePeriodDays: formData.gracePeriodDays,
    lateFeePercent: formData.lateFeePercent,
    lateFeeStartDay: formData.lateFeeStartDay,
    bouncedCheckFee: formData.bouncedCheckFee ? Number(formData.bouncedCheckFee) : undefined,
    allowPartialPayments: formData.allowPartialPayments,
    depositReturnDays: formData.depositReturnDays,
    autoRenewal: formData.autoRenewal,
    renewalNoticeDays: formData.renewalNoticeDays,
    earlyTerminationFee: formData.earlyTerminationFee ? Number(formData.earlyTerminationFee) : undefined,
    earlyTerminationNoticeDays: formData.earlyTerminationNoticeDays,
    tenantPaysUtilities: formData.tenantPaysUtilities,
    landlordPaysUtilities: formData.landlordPaysUtilities,
    petsAllowed: formData.petsAllowed,
    petRestrictions: formData.petRestrictions || undefined,
    petDeposit: formData.petDeposit ? Number(formData.petDeposit) : undefined,
    petRent: formData.petRent ? Number(formData.petRent) : undefined,
    smokingAllowed: formData.smokingAllowed,
    smokingAreas: formData.smokingAreas || undefined,
    quietHoursStart: formData.quietHoursStart,
    quietHoursEnd: formData.quietHoursEnd,
    entryNoticeDays: formData.entryNoticeDays,
    moveOutNoticeDays: formData.moveOutNoticeDays,
    rentersInsuranceRequired: formData.rentersInsuranceRequired,
    minInsuranceCoverage: formData.minInsuranceCoverage,
    parkingRules: formData.parkingRules || undefined,
    additionalTerms: formData.additionalTerms ? formData.additionalTerms.split('\n').filter(Boolean) : undefined,
    // Disclosures
    leadPaintDisclosure: formData.leadPaintDisclosure,
    moldDisclosure: formData.moldDisclosure,
    bedBugDisclosure: formData.bedBugDisclosure,
    radonDisclosure: formData.radonDisclosure,
    floodZoneDisclosure: formData.floodZoneDisclosure,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/lease-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(inlinePropertyData ? { propertyData: inlinePropertyData } : { propertyId: property.id }),
          unitId: unit?.id || undefined,
          tenantId,
          leaseTerms: {
            startDate: formData.startDate,
            endDate: formData.isMonthToMonth ? null : formData.endDate,
            isMonthToMonth: formData.isMonthToMonth,
            billingDayOfMonth: formData.rentDueDay,
          },
          customizations: buildCustomizations(),
          rentAmount: (!unit?.id) ? (unit?.rentAmount || formData.rentAmount) : undefined,
          unitName: (!unit?.id) ? (unit?.name || formData.unitName) : undefined,
          saveAsTemplate: false,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Auto-assign to the property only when it already exists in DB
        if (!inlinePropertyData && property.id) {
          try {
            await fetch('/api/legal-documents/set-default', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentId: data.document.id,
                propertyId: property.id,
              }),
            });
          } catch (assignError) {
            console.warn('Failed to auto-assign lease to property:', assignError);
          }
        }

        toast({ title: 'Lease generated!' });
        onLeaseGenerated?.(data.document);
        onClose();
      } else {
        const err = await res.json();
        toast({ variant: 'destructive', title: 'Failed to generate lease', description: err.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to generate lease' });
    } finally {
      setGenerating(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5 text-violet-300" />
            Create Custom Lease - {property.name}{unit ? ` / ${unit.name}` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2 py-4 border-b border-white/10">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'flex flex-col items-center gap-1 transition-colors',
                  isActive ? 'text-violet-300' : isComplete ? 'text-emerald-300' : 'text-white/50'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  isActive ? 'border-violet-300 bg-violet-400/30' : 
                  isComplete ? 'border-emerald-300 bg-emerald-400/30' : 'border-white/30'
                )}>
                  {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Step 0: Lease Term */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Lease Term</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={e => updateForm('startDate', e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.isMonthToMonth}
                    onCheckedChange={v => updateForm('isMonthToMonth', v)}
                  />
                  <Label className="text-white/90">Month-to-Month</Label>
                </div>
              </div>
              
              {!formData.isMonthToMonth && (
                <div>
                  <Label className="text-white/90">End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={e => updateForm('endDate', e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.autoRenewal}
                  onCheckedChange={v => updateForm('autoRenewal', v)}
                />
                <Label className="text-white/90">Auto-renew to month-to-month</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Renewal Notice (days)</Label>
                  <Input
                    type="number"
                    value={formData.renewalNoticeDays}
                    onChange={e => updateForm('renewalNoticeDays', Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white/90">Early Termination Fee ($)</Label>
                  <Input
                    type="number"
                    value={formData.earlyTerminationFee}
                    onChange={e => updateForm('earlyTerminationFee', e.target.value)}
                    placeholder="Optional"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Payment */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Payment Terms</h3>
              
              {unit ? (
                <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                  <p className="text-white/90">Monthly Rent: <span className="text-white font-bold">${Number(unit.rentAmount).toLocaleString()}</span></p>
                  <p className="text-white/70 text-sm">Unit: {unit.name}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/90">Unit/Room Name <span className="text-white/50 text-xs">(Optional)</span></Label>
                    <Input
                      value={formData.unitName}
                      onChange={e => updateForm('unitName', e.target.value)}
                      placeholder="e.g., Unit A, Master Bedroom"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white/90">Monthly Rent ($) <span className="text-red-300">*</span></Label>
                    <Input
                      type="number"
                      value={formData.rentAmount || ''}
                      onChange={e => updateForm('rentAmount', Number(e.target.value))}
                      placeholder="Enter rent amount"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Rent Due Day</Label>
                  <Select value={String(formData.rentDueDay)} onValueChange={v => updateForm('rentDueDay', Number(v))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-indigo-900 border-white/20 text-white z-[9999]">
                      {[1, 5, 10, 15].map(d => (
                        <SelectItem key={d} value={String(d)} className="text-white hover:bg-white/10 focus:bg-white/10">{d}st/th of month</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/90">Grace Period (days)</Label>
                  <Input
                    type="number"
                    value={formData.gracePeriodDays}
                    onChange={e => updateForm('gracePeriodDays', Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Late Fee (%)</Label>
                  <Input
                    type="number"
                    value={formData.lateFeePercent}
                    onChange={e => updateForm('lateFeePercent', Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white/90">Bounced Check Fee ($)</Label>
                  <Input
                    type="number"
                    value={formData.bouncedCheckFee}
                    onChange={e => updateForm('bouncedCheckFee', Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.allowPartialPayments}
                  onCheckedChange={v => updateForm('allowPartialPayments', v)}
                />
                <Label className="text-white/90">Allow partial payments</Label>
              </div>
            </div>
          )}

          {/* Step 2: Deposit & Fees */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Security Deposit & Fees</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Security Deposit (months of rent)</Label>
                  <Select value={String(formData.securityDepositMonths)} onValueChange={v => updateForm('securityDepositMonths', Number(v))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-indigo-900 border-white/20 text-white z-[9999]">
                      <SelectItem value="0.5" className="text-white hover:bg-white/10 focus:bg-white/10">0.5 month</SelectItem>
                      <SelectItem value="1" className="text-white hover:bg-white/10 focus:bg-white/10">1 month</SelectItem>
                      <SelectItem value="1.5" className="text-white hover:bg-white/10 focus:bg-white/10">1.5 months</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-white/10 focus:bg-white/10">2 months</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-white/70 mt-1">
                    = ${(effectiveRentAmount * formData.securityDepositMonths).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-white/90">Deposit Return (days after move-out)</Label>
                  <Input
                    type="number"
                    value={formData.depositReturnDays}
                    onChange={e => updateForm('depositReturnDays', Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Utilities */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Utilities</h3>
              <p className="text-white/70 text-sm">Select who pays for each utility</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                  <h4 className="font-medium text-white mb-3">Tenant Pays</h4>
                  <div className="space-y-2">
                    {UTILITY_OPTIONS.map(util => (
                      <label key={util} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.tenantPaysUtilities.includes(util)}
                          onChange={() => toggleUtility(util, 'tenant')}
                          className="rounded border-white/30 bg-white/10"
                        />
                        <span className="text-white/90">{util}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                  <h4 className="font-medium text-white mb-3">Landlord Pays</h4>
                  <div className="space-y-2">
                    {UTILITY_OPTIONS.map(util => (
                      <label key={util} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.landlordPaysUtilities.includes(util)}
                          onChange={() => toggleUtility(util, 'landlord')}
                          className="rounded border-white/30 bg-white/10"
                        />
                        <span className="text-white/90">{util}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Pets */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Pet Policy</h3>
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.petsAllowed}
                  onCheckedChange={v => updateForm('petsAllowed', v)}
                />
                <Label className="text-white/90">Pets Allowed</Label>
              </div>
              
              {formData.petsAllowed && (
                <div className="space-y-4 p-4 bg-white/10 rounded-lg border border-white/20">
                  <div>
                    <Label className="text-white/90">Pet Restrictions</Label>
                    <Input
                      value={formData.petRestrictions}
                      onChange={e => updateForm('petRestrictions', e.target.value)}
                      placeholder="e.g., No aggressive breeds, max 2 pets, under 50 lbs"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/90">Pet Deposit ($)</Label>
                      <Input
                        type="number"
                        value={formData.petDeposit}
                        onChange={e => updateForm('petDeposit', e.target.value)}
                        placeholder="One-time deposit"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Label className="text-white/90">Monthly Pet Rent ($)</Label>
                      <Input
                        type="number"
                        value={formData.petRent}
                        onChange={e => updateForm('petRent', e.target.value)}
                        placeholder="Per pet per month"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Rules */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Property Rules</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.smokingAllowed}
                    onCheckedChange={v => updateForm('smokingAllowed', v)}
                  />
                  <Label className="text-white/90">Smoking Allowed</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.rentersInsuranceRequired}
                    onCheckedChange={v => updateForm('rentersInsuranceRequired', v)}
                  />
                  <Label className="text-white/90">Renter's Insurance Required</Label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Quiet Hours Start</Label>
                  <Input
                    value={formData.quietHoursStart}
                    onChange={e => updateForm('quietHoursStart', e.target.value)}
                    placeholder="10:00 PM"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white/90">Quiet Hours End</Label>
                  <Input
                    value={formData.quietHoursEnd}
                    onChange={e => updateForm('quietHoursEnd', e.target.value)}
                    placeholder="8:00 AM"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Entry Notice (hours)</Label>
                  <Input
                    type="number"
                    value={formData.entryNoticeDays}
                    onChange={e => updateForm('entryNoticeDays', Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <Label className="text-white/90">Move-out Notice (days)</Label>
                  <Input
                    type="number"
                    value={formData.moveOutNoticeDays}
                    onChange={e => updateForm('moveOutNoticeDays', Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-white/90">Parking Rules</Label>
                <Textarea
                  value={formData.parkingRules}
                  onChange={e => updateForm('parkingRules', e.target.value)}
                  placeholder="e.g., 1 assigned spot per unit, no RVs or boats"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              
              <div>
                <Label className="text-white/90">Additional Terms (one per line)</Label>
                <Textarea
                  value={formData.additionalTerms}
                  onChange={e => updateForm('additionalTerms', e.target.value)}
                  placeholder="Any additional terms or conditions..."
                  rows={3}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>
          )}

          {/* Step 6: Disclosures */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Required Disclosures</h3>
              <p className="text-slate-400 text-sm">
                Select applicable disclosures. State-specific requirements will be automatically included based on your property location.
              </p>
              
              <div className="p-4 bg-amber-500/20 border border-amber-400/40 rounded-lg">
                <p className="text-amber-100 text-sm">
                  <strong>Important:</strong> Missing required disclosures can void late fees, delay evictions, or get cases thrown out in court. 
                  We recommend including all applicable disclosures.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                  <Switch
                    checked={formData.propertyBuiltBefore1978}
                    onCheckedChange={v => {
                      updateForm('propertyBuiltBefore1978', v);
                      if (v) updateForm('leadPaintDisclosure', true);
                    }}
                  />
                  <div>
                    <Label className="text-white/90">Property built before 1978</Label>
                    <p className="text-xs text-white/60">Federal law requires lead paint disclosure for pre-1978 housing</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                  <Switch
                    checked={formData.leadPaintDisclosure}
                    onCheckedChange={v => updateForm('leadPaintDisclosure', v)}
                  />
                  <div>
                    <Label className="text-white/90">Lead-Based Paint Disclosure</Label>
                    <p className="text-xs text-white/60">Required for all pre-1978 properties (federal requirement)</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                  <Switch
                    checked={formData.moldDisclosure}
                    onCheckedChange={v => updateForm('moldDisclosure', v)}
                  />
                  <div>
                    <Label className="text-white/90">Mold Disclosure</Label>
                    <p className="text-xs text-white/60">Required in CA, NY, WA, OR and recommended everywhere</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                  <Switch
                    checked={formData.bedBugDisclosure}
                    onCheckedChange={v => updateForm('bedBugDisclosure', v)}
                  />
                  <div>
                    <Label className="text-white/90">Bed Bug Disclosure</Label>
                    <p className="text-xs text-white/60">Required in AZ, CA, IL, NY and several other states</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                  <Switch
                    checked={formData.radonDisclosure}
                    onCheckedChange={v => updateForm('radonDisclosure', v)}
                  />
                  <div>
                    <Label className="text-white/90">Radon Disclosure</Label>
                    <p className="text-xs text-white/60">Required in CO, FL, IL and recommended in high-radon areas</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                  <Switch
                    checked={formData.floodZoneDisclosure}
                    onCheckedChange={v => updateForm('floodZoneDisclosure', v)}
                  />
                  <div>
                    <Label className="text-white/90">Flood Zone Disclosure</Label>
                    <p className="text-xs text-white/60">Required if property is in a designated flood zone</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                <p className="text-white/90 text-sm">
                  <strong>Note:</strong> Additional state-specific disclosures and tenant rights notices will be automatically 
                  included in your lease based on the property's state.
                </p>
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Review Your Lease</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/10 rounded-lg border border-white/20 space-y-2">
                  <h4 className="font-medium text-violet-300">Property</h4>
                  <p className="text-white">{property.name}</p>
                  <p className="text-white/70">Unit: {effectiveUnitName}</p>
                </div>
                
                <div className="p-4 bg-white/10 rounded-lg border border-white/20 space-y-2">
                  <h4 className="font-medium text-violet-300">Tenant</h4>
                  <p className="text-white">{tenantName || '[To be assigned]'}</p>
                  <p className="text-white/70">{tenantEmail || ''}</p>
                </div>
                
                <div className="p-4 bg-white/10 rounded-lg border border-white/20 space-y-2">
                  <h4 className="font-medium text-violet-300">Lease Term</h4>
                  <p className="text-white">
                    {formData.isMonthToMonth ? 'Month-to-Month' : `${formData.startDate} to ${formData.endDate}`}
                  </p>
                  <p className="text-white/70">Starts: {formData.startDate}</p>
                </div>
                
                <div className="p-4 bg-white/10 rounded-lg border border-white/20 space-y-2">
                  <h4 className="font-medium text-violet-300">Rent</h4>
                  <p className="text-white">${effectiveRentAmount.toLocaleString()}/month</p>
                  <p className="text-white/70">Due on the {formData.rentDueDay}st</p>
                </div>
                
                <div className="p-4 bg-white/10 rounded-lg border border-white/20 space-y-2">
                  <h4 className="font-medium text-violet-300">Security Deposit</h4>
                  <p className="text-white">${(effectiveRentAmount * formData.securityDepositMonths).toLocaleString()}</p>
                  <p className="text-white/70">{formData.securityDepositMonths} month(s) rent</p>
                </div>
                
                <div className="p-4 bg-white/10 rounded-lg border border-white/20 space-y-2">
                  <h4 className="font-medium text-violet-300">Pets</h4>
                  <p className="text-white">{formData.petsAllowed ? 'Allowed' : 'Not Allowed'}</p>
                  {formData.petsAllowed && formData.petDeposit && (
                    <p className="text-white/70">Deposit: ${formData.petDeposit}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Lease
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="border-white/30 text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="flex gap-2">
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={nextStep} className="bg-violet-600 hover:bg-violet-700">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Lease
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && previewHtml && (
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Lease Preview</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto bg-white rounded-lg">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[70vh] border-0"
                  title="Lease Preview"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
