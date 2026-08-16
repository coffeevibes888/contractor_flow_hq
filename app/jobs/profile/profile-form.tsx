'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const JOB_CATEGORIES = [
  { id: 'property-management', label: 'Property Management' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'virtual-assistant', label: 'Virtual Assistant' },
  { id: 'leasing', label: 'Leasing' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'construction', label: 'Construction' },
  { id: 'landscaping', label: 'Landscaping' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'admin', label: 'Admin & Office' },
  { id: 'other', label: 'Other' },
];

interface ProfileFormProps {
  existingProfile: any | null;
  userName: string;
  userEmail: string;
}

export function JobSeekerProfileForm({ existingProfile, userName, userEmail }: ProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const nameParts = userName.split(' ');

  const [form, setForm] = useState({
    headline: existingProfile?.headline || '',
    bio: existingProfile?.bio || '',
    firstName: existingProfile?.firstName || nameParts[0] || '',
    lastName: existingProfile?.lastName || nameParts.slice(1).join(' ') || '',
    email: existingProfile?.email || userEmail || '',
    phone: existingProfile?.phone || '',
    city: existingProfile?.city || '',
    state: existingProfile?.state || '',
    isAvailable: existingProfile?.isAvailable ?? true,
    desiredJobTypes: existingProfile?.desiredJobTypes || [],
    desiredCategories: existingProfile?.desiredCategories || [],
    desiredSalaryMin: existingProfile?.desiredSalaryMin || '',
    desiredSalaryMax: existingProfile?.desiredSalaryMax || '',
    salaryType: existingProfile?.salaryType || 'yearly',
    skills: existingProfile?.skills?.join(', ') || '',
    certifications: existingProfile?.certifications?.join(', ') || '',
    yearsExperience: existingProfile?.yearsExperience || '',
    education: existingProfile?.education || '',
    resumeUrl: existingProfile?.resumeUrl || '',
    portfolioUrl: existingProfile?.portfolioUrl || '',
    isPublic: existingProfile?.isPublic ?? true,
  });

  const updateForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    setForm(prev => {
      const arr = prev[field as keyof typeof prev] as string[];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  };

  const handleSave = async () => {
    if (!form.headline || !form.firstName || !form.lastName || !form.email) {
      toast.error('Headline, name, and email are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/jobs/seekers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
          certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
          desiredSalaryMin: form.desiredSalaryMin || null,
          desiredSalaryMax: form.desiredSalaryMax || null,
          yearsExperience: form.yearsExperience || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Profile saved successfully!');
        router.push('/jobs?view=seekers');
      } else {
        toast.error(data.error || 'Failed to save profile');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="border-black shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-semibold">Professional Headline *</Label>
            <Input
              value={form.headline}
              onChange={(e) => updateForm('headline', e.target.value)}
              placeholder="e.g. Experienced Property Manager | Licensed Electrician"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold">First Name *</Label>
              <Input value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-semibold">Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-semibold">Phone</Label>
              <Input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold">City</Label>
              <Input value={form.city} onChange={(e) => updateForm('city', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-semibold">State</Label>
              <Input value={form.state} onChange={(e) => updateForm('state', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="font-semibold">Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => updateForm('bio', e.target.value)}
              placeholder="Tell employers about yourself, your experience, and what you're looking for..."
              rows={4}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills & Experience */}
      <Card className="border-black shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg">Skills & Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-semibold">Skills (comma separated)</Label>
            <Input
              value={form.skills}
              onChange={(e) => updateForm('skills', e.target.value)}
              placeholder="e.g. Property Management, HVAC, Plumbing, Excel, QuickBooks"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="font-semibold">Certifications (comma separated)</Label>
            <Input
              value={form.certifications}
              onChange={(e) => updateForm('certifications', e.target.value)}
              placeholder="e.g. EPA 608, OSHA 30, Real Estate License"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold">Years of Experience</Label>
              <Input type="number" value={form.yearsExperience} onChange={(e) => updateForm('yearsExperience', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-semibold">Education</Label>
              <Input value={form.education} onChange={(e) => updateForm('education', e.target.value)} placeholder="e.g. B.S. Business Administration" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold">Resume URL</Label>
              <Input value={form.resumeUrl} onChange={(e) => updateForm('resumeUrl', e.target.value)} placeholder="Link to your resume" className="mt-1" />
            </div>
            <div>
              <Label className="font-semibold">Portfolio URL</Label>
              <Input value={form.portfolioUrl} onChange={(e) => updateForm('portfolioUrl', e.target.value)} placeholder="Link to your portfolio" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-black shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg">Job Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-semibold mb-2 block">Desired Job Types</Label>
            <div className="flex flex-wrap gap-2">
              {['full-time', 'part-time', 'contract', 'temporary', 'internship'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleArrayItem('desiredJobTypes', t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    form.desiredJobTypes.includes(t)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="font-semibold mb-2 block">Desired Categories</Label>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleArrayItem('desiredCategories', cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    form.desiredCategories.includes(cat.id)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="font-semibold">Desired Salary Min</Label>
              <Input type="number" value={form.desiredSalaryMin} onChange={(e) => updateForm('desiredSalaryMin', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-semibold">Desired Salary Max</Label>
              <Input type="number" value={form.desiredSalaryMax} onChange={(e) => updateForm('desiredSalaryMax', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-semibold">Pay Type</Label>
              <select value={form.salaryType} onChange={(e) => updateForm('salaryType', e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="yearly">Per Year</option>
                <option value="hourly">Per Hour</option>
              </select>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => updateForm('isAvailable', e.target.checked)} className="rounded" />
              <span className="text-sm font-semibold">Available for work</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPublic} onChange={(e) => updateForm('isPublic', e.target.checked)} className="rounded" />
              <span className="text-sm font-semibold">Visible to employers</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
