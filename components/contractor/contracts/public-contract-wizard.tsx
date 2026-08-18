'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  FileText, Users, ClipboardList, Calendar, DollarSign,
  Shield, Scale, FileCheck, Loader2, Check, Download,
  ChevronRight, ChevronLeft, Plus, X, Hammer, AlertTriangle,
  CheckCircle, Printer,
} from 'lucide-react';
import { TRADE_DEFINITIONS, type TradeType } from '@/lib/services/contractor-contract-builder';

interface Props {
  onContractGenerated?: () => void;
}

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

export default function PublicContractWizard({ onContractGenerated }: Props) {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user?.id;
  const sessionEmail = session?.user?.email || '';

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contractHtml, setContractHtml] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tradeType: '' as TradeType | '',
    contractorLegalName: '',
    contractorBusinessName: '',
    contractorAddress: '',
    contractorEmail: '',
    contractorPhone: '',
    contractorLicenseNumber: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    jobSiteAddress: '',
    jobTitle: '',
    jobDescription: '',
    deliverables: [''] as string[],
    materialsProvidedBy: 'contractor' as 'contractor' | 'customer' | 'mixed',
    permitsProvidedBy: 'contractor' as 'contractor' | 'customer',
    wasteRemovalIncluded: true,
    startDate: '',
    completionDate: '',
    estimatedHours: '',
    totalAmount: '',
    depositAmount: '',
    paymentTerms: 'due_on_completion' as string,
    lateFeePercent: '1.5',
    warrantyPeriodDays: '90',
    warrantyDescription: '',
    generalLiability: '',
    workersCompIncluded: true,
    terminationNoticeDays: '30',
    curePeriodDays: '10',
    disputeResolution: 'arbitration' as 'arbitration' | 'litigation',
    governingState: 'TX',
    subcontractorsAllowed: false,
    additionalTerms: '',
    emailGate: '',
  });

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const addDeliverable = () => setFormData(prev => ({ ...prev, deliverables: [...prev.deliverables, ''] }));
  const removeDeliverable = (i: number) => setFormData(prev => ({ ...prev, deliverables: prev.deliverables.filter((_, idx) => idx !== i) }));
  const updateDeliverable = (i: number, val: string) => setFormData(prev => ({ ...prev, deliverables: prev.deliverables.map((d, idx) => idx === i ? val : d) }));

  const validateStep = (): string | null => {
    switch (currentStep) {
      case 0: if (!formData.tradeType) return 'Please select your trade.'; break;
      case 1:
        if (!formData.contractorLegalName.trim()) return 'Your name or business name is required.';
        if (!formData.customerName.trim()) return 'Customer name is required.';
        break;
      case 2:
        if (!formData.jobTitle.trim()) return 'Job title / project name is required.';
        break;
      case 4:
        if (!formData.totalAmount || Number(formData.totalAmount) <= 0) return 'Total contract amount is required.';
        break;
      case 7:
        if (!isSignedIn && !formData.emailGate.trim()) return 'Email is required to generate your free contract.';
        if (!isSignedIn && !formData.emailGate.includes('@')) return 'Please enter a valid email.';
        break;
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    if (currentStep < 7) setCurrentStep(s => s + 1);
    else handleGenerate();
  };

  const prevStep = () => {
    setError('');
    setCurrentStep(s => Math.max(0, s - 1));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/contract/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          emailGate: isSignedIn ? sessionEmail : formData.emailGate,
          totalAmount: Number(formData.totalAmount),
          depositAmount: formData.depositAmount ? Number(formData.depositAmount) : undefined,
          estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : undefined,
          warrantyPeriodDays: Number(formData.warrantyPeriodDays),
          terminationNoticeDays: Number(formData.terminationNoticeDays),
          curePeriodDays: Number(formData.curePeriodDays),
          lateFeePercent: Number(formData.lateFeePercent),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Something went wrong.');
        return;
      }
      setContractHtml(json.html);
      onContractGenerated?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success: Contract generated ───────────────────────────────────────────
  if (contractHtml) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-white" />
            <h2 className="text-lg font-bold text-white">Your Contract is Ready!</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => {
                const w = window.open('', '_blank');
                if (w) { w.document.write(contractHtml); w.document.close(); w.print(); }
              }}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </button>
            <a
              href={`/sign-up?role=contractor&utm_source=free_contract&utm_medium=success_cta`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <FileText className="h-4 w-4" /> Send for E-Signature (Free)
            </a>
          </div>
          <p className="text-xs text-gray-500">
            Start a free 14-day trial to send this contract for e-signature, manage jobs, send invoices, and track payments — all in one place.
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
            <iframe srcDoc={contractHtml} className="w-full min-h-[600px] border-0" title="Contract Preview" />
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard UI ────────────────────────────────────────────────────────────
  const trade = formData.tradeType ? TRADE_DEFINITIONS[formData.tradeType] : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <Hammer className="h-6 w-6 text-orange-400" />
          <h2 className="text-lg font-bold text-white">Free Contract Builder</h2>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                    currentStep > i ? 'bg-orange-500 text-white' : currentStep === i ? 'bg-orange-500 text-white ring-4 ring-orange-500/30' : 'bg-slate-600 text-slate-400'
                  }`}>
                    {currentStep > i ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`mt-1 text-[10px] font-medium hidden sm:block ${currentStep === i ? 'text-orange-400' : 'text-slate-500'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-4 ${currentStep > i ? 'bg-orange-500' : 'bg-slate-600'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Step 0: Trade Selection */}
        {currentStep === 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Select Your Trade</h3>
            <p className="text-sm text-gray-500 mb-4">Choose your trade for industry-specific contract language and compliance requirements.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.entries(TRADE_DEFINITIONS) as [TradeType, any][]).map(([key, def]) => (
                <button
                  key={key}
                  onClick={() => updateForm('tradeType', key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.tradeType === key
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/30'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-lg mb-1 block">{def.icon}</span>
                  <p className="text-sm font-semibold text-gray-900">{def.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{def.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Parties */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Contractor & Customer</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contractor (You)</p>
                <Field label="Legal Name / Business Name *" value={formData.contractorLegalName} onChange={v => updateForm('contractorLegalName', v)} placeholder="Your LLC or full name" />
                <Field label="Business Name (DBA)" value={formData.contractorBusinessName} onChange={v => updateForm('contractorBusinessName', v)} placeholder="Optional" />
                <Field label="Email" value={formData.contractorEmail} onChange={v => updateForm('contractorEmail', v)} placeholder="you@company.com" type="email" />
                <Field label="Phone" value={formData.contractorPhone} onChange={v => updateForm('contractorPhone', v)} placeholder="(555) 123-4567" />
                <Field label="License #" value={formData.contractorLicenseNumber} onChange={v => updateForm('contractorLicenseNumber', v)} placeholder="Optional" />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</p>
                <Field label="Customer Name *" value={formData.customerName} onChange={v => updateForm('customerName', v)} placeholder="Full name or company" />
                <Field label="Customer Email" value={formData.customerEmail} onChange={v => updateForm('customerEmail', v)} placeholder="customer@email.com" type="email" />
                <Field label="Customer Phone" value={formData.customerPhone} onChange={v => updateForm('customerPhone', v)} placeholder="(555) 987-6543" />
                <Field label="Customer Address" value={formData.customerAddress} onChange={v => updateForm('customerAddress', v)} placeholder="Street address" />
                <Field label="Job Site Address" value={formData.jobSiteAddress} onChange={v => updateForm('jobSiteAddress', v)} placeholder="Where work will be performed" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Scope */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Scope of Work</h3>
            <Field label="Project Title *" value={formData.jobTitle} onChange={v => updateForm('jobTitle', v)} placeholder="e.g. Kitchen Remodel, HVAC Installation" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={formData.jobDescription} onChange={e => updateForm('jobDescription', e.target.value)} rows={3} placeholder="Describe the work to be performed..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deliverables</label>
              {formData.deliverables.map((d, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={d} onChange={e => updateDeliverable(i, e.target.value)} placeholder={`Deliverable ${i + 1}`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  {formData.deliverables.length > 1 && (
                    <button onClick={() => removeDeliverable(i)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
              <button onClick={addDeliverable} className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Add deliverable
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SelectField label="Materials provided by" value={formData.materialsProvidedBy} onChange={v => updateForm('materialsProvidedBy', v)}
                options={[['contractor','Contractor'],['customer','Customer'],['mixed','Both']]} />
              <SelectField label="Permits handled by" value={formData.permitsProvidedBy} onChange={v => updateForm('permitsProvidedBy', v)}
                options={[['contractor','Contractor'],['customer','Customer']]} />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={formData.wasteRemovalIncluded} onChange={e => updateForm('wasteRemovalIncluded', e.target.checked)} className="rounded" />
                  Waste removal included
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Timeline */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Timeline</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Start Date" value={formData.startDate} onChange={v => updateForm('startDate', v)} type="date" />
              <Field label="Completion Date" value={formData.completionDate} onChange={v => updateForm('completionDate', v)} type="date" />
              <Field label="Estimated Hours" value={formData.estimatedHours} onChange={v => updateForm('estimatedHours', v)} type="number" placeholder="e.g. 40" />
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Payment Terms</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Total Contract Amount *" value={formData.totalAmount} onChange={v => updateForm('totalAmount', v)} type="number" placeholder="e.g. 15000" />
              <Field label="Deposit Amount" value={formData.depositAmount} onChange={v => updateForm('depositAmount', v)} type="number" placeholder="Optional" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <SelectField label="Payment Terms" value={formData.paymentTerms} onChange={v => updateForm('paymentTerms', v)}
                options={[['due_on_completion','Due on Completion'],['upfront','Full Upfront'],['milestone','Milestone-Based'],['net_15','Net 15'],['net_30','Net 30']]} />
              <Field label="Late Fee %" value={formData.lateFeePercent} onChange={v => updateForm('lateFeePercent', v)} type="number" placeholder="1.5" />
            </div>
          </div>
        )}

        {/* Step 5: Warranty */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Warranty & Insurance</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Warranty Period (days)" value={formData.warrantyPeriodDays} onChange={v => updateForm('warrantyPeriodDays', v)} type="number" />
              <Field label="General Liability Amount" value={formData.generalLiability} onChange={v => updateForm('generalLiability', v)} placeholder="e.g. $1,000,000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Description (optional)</label>
              <textarea value={formData.warrantyDescription} onChange={e => updateForm('warrantyDescription', e.target.value)} rows={2} placeholder="What does the warranty cover?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={formData.workersCompIncluded} onChange={e => updateForm('workersCompIncluded', e.target.checked)} className="rounded" />
              Workers&apos; Compensation included
            </label>
          </div>
        )}

        {/* Step 6: Legal Terms */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Legal Terms</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <SelectField label="Governing State" value={formData.governingState} onChange={v => updateForm('governingState', v)}
                options={US_STATES.map(s => [s, s])} />
              <Field label="Termination Notice (days)" value={formData.terminationNoticeDays} onChange={v => updateForm('terminationNoticeDays', v)} type="number" />
              <Field label="Cure Period (days)" value={formData.curePeriodDays} onChange={v => updateForm('curePeriodDays', v)} type="number" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <SelectField label="Dispute Resolution" value={formData.disputeResolution} onChange={v => updateForm('disputeResolution', v)}
                options={[['arbitration','Binding Arbitration'],['litigation','Court Litigation']]} />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={formData.subcontractorsAllowed} onChange={e => updateForm('subcontractorsAllowed', e.target.checked)} className="rounded" />
                  Subcontractors allowed
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Terms (optional)</label>
              <textarea value={formData.additionalTerms} onChange={e => updateForm('additionalTerms', e.target.value)} rows={3} placeholder="Any extra clauses..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
        )}

        {/* Step 7: Review & Generate */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Review & Generate</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Contractor</p>
                <p className="font-medium text-gray-900">{formData.contractorBusinessName || formData.contractorLegalName}</p>
                <p className="text-gray-600">{trade?.label || 'General'}</p>
                <p className="text-xs font-bold text-gray-400 uppercase mt-3">Customer</p>
                <p className="font-medium text-gray-900">{formData.customerName}</p>
                <p className="text-gray-600">{formData.jobSiteAddress || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Project</p>
                <p className="font-medium text-gray-900">{formData.jobTitle}</p>
                <p className="text-xs font-bold text-gray-400 uppercase mt-3">Financial</p>
                <p className="text-gray-900">Total: ${Number(formData.totalAmount || 0).toLocaleString()}</p>
                {formData.depositAmount && <p className="text-gray-600">Deposit: ${Number(formData.depositAmount).toLocaleString()}</p>}
                <p className="text-xs font-bold text-gray-400 uppercase mt-3">Terms</p>
                <p className="text-gray-600">Warranty: {formData.warrantyPeriodDays} days · {formData.disputeResolution} · {formData.governingState}</p>
              </div>
            </div>

            {isSignedIn ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Signed in as {sessionEmail}</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Unlimited contracts · E-signatures included</p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email Address *</label>
                <input type="email" value={formData.emailGate} onChange={e => updateForm('emailGate', e.target.value)} placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <p className="mt-1.5 text-xs text-gray-500">One free contract per email. No spam — just your contract and a free trial offer.</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
        <button onClick={prevStep} disabled={currentStep === 0}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-xs text-gray-400">Step {currentStep + 1} of {STEPS.length}</span>
        <button onClick={nextStep} disabled={loading}
          className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
          ) : currentStep === 7 ? (
            <><Download className="h-4 w-4" /> Generate Free Contract</>
          ) : (
            <>Next <ChevronRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Reusable field components ───────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </div>
  );
}
