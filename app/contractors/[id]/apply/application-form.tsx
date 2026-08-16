'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Upload, File, X, Loader2, CheckCircle2, AlertCircle, Briefcase, MapPin, DollarSign,
} from 'lucide-react';
import { UploadButton } from '@/lib/uploadthing';
import { toast } from '@/hooks/use-toast';

interface HiringPost {
  id: string;
  title: string;
  description: string;
  employeeType: string;
  payType: string;
  payRangeMin: string | null;
  payRangeMax: string | null;
  requiredSkills: string[];
  requiredCerts: string[];
  experienceYears: number | null;
  driversLicense: boolean;
  backgroundCheck: boolean;
  requireResume: boolean;
  requireId: boolean;
  customQuestions: { question: string; required: boolean }[] | null;
  city: string | null;
  state: string | null;
}

interface Props {
  contractor: { id: string; businessName: string };
  posts: HiringPost[];
  selectedPostId: string;
}

export default function HiringApplicationForm({ contractor, posts, selectedPostId }: Props) {
  const [currentPostId, setCurrentPostId] = useState(selectedPostId);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [certifications, setCertifications] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});

  // Document URLs (from UploadThing)
  const [resumeUrl, setResumeUrl] = useState('');
  const [governmentIdUrl, setGovernmentIdUrl] = useState('');
  const [governmentIdBackUrl, setGovernmentIdBackUrl] = useState('');
  const [additionalDocs, setAdditionalDocs] = useState<string[]>([]);

  const currentPost = posts.find((p) => p.id === currentPostId) || posts[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/contractor/hiring/${currentPost.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, email, phone, address, city, state, zipCode,
          yearsExperience: yearsExperience || undefined,
          skills: skills ? skills.split(',').map((s) => s.trim()) : [],
          certifications: certifications ? certifications.split(',').map((c) => c.trim()) : [],
          licenseNumber: licenseNumber || undefined,
          licenseState: licenseState || undefined,
          resumeUrl: resumeUrl || undefined,
          governmentIdUrl: governmentIdUrl || undefined,
          governmentIdBackUrl: governmentIdBackUrl || undefined,
          additionalDocs,
          coverLetter: coverLetter || undefined,
          customAnswers: currentPost.customQuestions
            ? currentPost.customQuestions.map((q, i) => ({ question: q.question, answer: customAnswers[i] || '' }))
            : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        toast({ title: 'Application submitted!', description: data.message });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to submit', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Application Submitted</h2>
          <p className="text-muted-foreground">
            Thank you for applying to {contractor.businessName}. You will be contacted at {email}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Position selector */}
      {posts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Position</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={currentPostId} onValueChange={setCurrentPostId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {posts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Position details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {currentPost.title}
          </CardTitle>
          <CardDescription>{currentPost.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline">{currentPost.employeeType === 'w2' ? 'W-2 Employee' : currentPost.employeeType === '1099' ? '1099 Contractor' : 'Subcontractor'}</Badge>
          <Badge variant="outline">{currentPost.payType}</Badge>
          {currentPost.payRangeMin && (
            <Badge variant="outline" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {currentPost.payRangeMin}{currentPost.payRangeMax ? ` - ${currentPost.payRangeMax}` : '+'}
              {currentPost.payType === 'hourly' ? '/hr' : '/yr'}
            </Badge>
          )}
          {currentPost.city && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{currentPost.city}, {currentPost.state}
            </Badge>
          )}
          {currentPost.backgroundCheck && <Badge variant="secondary">Background check required</Badge>}
          {currentPost.driversLicense && <Badge variant="secondary">Driver&apos;s license required</Badge>}
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Professional Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="yearsExperience">Years of Experience</Label>
              <Input id="yearsExperience" type="number" min="0" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input id="licenseNumber" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="If applicable" />
            </div>
          </div>
          <div>
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Pipe fitting, Soldering, PEX installation" />
          </div>
          <div>
            <Label htmlFor="certifications">Certifications (comma-separated)</Label>
            <Input id="certifications" value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="e.g. EPA 608, OSHA 30" />
          </div>
          <div>
            <Label htmlFor="coverLetter">Cover Letter / Why you want this job</Label>
            <Textarea id="coverLetter" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={4} placeholder="Tell us about yourself and why you'd be a great fit..." />
          </div>
        </CardContent>
      </Card>

      {/* Document uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents</CardTitle>
          <CardDescription>Upload required documents. Accepted formats: JPEG, PNG, PDF (max 10MB each)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Government ID */}
          <div>
            <Label className="mb-2 block">
              Government-Issued ID (Front) {currentPost.requireId && <span className="text-red-500">*</span>}
            </Label>
            {governmentIdUrl ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-emerald-700 flex-1">ID front uploaded</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setGovernmentIdUrl('')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <UploadButton
                endpoint="hiringDocuments"
                onClientUploadComplete={(res) => {
                  if (res?.[0]) setGovernmentIdUrl(res[0].ufsUrl || res[0].url);
                }}
                onUploadError={(err) => {
                  toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                }}
              />
            )}
          </div>

          {/* Government ID Back */}
          <div>
            <Label className="mb-2 block">Government-Issued ID (Back)</Label>
            {governmentIdBackUrl ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-emerald-700 flex-1">ID back uploaded</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setGovernmentIdBackUrl('')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <UploadButton
                endpoint="hiringDocuments"
                onClientUploadComplete={(res) => {
                  if (res?.[0]) setGovernmentIdBackUrl(res[0].ufsUrl || res[0].url);
                }}
                onUploadError={(err) => {
                  toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                }}
              />
            )}
          </div>

          {/* Resume */}
          {(currentPost.requireResume || true) && (
            <div>
              <Label className="mb-2 block">
                Resume {currentPost.requireResume && <span className="text-red-500">*</span>}
              </Label>
              {resumeUrl ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm text-emerald-700 flex-1">Resume uploaded</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setResumeUrl('')}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <UploadButton
                  endpoint="hiringDocuments"
                  onClientUploadComplete={(res) => {
                    if (res?.[0]) setResumeUrl(res[0].ufsUrl || res[0].url);
                  }}
                  onUploadError={(err) => {
                    toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                  }}
                />
              )}
            </div>
          )}

          {/* Additional documents */}
          <div>
            <Label className="mb-2 block">Additional Documents (W-4, I-9, certifications, etc.)</Label>
            {additionalDocs.length > 0 && (
              <div className="space-y-2 mb-3">
                {additionalDocs.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">Document {i + 1}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalDocs((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <UploadButton
              endpoint="hiringDocuments"
              onClientUploadComplete={(res) => {
                if (res) setAdditionalDocs((prev) => [...prev, ...res.map((r) => r.ufsUrl || r.url)]);
              }}
              onUploadError={(err) => {
                toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom questions */}
      {currentPost.customQuestions && currentPost.customQuestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Additional Questions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {currentPost.customQuestions.map((q, i) => (
              <div key={i}>
                <Label>
                  {q.question} {q.required && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  value={customAnswers[i] || ''}
                  onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                  required={q.required}
                  rows={3}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <Button type="submit" size="lg" className="w-full font-bold" disabled={submitting}>
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
        ) : (
          'Submit Application'
        )}
      </Button>
    </form>
  );
}
