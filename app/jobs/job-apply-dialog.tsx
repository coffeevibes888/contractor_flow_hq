'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase, MapPin, DollarSign, Building2, Clock, Users,
  Star, CheckCircle, Loader2, Send, ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

const JOB_TYPES: Record<string, string> = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  'contract': 'Contract',
  'temporary': 'Temporary',
  'internship': 'Internship',
};

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  executive: 'Executive',
};

interface Job {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  location: string;
  isRemote: boolean;
  salary: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryType: string;
  companyName: string | null;
  companyLogo: string | null;
  experienceLevel: string;
  requirements: string | null;
  benefits: string | null;
  views: number;
  applicantCount: number;
  createdAt: string;
}

interface JobApplyDialogProps {
  job: Job;
  onClose: () => void;
}

export function JobApplyDialog({ job, onClose }: JobApplyDialogProps) {
  const [step, setStep] = useState<'details' | 'apply' | 'success'>('details');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
    resumeUrl: '',
  });

  const formatSalary = (min: string | null, max: string | null, type: string) => {
    const suffix = type === 'hourly' ? '/hr' : type === 'yearly' ? '/yr' : '';
    if (min && max) return `$${parseFloat(min).toLocaleString()} - $${parseFloat(max).toLocaleString()}${suffix}`;
    if (min) return `From $${parseFloat(min).toLocaleString()}${suffix}`;
    if (max) return `Up to $${parseFloat(max!).toLocaleString()}${suffix}`;
    return null;
  };

  const handleApply = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep('success');
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'details' && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-4">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt="" className="h-14 w-14 rounded-xl object-cover border" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl font-bold">
                    {(job.companyName || 'J').charAt(0)}
                  </div>
                )}
                <div>
                  <DialogTitle className="text-xl">{job.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1">
                    {job.companyName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" /> {job.companyName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.location}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-semibold">{JOB_TYPES[job.type] || job.type}</Badge>
                <Badge variant="outline" className="font-semibold">{EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel}</Badge>
                {job.isRemote && <Badge className="bg-cyan-100 text-cyan-700 font-semibold">Remote</Badge>}
              </div>

              {/* Salary */}
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryType) && (
                <div className="flex items-center gap-2 text-lg font-bold text-emerald-600">
                  <DollarSign className="h-5 w-5" />
                  {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-2">Description</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.description}</p>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">Requirements</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.requirements}</p>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">Benefits</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.benefits}</p>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-slate-500 pt-2 border-t">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={() => setStep('apply')}>
                <Send className="h-4 w-4 mr-2" /> Apply Now
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'apply' && (
          <>
            <DialogHeader>
              <DialogTitle>Apply to {job.title}</DialogTitle>
              <DialogDescription>
                at {job.companyName || 'this company'} • {job.location}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@example.com"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="font-semibold">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="font-semibold">Resume URL</Label>
                <Input
                  value={form.resumeUrl}
                  onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                  placeholder="https://drive.google.com/your-resume"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Link to your resume (Google Drive, Dropbox, etc.)</p>
              </div>
              <div>
                <Label className="font-semibold">Cover Letter</Label>
                <Textarea
                  value={form.coverLetter}
                  onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                  placeholder="Tell the employer why you're a great fit for this role..."
                  rows={5}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                onClick={handleApply}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Application
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
              <p className="text-slate-600 mb-6">
                Your application for <strong>{job.title}</strong> at {job.companyName} has been sent.
                The employer will review it and reach out if interested.
              </p>
              <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                Back to Jobs
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
