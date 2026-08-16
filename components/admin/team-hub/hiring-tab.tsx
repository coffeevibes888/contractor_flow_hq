'use client';

import { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, Users, FileText, CheckCircle, 
  XCircle, Clock, Mail, Phone, MapPin, Calendar,
  ChevronRight, ChevronLeft, Eye, Trash2, Edit, Send, Loader2,
  Building2, DollarSign, GraduationCap, ListChecks, Sparkles,
  Monitor, HardHat, Wrench, Leaf, Home, Calculator, Headphones, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  type: 'full-time' | 'part-time' | 'contract';
  location: string;
  salary?: string;
  status: 'draft' | 'active' | 'closed';
  applicantCount: number;
  createdAt: string;
}

interface Applicant {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: 'new' | 'reviewing' | 'interview' | 'offered' | 'hired' | 'rejected';
  appliedAt: string;
  job?: { id: string; title: string };
}

interface HiringTabProps {
  landlordId: string;
}

export function HiringTab({ landlordId }: HiringTabProps) {
  const [activeTab, setActiveTab] = useState('postings');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showApplicantDetails, setShowApplicantDetails] = useState<Applicant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  // New job wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const [newJob, setNewJob] = useState({
    // Step 1: Basics
    title: '',
    category: 'general',
    type: 'full-time',
    experienceLevel: 'entry',
    // Step 2: Location & Schedule
    location: '',
    isRemote: false,
    // Step 3: Compensation
    salaryMin: '',
    salaryMax: '',
    salaryType: 'yearly',
    benefits: '',
    // Step 4: Description & Requirements
    description: '',
    requirements: '',
    // Step 5: Company Info
    companyName: '',
    companyAbout: '',
  });

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

  const canAdvance = () => {
    switch (wizardStep) {
      case 0: return !!newJob.title && !!newJob.category && !!newJob.type;
      case 1: return !!newJob.location;
      case 2: return true; // salary is optional
      case 3: return !!newJob.description;
      case 4: return true; // company info optional
      default: return false;
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [jobsRes, applicantsRes] = await Promise.all([
        fetch('/api/landlord/hiring/jobs'),
        fetch('/api/landlord/hiring/applicants'),
      ]);
      
      const jobsData = await jobsRes.json();
      const applicantsData = await applicantsRes.json();
      
      if (jobsData.success) {
        setJobPostings(jobsData.jobs);
      }
      if (applicantsData.success) {
        setApplicants(applicantsData.applicants);
      }
    } catch (error) {
      console.error('Failed to fetch hiring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.description || !newJob.location) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/landlord/hiring/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newJob,
          salaryMin: newJob.salaryMin || null,
          salaryMax: newJob.salaryMax || null,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setJobPostings([{ ...data.job, applicantCount: 0 }, ...jobPostings]);
        setShowCreateJob(false);
        setWizardStep(0);
        setNewJob({
          title: '', category: 'general', type: 'full-time', experienceLevel: 'entry',
          location: '', isRemote: false,
          salaryMin: '', salaryMax: '', salaryType: 'yearly', benefits: '',
          description: '', requirements: '',
          companyName: '', companyAbout: '',
        });
      } else {
        alert(data.message || 'Failed to create job');
      }
    } catch {
      alert('Failed to create job');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/landlord/hiring/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json();
      
      if (data.success) {
        setJobPostings(jobPostings.map(j => 
          j.id === jobId ? { ...j, status: 'active' } : j
        ));
      } else {
        alert(data.message || 'Failed to publish job');
      }
    } catch {
      alert('Failed to publish job');
    }
  };

  const handleCloseJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/landlord/hiring/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const data = await res.json();
      
      if (data.success) {
        setJobPostings(jobPostings.map(j => 
          j.id === jobId ? { ...j, status: 'closed' } : j
        ));
      }
    } catch {
      alert('Failed to close job');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting? This will also delete all applicants.')) return;
    
    try {
      const res = await fetch(`/api/landlord/hiring/jobs/${jobId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setJobPostings(jobPostings.filter(j => j.id !== jobId));
        setApplicants(applicants.filter(a => a.jobId !== jobId));
      } else {
        alert(data.message || 'Failed to delete job');
      }
    } catch {
      alert('Failed to delete job');
    }
  };

  const handleUpdateApplicantStatus = async (applicantId: string, status: Applicant['status']) => {
    try {
      const res = await fetch(`/api/landlord/hiring/applicants/${applicantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      
      if (data.success) {
        setApplicants(applicants.map(a => 
          a.id === applicantId ? { ...a, status } : a
        ));
        if (showApplicantDetails?.id === applicantId) {
          setShowApplicantDetails({ ...showApplicantDetails, status });
        }
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch {
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status: Applicant['status']) => {
    const config = {
      new: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'New' },
      reviewing: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Reviewing' },
      interview: { bg: 'bg-violet-500/20', text: 'text-violet-400', label: 'Interview' },
      offered: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Offered' },
      hired: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Hired' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
    };
    const c = config[status];
    return <Badge className={`${c.bg} ${c.text} border-0`}>{c.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <TabsList className="bg-slate-900/60 border border-white/10">
            <TabsTrigger value="postings" className="data-[state=active]:bg-emerald-600">
              <Briefcase className="h-4 w-4 mr-2" />
              Job Postings
            </TabsTrigger>
            <TabsTrigger value="applicants" className="data-[state=active]:bg-emerald-600">
              <Users className="h-4 w-4 mr-2" />
              Applicants
              {applicants.filter(a => a.status === 'new').length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">
                  {applicants.filter(a => a.status === 'new').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <Button 
            onClick={() => setShowCreateJob(true)}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </div>

        {/* Job Postings Tab */}
        <TabsContent value="postings" className="mt-0">
          {jobPostings.length === 0 ? (
            <Card className="border-white/10 bg-slate-900/60">
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Job Postings</h3>
                <p className="text-slate-400 mb-4">Create your first job posting to start hiring.</p>
                <Button onClick={() => setShowCreateJob(true)} className="bg-emerald-600 hover:bg-emerald-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job Posting
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobPostings.map((job) => (
                <Card key={job.id} className="border-white/10 bg-slate-900/60">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                          <Badge 
                            variant="outline" 
                            className={
                              job.status === 'active' 
                                ? 'border-emerald-500/30 text-emerald-400' 
                                : job.status === 'draft'
                                ? 'border-amber-500/30 text-amber-400'
                                : 'border-slate-500/30 text-slate-400'
                            }
                          >
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{job.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {job.type}
                          </span>
                          {job.salary && (
                            <span className="flex items-center gap-1">
                              ${job.salary}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {job.applicantCount} applicants
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-white/10"
                          onClick={() => handleDeleteJob(job.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {job.status === 'draft' && (
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-500"
                            onClick={() => handlePublishJob(job.id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Publish
                          </Button>
                        )}
                        {job.status === 'active' && (
                          <Button 
                            variant="outline"
                            size="sm" 
                            className="border-white/10"
                            onClick={() => handleCloseJob(job.id)}
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Applicants Tab */}
        <TabsContent value="applicants" className="mt-0">
          {applicants.length === 0 ? (
            <Card className="border-white/10 bg-slate-900/60">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Applicants Yet</h3>
                <p className="text-slate-400">Applicants will appear here when they apply to your job postings.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/10 bg-slate-900/60">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-white">All Applicants</CardTitle>
                <CardDescription className="text-slate-400">
                  Review and manage job applications
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {applicants.map((applicant) => (
                    <div 
                      key={applicant.id}
                      className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setShowApplicantDetails(applicant)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-full bg-slate-700 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {applicant.name[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{applicant.name}</p>
                          <p className="text-sm text-slate-400">
                            Applied for {applicant.job?.title || 'Unknown Position'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(applicant.appliedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(applicant.status)}
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Job Wizard */}
      <Dialog open={showCreateJob} onOpenChange={(open) => { setShowCreateJob(open); if (!open) setWizardStep(0); }}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Create Job Posting
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Step {wizardStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[wizardStep].title}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center gap-1 py-2">
            {WIZARD_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => i < wizardStep && setWizardStep(i)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all w-full ${
                      i === wizardStep
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : i < wizardStep
                        ? 'bg-emerald-600/10 text-emerald-500 cursor-pointer hover:bg-emerald-600/20'
                        : 'text-slate-500'
                    }`}
                  >
                    {i < wizardStep ? (
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                    <span className="hidden sm:inline truncate">{step.title}</span>
                  </button>
                </div>
              );
            })}
          </div>
          
          <div className="py-4 min-h-[300px]">
            {/* Step 1: Job Basics */}
            {wizardStep === 0 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Job Title *</label>
                  <Input
                    placeholder="e.g. Property Manager, Maintenance Technician, Leasing Agent"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    className="bg-slate-800 border-white/10 text-white text-base h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Category *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {JOB_CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setNewJob({ ...newJob, category: cat.id })}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                            newJob.category === cat.id
                              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 border-white/10 hover:border-white/20'
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Employment Type</label>
                    <Select value={newJob.type} onValueChange={(v) => setNewJob({ ...newJob, type: v })}>
                      <SelectTrigger className="bg-slate-800 border-white/10 text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10">
                        <SelectItem value="full-time" className="text-white">Full-Time</SelectItem>
                        <SelectItem value="part-time" className="text-white">Part-Time</SelectItem>
                        <SelectItem value="contract" className="text-white">Contract</SelectItem>
                        <SelectItem value="temporary" className="text-white">Temporary</SelectItem>
                        <SelectItem value="internship" className="text-white">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Experience Level</label>
                    <Select value={newJob.experienceLevel} onValueChange={(v) => setNewJob({ ...newJob, experienceLevel: v })}>
                      <SelectTrigger className="bg-slate-800 border-white/10 text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10">
                        <SelectItem value="entry" className="text-white">Entry Level</SelectItem>
                        <SelectItem value="mid" className="text-white">Mid Level</SelectItem>
                        <SelectItem value="senior" className="text-white">Senior</SelectItem>
                        <SelectItem value="executive" className="text-white">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {wizardStep === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Location *</label>
                  <Input
                    placeholder="e.g. Las Vegas, NV or Multiple Locations"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    className="bg-slate-800 border-white/10 text-white text-base h-11"
                  />
                  <p className="text-xs text-slate-500">City, State or &quot;Remote&quot;</p>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 border border-white/10">
                  <input
                    type="checkbox"
                    checked={newJob.isRemote}
                    onChange={(e) => setNewJob({ ...newJob, isRemote: e.target.checked })}
                    className="rounded border-slate-600 h-5 w-5"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">Remote friendly</p>
                    <p className="text-xs text-slate-400">This position can be done remotely or has a hybrid option</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Compensation */}
            {wizardStep === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Pay Type</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'yearly', label: 'Annual Salary' },
                      { value: 'hourly', label: 'Hourly Rate' },
                      { value: 'per-project', label: 'Per Project' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setNewJob({ ...newJob, salaryType: opt.value })}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                          newJob.salaryType === opt.value
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      Minimum {newJob.salaryType === 'hourly' ? '($/hr)' : newJob.salaryType === 'yearly' ? '($/yr)' : '($)'}
                    </label>
                    <Input
                      type="number"
                      placeholder={newJob.salaryType === 'hourly' ? '18' : '40000'}
                      value={newJob.salaryMin}
                      onChange={(e) => setNewJob({ ...newJob, salaryMin: e.target.value })}
                      className="bg-slate-800 border-white/10 text-white h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      Maximum {newJob.salaryType === 'hourly' ? '($/hr)' : newJob.salaryType === 'yearly' ? '($/yr)' : '($)'}
                    </label>
                    <Input
                      type="number"
                      placeholder={newJob.salaryType === 'hourly' ? '25' : '65000'}
                      value={newJob.salaryMax}
                      onChange={(e) => setNewJob({ ...newJob, salaryMax: e.target.value })}
                      className="bg-slate-800 border-white/10 text-white h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Benefits</label>
                  <Textarea
                    placeholder="e.g. Health insurance, 401k match, PTO, flexible schedule, company vehicle..."
                    value={newJob.benefits}
                    onChange={(e) => setNewJob({ ...newJob, benefits: e.target.value })}
                    className="bg-slate-800 border-white/10 text-white min-h-[100px]"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Description & Requirements */}
            {wizardStep === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Job Description *</label>
                  <Textarea
                    placeholder="Describe the role, day-to-day responsibilities, team structure, and what success looks like in this position..."
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    className="bg-slate-800 border-white/10 text-white min-h-[150px]"
                  />
                  <p className="text-xs text-slate-500">Tip: Be specific about responsibilities. Good descriptions attract better candidates.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Requirements</label>
                  <Textarea
                    placeholder="e.g. 3+ years property management experience, real estate license preferred, proficiency in Yardi or AppFolio, strong communication skills..."
                    value={newJob.requirements}
                    onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                    className="bg-slate-800 border-white/10 text-white min-h-[120px]"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Company Info */}
            {wizardStep === 4 && (
              <div className="space-y-5">
                <div className="p-4 rounded-lg bg-emerald-600/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-300">
                    This info helps candidates learn about your company. If left blank, your account name will be used.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Company / Business Name</label>
                  <Input
                    placeholder="Your company name"
                    value={newJob.companyName}
                    onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })}
                    className="bg-slate-800 border-white/10 text-white h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">About the Company</label>
                  <Textarea
                    placeholder="Tell candidates about your company, culture, mission, and what makes it a great place to work..."
                    value={newJob.companyAbout}
                    onChange={(e) => setNewJob({ ...newJob, companyAbout: e.target.value })}
                    className="bg-slate-800 border-white/10 text-white min-h-[120px]"
                  />
                </div>

                {/* Review Summary */}
                <div className="p-4 rounded-lg bg-slate-800 border border-white/10 space-y-2">
                  <h4 className="text-sm font-semibold text-white">Review</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-400">Title:</div>
                    <div className="text-white font-medium">{newJob.title || '—'}</div>
                    <div className="text-slate-400">Type:</div>
                    <div className="text-white">{newJob.type} • {newJob.experienceLevel}</div>
                    <div className="text-slate-400">Location:</div>
                    <div className="text-white">{newJob.location || '—'} {newJob.isRemote && '(Remote)'}</div>
                    <div className="text-slate-400">Salary:</div>
                    <div className="text-white">
                      {newJob.salaryMin || newJob.salaryMax
                        ? `$${newJob.salaryMin || '?'} - $${newJob.salaryMax || '?'} ${newJob.salaryType}`
                        : 'Not specified'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {wizardStep > 0 && (
                <Button variant="ghost" onClick={() => setWizardStep(wizardStep - 1)} className="text-slate-300">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setShowCreateJob(false); setWizardStep(0); }} disabled={isSaving}>
                Cancel
              </Button>
              {wizardStep < WIZARD_STEPS.length - 1 ? (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={!canAdvance()}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateJob}
                  disabled={!newJob.title || !newJob.description || !newJob.location || isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publish Job
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Applicant Details Dialog */}
      <Dialog open={!!showApplicantDetails} onOpenChange={() => setShowApplicantDetails(null)}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
          {showApplicantDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                    {showApplicantDetails.name[0].toUpperCase()}
                  </div>
                  {showApplicantDetails.name}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Applied {new Date(showApplicantDetails.appliedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  {getStatusBadge(showApplicantDetails.status)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="h-4 w-4 text-slate-500" />
                    {showApplicantDetails.email}
                  </div>
                  {showApplicantDetails.phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="h-4 w-4 text-slate-500" />
                      {showApplicantDetails.phone}
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm font-medium text-slate-300 mb-3">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(['reviewing', 'interview', 'offered', 'hired', 'rejected'] as const).map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateApplicantStatus(showApplicantDetails.id, status)}
                        className={`border-white/10 capitalize ${
                          showApplicantDetails.status === status ? 'bg-white/10' : ''
                        }`}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowApplicantDetails(null)}>
                  Close
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
