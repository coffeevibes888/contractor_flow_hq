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
  FileText, Users, ClipboardList, Calendar, DollarSign,
  Shield, Scale, FileCheck, Loader2, Eye, Check,
  ChevronRight, ChevronLeft, Plus, X, Hammer,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TRADE_DEFINITIONS, type TradeType, type ContractorContractData } from '@/lib/services/contractor-contract-builder';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ContractorInfo {
  businessName: string;
  legalName: string;
  address: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  insurancePolicy?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  contractor: ContractorInfo;
  onContractGenerated?: (contract: any) => void;
  jobs?: { id: string; title: string; jobNumber: string }[];
}

// ── Steps ──────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'trade', title: 'Trade', icon: Hammer },
  { id: 'parties', title: 'Parties', icon: Users },
  { id: 'scope', title: 'Scope', icon: ClipboardList },
  { id: 'timeline', title: 'Timeline', icon: Calendar },
  { id: 'payment', title: 'Payment', icon: DollarSign },
  { id: 'warranty', title: 'Warranty', icon: Shield },
  { id: 'legal', title: 'Legal Terms', icon: Scale },
  { id: 'review', title: 'Review', icon: FileCheck },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function ContractBuilderModal({ open, onClose, contractor, onContractGenerated, jobs = [] }: Props) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    // Step 0: Trade
    tradeType: 'general' as TradeType,

    // Step 1: Parties
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    jobSiteAddress: '',

    // Step 2: Scope
    jobTitle: '',
    jobDescription: '',
    deliverables: [''] as string[],
    materialsProvidedBy: 'contractor' as 'contractor' | 'customer' | 'mixed',
    permitsProvidedBy: 'contractor' as 'contractor' | 'customer',
    wasteRemovalIncluded: true,
    jobId: '',

    // Step 3: Timeline
    startDate: new Date().toISOString().split('T')[0],
    completionDate: '',
    estimatedHours: '',
    milestones: [] as { name: string; amount: number; description: string }[],

    // Step 4: Payment
    totalAmount: '',
    depositAmount: '',
    retainagePercent: '',
    paymentTerms: 'due_on_completion' as ContractorContractData['paymentTerms'],
    lateFeePercent: '1.5',

    // Step 5: Warranty & Insurance
    warrantyPeriodDays: '90',
    warrantyDescription: '',
    generalLiability: '',
    workersCompIncluded: true,

    // Step 6: Legal
    terminationNoticeDays: '30',
    curePeriodDays: '10',
    disputeResolution: 'arbitration' as 'arbitration' | 'litigation',
    governingState: 'TX',
    subcontractorsAllowed: false,
    additionalTerms: '',
  });

  const trade = TRADE_DEFINITIONS[formData.tradeType] || TRADE_DEFINITIONS.general;

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Deliverables ───────────────────────────────────────────────────────────

  const addDeliverable = () => setFormData(prev => ({ ...prev, deliverables: [...prev.deliverables, ''] }));
  const removeDeliverable = (i: number) => setFormData(prev => ({ ...prev, deliverables: prev.deliverables.filter((_, idx) => idx !== i) }));
  const updateDeliverable = (i: number, val: string) => setFormData(prev => ({ ...prev, deliverables: prev.deliverables.map((d, idx) => idx === i ? val : d) }));

  // ── Milestones ─────────────────────────────────────────────────────────────

  const addMilestone = () => setFormData(prev => ({
    ...prev,
    milestones: [...prev.milestones, { name: '', amount: 0, description: '' }],
  }));
  const removeMilestone = (i: number) => setFormData(prev => ({ ...prev, milestones: prev.milestones.filter((_, idx) => idx !== i) }));
  const updateMilestone = (i: number, field: string, val: any) => setFormData(prev => ({
    ...prev,
    milestones: prev.milestones.map((m, idx) => idx === i ? { ...m, [field]: val } : m),
  }));

  // ── Preview & Generate ─────────────────────────────────────────────────────

  const handlePreview = async () => {
    try {
      const res = await fetch('/api/contractor/contracts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildContractData()),
      });
      if (res.ok) {
        const { html } = await res.json();
        setPreviewHtml(html);
        setShowPreview(true);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Preview failed' });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/contractor/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractData: buildContractData(), jobId: formData.jobId || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Contract generated!' });
        onContractGenerated?.(data.contract);
        onClose();
      } else {
        const err = await res.json();
        toast({ variant: 'destructive', title: 'Failed to generate', description: err.message });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to generate contract' });
    } finally {
      setGenerating(false);
    }
  };

  function buildContractData(): ContractorContractData {
    return {
      contractorLegalName: contractor.legalName,
      contractorBusinessName: contractor.businessName,
      contractorAddress: contractor.address,
      contractorEmail: contractor.email,
      contractorPhone: contractor.phone,
      contractorLicenseNumber: contractor.licenseNumber,
      contractorInsurancePolicy: contractor.insurancePolicy,
      customerName: formData.customerName,
      customerAddress: formData.customerAddress,
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone,
      tradeType: formData.tradeType,
      jobSiteAddress: formData.jobSiteAddress,
      jobTitle: formData.jobTitle,
      jobDescription: formData.jobDescription,
      deliverables: formData.deliverables.filter(Boolean),
      startDate: formData.startDate,
      completionDate: formData.completionDate || undefined,
      estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : undefined,
      milestoneSchedule: formData.milestones.length > 0 ? formData.milestones : undefined,
      totalAmount: Number(formData.totalAmount) || 0,
      depositAmount: formData.depositAmount ? Number(formData.depositAmount) : undefined,
      retainagePercent: formData.retainagePercent ? Number(formData.retainagePercent) : undefined,
      paymentTerms: formData.paymentTerms,
      lateFeePercent: Number(formData.lateFeePercent) || 1.5,
      materialsProvidedBy: formData.materialsProvidedBy,
      permitsProvidedBy: formData.permitsProvidedBy,
      wasteRemovalIncluded: formData.wasteRemovalIncluded,
      warrantyPeriodDays: Number(formData.warrantyPeriodDays) || trade.defaultWarrantyDays,
      warrantyDescription: formData.warrantyDescription,
      generalLiability: formData.generalLiability,
      workersCompIncluded: formData.workersCompIncluded,
      terminationNoticeDays: Number(formData.terminationNoticeDays) || 30,
      curePeriodDays: Number(formData.curePeriodDays) || 10,
      disputeResolution: formData.disputeResolution,
      governingState: formData.governingState,
      subcontractorsAllowed: formData.subcontractorsAllowed,
      additionalTerms: formData.additionalTerms,
      signingDate: new Date(),
    };
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-cyan-800 via-cyan-900 to-slate-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Hammer className="h-5 w-5 text-orange-300" />
            Free Contract Builder
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2 py-4 border-b border-white/10 overflow-x-auto">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'flex flex-col items-center gap-1 transition-colors min-w-0',
                  isActive ? 'text-orange-300' : isComplete ? 'text-emerald-300' : 'text-white/50'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors',
                  isActive ? 'border-orange-300 bg-orange-400/30' :
                  isComplete ? 'border-emerald-300 bg-emerald-400/30' : 'border-white/30'
                )}>
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-[10px] hidden sm:block whitespace-nowrap">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Step 0: Trade Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Select Your Trade</h3>
                <p className="text-sm text-white/60">Choose your trade for industry-specific contract language and compliance requirements.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.entries(TRADE_DEFINITIONS) as [TradeType, typeof trade][]).map(([key, def]) => (
                  <button
                    key={key}
                    onClick={() => updateForm('tradeType', key)}
                    className={cn(
                      'rounded-xl p-4 text-left transition-all border-2',
                      formData.tradeType === key
                        ? 'border-orange-400 bg-orange-400/20 shadow-lg shadow-orange-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    )}
                  >
                    <div className="text-2xl mb-2">{def.icon}</div>
                    <div className="text-sm font-semibold text-white">{def.label}</div>
                    <div className="text-xs text-white/50 mt-1 line-clamp-2">{def.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Parties */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Parties & Job Site</h3>

              {/* Contractor info (pre-filled) */}
              <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                <Label className="text-white/80 text-xs uppercase tracking-wider">Your Info (from profile)</Label>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div className="text-white">{contractor.businessName || contractor.legalName}</div>
                  <div className="text-white/60">{contractor.email}</div>
                  <div className="text-white/60">{contractor.phone}</div>
                  <div className="text-white/60">{contractor.address}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Customer Name *</Label>
                  <Input value={formData.customerName} onChange={e => updateForm('customerName', e.target.value)}
                    placeholder="John Smith" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
                <div>
                  <Label className="text-white/90">Customer Email *</Label>
                  <Input type="email" value={formData.customerEmail} onChange={e => updateForm('customerEmail', e.target.value)}
                    placeholder="john@email.com" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Customer Phone</Label>
                  <Input value={formData.customerPhone} onChange={e => updateForm('customerPhone', e.target.value)}
                    placeholder="(555) 123-4567" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
                <div>
                  <Label className="text-white/90">Customer Address</Label>
                  <Input value={formData.customerAddress} onChange={e => updateForm('customerAddress', e.target.value)}
                    placeholder="123 Main St, City, State ZIP" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
              </div>
              <div>
                <Label className="text-white/90">Job Site Address *</Label>
                <Input value={formData.jobSiteAddress} onChange={e => updateForm('jobSiteAddress', e.target.value)}
                  placeholder="Address where work will be performed" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
              </div>
            </div>
          )}

          {/* Step 2: Scope */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">Scope of Work</h3>
                <span className="text-xs bg-orange-400/20 text-orange-300 px-2 py-0.5 rounded-full">{trade.icon} {trade.label}</span>
              </div>

              <div>
                <Label className="text-white/90">Project Title *</Label>
                <Input value={formData.jobTitle} onChange={e => updateForm('jobTitle', e.target.value)}
                  placeholder="e.g. AC System Replacement" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
              </div>

              <div>
                <Label className="text-white/90">Project Description *</Label>
                <Textarea value={formData.jobDescription} onChange={e => updateForm('jobDescription', e.target.value)} rows={4}
                  placeholder="Describe the work to be performed in detail..." className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
              </div>

              <div>
                <Label className="text-white/90">Deliverables</Label>
                <div className="space-y-2">
                  {formData.deliverables.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-white/40 text-sm w-5">{i + 1}.</span>
                      <Input value={d} onChange={e => updateDeliverable(i, e.target.value)}
                        placeholder={`Deliverable ${i + 1}`} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 flex-1" />
                      {formData.deliverables.length > 1 && (
                        <button onClick={() => removeDeliverable(i)} className="text-white/40 hover:text-red-400"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addDeliverable}
                    className="border-white/20 text-white/70 hover:bg-white/10">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Deliverable
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white/90">Materials Provided By</Label>
                  <Select value={formData.materialsProvidedBy} onValueChange={v => updateForm('materialsProvidedBy', v)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/90">Permits Provided By</Label>
                  <Select value={formData.permitsProvidedBy} onValueChange={v => updateForm('permitsProvidedBy', v)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.wasteRemovalIncluded} onCheckedChange={v => updateForm('wasteRemovalIncluded', v)} />
                    <Label className="text-white/90">Waste Removal</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Timeline */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Timeline</h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white/90">Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={e => updateForm('startDate', e.target.value)}
                    className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white/90">Estimated Completion</Label>
                  <Input type="date" value={formData.completionDate} onChange={e => updateForm('completionDate', e.target.value)}
                    className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white/90">Estimated Hours</Label>
                  <Input type="number" value={formData.estimatedHours} onChange={e => updateForm('estimatedHours', e.target.value)}
                    placeholder="e.g. 40" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
              </div>

              <div>
                <Label className="text-white/90">Milestones (optional)</Label>
                <div className="space-y-3 mt-2">
                  {formData.milestones.map((m, i) => (
                    <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">Milestone {i + 1}</span>
                        <button onClick={() => removeMilestone(i)} className="text-white/40 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={m.name} onChange={e => updateMilestone(i, 'name', e.target.value)}
                          placeholder="Name" className="bg-white/10 border-white/20 text-white text-sm placeholder:text-white/40" />
                        <Input type="number" value={m.amount || ''} onChange={e => updateMilestone(i, 'amount', Number(e.target.value))}
                          placeholder="Amount" className="bg-white/10 border-white/20 text-white text-sm placeholder:text-white/40" />
                        <Input value={m.description} onChange={e => updateMilestone(i, 'description', e.target.value)}
                          placeholder="Description" className="bg-white/10 border-white/20 text-white text-sm placeholder:text-white/40" />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addMilestone}
                    className="border-white/20 text-white/70 hover:bg-white/10">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Milestone
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Payment</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Total Contract Price *</Label>
                  <Input type="number" value={formData.totalAmount} onChange={e => updateForm('totalAmount', e.target.value)}
                    placeholder="0.00" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
                <div>
                  <Label className="text-white/90">Deposit Amount</Label>
                  <Input type="number" value={formData.depositAmount} onChange={e => updateForm('depositAmount', e.target.value)}
                    placeholder="0.00" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white/90">Payment Terms</Label>
                  <Select value={formData.paymentTerms} onValueChange={v => updateForm('paymentTerms', v)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upfront">Upfront</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="due_on_completion">Due on Completion</SelectItem>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_30">Net 30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/90">Retainage %</Label>
                  <Input type="number" value={formData.retainagePercent} onChange={e => updateForm('retainagePercent', e.target.value)}
                    placeholder="0" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
                <div>
                  <Label className="text-white/90">Late Fee % (monthly)</Label>
                  <Input type="number" value={formData.lateFeePercent} onChange={e => updateForm('lateFeePercent', e.target.value)}
                    className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Warranty & Insurance */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Warranty & Insurance</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/90">Warranty Period (days)</Label>
                  <Input type="number" value={formData.warrantyPeriodDays} onChange={e => updateForm('warrantyPeriodDays', e.target.value)}
                    className="bg-white/10 border-white/20 text-white" />
                  <p className="text-xs text-white/40 mt-1">Default for {trade.label}: {trade.defaultWarrantyDays} days</p>
                </div>
                <div>
                  <Label className="text-white/90">General Liability Amount</Label>
                  <Input value={formData.generalLiability} onChange={e => updateForm('generalLiability', e.target.value)}
                    placeholder="$1,000,000 per occurrence" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formData.workersCompIncluded} onCheckedChange={v => updateForm('workersCompIncluded', v)} />
                <Label className="text-white/90">Workers&apos; Compensation Insurance Included</Label>
              </div>
              <div>
                <Label className="text-white/90">Additional Warranty Details (optional)</Label>
                <Textarea value={formData.warrantyDescription} onChange={e => updateForm('warrantyDescription', e.target.value)} rows={3}
                  placeholder="Customize warranty terms..." className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
              </div>
            </div>
          )}

          {/* Step 6: Legal Terms */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Legal Terms</h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white/90">Governing State</Label>
                  <Select value={formData.governingState} onValueChange={v => updateForm('governingState', v)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/90">Termination Notice (days)</Label>
                  <Input type="number" value={formData.terminationNoticeDays} onChange={e => updateForm('terminationNoticeDays', e.target.value)}
                    className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white/90">Cure Period (days)</Label>
                  <Input type="number" value={formData.curePeriodDays} onChange={e => updateForm('curePeriodDays', e.target.value)}
                    className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>

              <div>
                <Label className="text-white/90">Dispute Resolution</Label>
                <div className="flex gap-4 mt-2">
                  {(['arbitration', 'litigation'] as const).map(opt => (
                    <button key={opt} onClick={() => updateForm('disputeResolution', opt)}
                      className={cn(
                        'flex-1 rounded-lg p-3 text-sm font-medium transition-all border-2',
                        formData.disputeResolution === opt
                          ? 'border-orange-400 bg-orange-400/20 text-white'
                          : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                      )}>
                      {opt === 'arbitration' ? 'Binding Arbitration (Recommended)' : 'Litigation'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={formData.subcontractorsAllowed} onCheckedChange={v => updateForm('subcontractorsAllowed', v)} />
                <Label className="text-white/90">Subcontractors Allowed</Label>
              </div>

              <div>
                <Label className="text-white/90">Additional Terms (optional)</Label>
                <Textarea value={formData.additionalTerms} onChange={e => updateForm('additionalTerms', e.target.value)} rows={4}
                  placeholder="Any additional terms or conditions..." className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Review & Generate</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
                  <div className="text-white/40 text-xs uppercase tracking-wider">Trade</div>
                  <div className="text-white font-medium">{trade.icon} {trade.label}</div>

                  <div className="text-white/40 text-xs uppercase tracking-wider mt-3">Customer</div>
                  <div className="text-white">{formData.customerName || '—'}</div>
                  <div className="text-white/60">{formData.customerEmail || '—'}</div>

                  <div className="text-white/40 text-xs uppercase tracking-wider mt-3">Job Site</div>
                  <div className="text-white">{formData.jobSiteAddress || '—'}</div>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
                  <div className="text-white/40 text-xs uppercase tracking-wider">Project</div>
                  <div className="text-white font-medium">{formData.jobTitle || '—'}</div>

                  <div className="text-white/40 text-xs uppercase tracking-wider mt-3">Financial</div>
                  <div className="text-white">Total: ${Number(formData.totalAmount || 0).toLocaleString()}</div>
                  {formData.depositAmount && <div className="text-white/60">Deposit: ${Number(formData.depositAmount).toLocaleString()}</div>}

                  <div className="text-white/40 text-xs uppercase tracking-wider mt-3">Terms</div>
                  <div className="text-white/60">Warranty: {formData.warrantyPeriodDays} days</div>
                  <div className="text-white/60">Dispute: {formData.disputeResolution}</div>
                  <div className="text-white/60">State: {formData.governingState}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handlePreview}
                  className="border-white/20 text-white hover:bg-white/10">
                  <Eye className="h-4 w-4 mr-2" /> Preview Contract
                </Button>
                <Button onClick={handleGenerate} disabled={generating || !formData.customerName || !formData.jobTitle || !formData.totalAmount}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Generate Contract
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}
            className="border-white/20 text-white hover:bg-white/10">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <span className="text-xs text-white/40">Step {currentStep + 1} of {STEPS.length}</span>
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={nextStep}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <div />
          )}
        </div>
      </DialogContent>

      {/* Preview Modal */}
      {showPreview && previewHtml && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Contract Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <iframe srcDoc={previewHtml} className="w-full h-full min-h-[600px] border-0" />
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
