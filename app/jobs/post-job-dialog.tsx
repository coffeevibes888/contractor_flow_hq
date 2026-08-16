'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Briefcase, Building2, CheckCircle, ChevronLeft, ChevronRight,
  DollarSign, ListChecks, Loader2, MapPin, Send, Sparkles,
  Wrench, Headphones, FileText, Calculator, HardHat, Leaf,
  Home, Monitor, Settings,
} from 'lucide-react';
import { toast } from 'sonner';

const WIZARD_STEPS = [
  { id: 'basics', title: 'Job Basics', icon: Briefcase },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'compensation', title: 'Compensation', icon: DollarSign },
  { id: 'details', title: 'Details', icon: ListChecks },
  { id: 'company', title: 'Company', icon: Building2 },
];

const JOB_CATEGORIES = [
  { id: 'property-management', label: 'Property Management', icon: Building2 },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'virtual-assistant', label: 'Virtual Assistant', icon: Headphones },
  { id: 'leasing', label: 'Leasing', icon: FileText },
  { id: 'accounting', label: 'Accounting', icon: Calculator },
  { id: 'construction', label: 'Construction', icon: HardHat },
  { id: 'landscaping', label: 'Landscaping', icon: Leaf },
  { id: 'cleaning', label: 'Cleaning', icon: Home },
  { id: 'admin', label: 'Admin & Office', icon: Monitor },
  { id: 'other', label: 'Other', icon: Settings },
];

interface PostJobDialogProps {
  onClose: () => void;
  onJobPosted: (job: any) => void;
}

export function PostJobDialog({ onClose, onJobPosted }: PostJobDialogProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'general',
    type: 'full-time',
    experienceLevel: 'entry',
    location: '',
    isRemote: false,
    salaryMin: '',
    salaryMax: '',
    salaryType: 'yearly',
    benefits: '',
    description: '',
    requirements: '',
    companyName: '',
    companyAbout: '',
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const canAdvance = () => {
    switch (step) {
      case 0: return !!form.title && !!form.category && !!form.type;
      case 1: return !!form.location;
      case 2: return true;
      case 3: return !!form.description;
      case 4: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.location) {
      toast.error('Title, description, and location are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salaryMin: form.salaryMin || null,
          salaryMax: form.salaryMax || null,
          status: 'active',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        onJobPosted({
          ...data.job,
          salaryMin: data.job.salaryMin?.toString() || null,
          salaryMax: data.job.salaryMax?.toString() || null,
          applicantCount: 0,
          createdAt: data.job.createdAt,
        });
      } else {
        toast.error(data.error || 'Failed to post job');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogTitle className="sr-only">Job Posted</DialogTitle>
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Job Posted!</h3>
            <p className="text-slate-600 mb-6">
              Your job listing is now live. Applicants will be able to find and apply to it.
            </p>
            <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Post a Job
          </DialogTitle>
          <DialogDescription>
            Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step].title} — It&apos;s free.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-1 py-2">
          {WIZARD_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 ${i === step
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : i < step
                      ? 'bg-emerald-50 text-emerald-600 cursor-pointer hover:bg-emerald-100'
                      : 'text-slate-400'
                  }`}
              >
                {i < step ? (
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className="hidden sm:inline truncate">{s.title}</span>
              </button>
            );
          })}
        </div>

        <div className="py-4 min-h-[280px]">
          {/* Step 1: Basics */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700">Job Title *</label>
                <Input
                  placeholder="e.g. Property Manager, Maintenance Technician, Virtual Assistant"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {JOB_CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => update('category', cat.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${form.category === cat.id
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <CatIcon className="h-4 w-4 flex-shrink-0" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Employment Type</label>
                  <select value={form.type} onChange={(e) => update('type', e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm">
                    <option value="full-time">Full-Time</option>
                    <option value="part-time">Part-Time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Experience Level</label>
                  <select value={form.experienceLevel} onChange={(e) => update('experienceLevel', e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm">
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700">Location *</label>
                <Input
                  placeholder="e.g. Austin, TX or Multiple Locations"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  className="mt-1 h-11"
                />
                <p className="text-xs text-slate-500 mt-1">City, State or &quot;Remote&quot;</p>
              </div>
              <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.isRemote}
                  onChange={(e) => update('isRemote', e.target.checked)}
                  className="rounded border-slate-300 h-5 w-5"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Remote friendly</p>
                  <p className="text-xs text-slate-500">This position can be done remotely or has a hybrid option</p>
                </div>
              </label>
            </div>
          )}

          {/* Step 3: Compensation */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700">Pay Type</label>
                <div className="flex gap-2 mt-2">
                  {[
                    { value: 'yearly', label: 'Annual Salary' },
                    { value: 'hourly', label: 'Hourly Rate' },
                    { value: 'per-project', label: 'Per Project' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update('salaryType', opt.value)}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${form.salaryType === opt.value
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Minimum {form.salaryType === 'hourly' ? '($/hr)' : form.salaryType === 'yearly' ? '($/yr)' : '($)'}
                  </label>
                  <Input type="number" placeholder={form.salaryType === 'hourly' ? '18' : '40000'} value={form.salaryMin} onChange={(e) => update('salaryMin', e.target.value)} className="mt-1 h-11" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Maximum {form.salaryType === 'hourly' ? '($/hr)' : form.salaryType === 'yearly' ? '($/yr)' : '($)'}
                  </label>
                  <Input type="number" placeholder={form.salaryType === 'hourly' ? '25' : '65000'} value={form.salaryMax} onChange={(e) => update('salaryMax', e.target.value)} className="mt-1 h-11" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Benefits</label>
                <Textarea
                  placeholder="e.g. Health insurance, 401k match, PTO, flexible schedule, company vehicle..."
                  value={form.benefits}
                  onChange={(e) => update('benefits', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 4: Description & Requirements */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700">Job Description *</label>
                <Textarea
                  placeholder="Describe the role, day-to-day responsibilities, team structure, and what success looks like..."
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="mt-1"
                  rows={6}
                />
                <p className="text-xs text-slate-500 mt-1">Tip: Be specific about responsibilities. Good descriptions attract better candidates.</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Requirements</label>
                <Textarea
                  placeholder="e.g. 3+ years property management experience, real estate license preferred, proficiency in Yardi or AppFolio..."
                  value={form.requirements}
                  onChange={(e) => update('requirements', e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 5: Company Info + Review */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-emerald-700">
                  This info helps candidates learn about your company. If left blank, your account name will be used.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Company / Business Name</label>
                <Input placeholder="Your company name" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} className="mt-1 h-11" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">About the Company</label>
                <Textarea
                  placeholder="Tell candidates about your company, culture, mission..."
                  value={form.companyAbout}
                  onChange={(e) => update('companyAbout', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              {/* Review Summary */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-sm font-bold text-slate-800">Review</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-slate-500">Title:</span>
                  <span className="font-medium">{form.title || '—'}</span>
                  <span className="text-slate-500">Type:</span>
                  <span>{form.type} · {form.experienceLevel}</span>
                  <span className="text-slate-500">Location:</span>
                  <span>{form.location || '—'} {form.isRemote && '(Remote)'}</span>
                  <span className="text-slate-500">Salary:</span>
                  <span>
                    {form.salaryMin || form.salaryMax
                      ? `$${form.salaryMin || '?'} – $${form.salaryMax || '?'} ${form.salaryType}`
                      : 'Not specified'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            {step < WIZARD_STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!form.title || !form.description || !form.location || submitting} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Publish Job
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
