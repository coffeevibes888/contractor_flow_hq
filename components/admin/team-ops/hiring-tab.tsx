'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Briefcase, Plus, Users, Eye, Mail, Phone, 
  FileText, CheckCircle, XCircle, Clock, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  type: string;
  location: string;
  salary: string | null;
  requirements: string | null;
  benefits: string | null;
  status: string;
  createdAt: string;
  applicantCount: number;
}

interface Applicant {
  id: string;
  jobId: string;
  jobTitle: string;
  name: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  status: string;
  notes: string | null;
  appliedAt: string;
}

export default function HiringTab() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [jobsRes, applicantsRes] = await Promise.all([
        fetch('/api/landlord/hiring/jobs').then(r => r.json()).catch(() => ({ success: false, jobs: [] })),
        fetch('/api/landlord/hiring/applicants').then(r => r.json()).catch(() => ({ success: false, applicants: [] })),
      ]);

      if (jobsRes.success) {
        setJobs(jobsRes.jobs);
      } else if (jobsRes.message) {
        toast.error(jobsRes.message);
      }
      
      if (applicantsRes.success) {
        setApplicants(applicantsRes.applicants);
      }
    } catch (error) {
      console.error('Failed to load hiring data:', error);
      toast.error('Failed to load hiring data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateJob(formData: FormData) {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const location = formData.get('location') as string;
    const salary = formData.get('salary') as string;
    const requirements = formData.get('requirements') as string;
    const benefits = formData.get('benefits') as string;

    startTransition(async () => {
      const res = await fetch('/api/landlord/hiring/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, type, location, salary, requirements, benefits }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Job posting created!');
        setIsCreateOpen(false);
        loadData();
      } else {
        toast.error(data.message);
      }
    });
  }

  async function handlePublishJob(jobId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/landlord/hiring/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Job published!');
        loadData();
      } else {
        toast.error(data.message);
      }
    });
  }

  async function handleCloseJob(jobId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/landlord/hiring/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Job closed');
        loadData();
      } else {
        toast.error(data.message);
      }
    });
  }

  async function handleDeleteJob(jobId: string) {
    if (!confirm('Delete this job posting? All applicants will also be deleted.')) return;

    startTransition(async () => {
      const res = await fetch(`/api/landlord/hiring/jobs/${jobId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Job deleted');
        loadData();
      } else {
        toast.error(data.message);
      }
    });
  }

  async function handleUpdateApplicantStatus(applicantId: string, status: string) {
    startTransition(async () => {
      const res = await fetch(`/api/landlord/hiring/applicants/${applicantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Applicant marked as ${status}`);
        setSelectedApplicant(null);
        loadData();
      } else {
        toast.error(data.message);
      }
    });
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: 'bg-slate-500/20 text-slate-400',
      active: 'bg-emerald-500/20 text-emerald-400',
      closed: 'bg-red-500/20 text-red-400',
      new: 'bg-blue-500/20 text-blue-400',
      reviewing: 'bg-amber-500/20 text-amber-400',
      interview: 'bg-purple-500/20 text-purple-400',
      offered: 'bg-cyan-500/20 text-cyan-400',
      hired: 'bg-emerald-500/20 text-emerald-400',
      rejected: 'bg-red-500/20 text-red-400',
    };
    return styles[status] || styles.draft;
  }

  const activeJobs = jobs.filter(j => j.status === 'active');
  const totalApplicants = applicants.length;
  const newApplicants = applicants.filter(a => a.status === 'new').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black">Active Jobs</div>
            <Briefcase className="h-4 w-4 text-white/90" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{activeJobs.length}</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black">Total Applicants</div>
            <Users className="h-4 w-4 text-white/90" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalApplicants}</div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-black">New Applications</div>
            <Clock className="h-4 w-4 text-white/90" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{newApplicants}</div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <div className="rounded-xl bg-slate-900/60 border border-dashed border-white/20 p-4 cursor-pointer hover:border-white/40 transition-colors flex items-center justify-center gap-2">
              <Plus className="h-5 w-5 text-white" />
              <span className="text-white font-medium">Post New Job</span>
            </div>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Create Job Posting</DialogTitle>
            </DialogHeader>
            <form action={handleCreateJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Job Title</Label>
                  <Input name="title" required placeholder="e.g., Property Manager" className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Employment Type</Label>
                  <Select name="type" defaultValue="full-time">
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Location</Label>
                  <Input name="location" required placeholder="e.g., New York, NY" className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Salary Range</Label>
                  <Input name="salary" placeholder="e.g., $50,000 - $70,000" className="bg-white/5 border-white/10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Job Description</Label>
                <Textarea name="description" required placeholder="Describe the role and responsibilities..." className="bg-white/5 border-white/10 min-h-[100px]" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Requirements</Label>
                <Textarea name="requirements" placeholder="List qualifications and requirements..." className="bg-white/5 border-white/10" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Benefits</Label>
                <Textarea name="benefits" placeholder="List benefits and perks..." className="bg-white/5 border-white/10" />
              </div>

              <Button type="submit" disabled={isPending} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500">
                {isPending ? 'Creating...' : 'Create Job Posting'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Job Postings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Job Postings</h3>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-24" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl bg-slate-900/60 border border-white/10 p-8 text-center">
            <Briefcase className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No job postings yet</p>
            <p className="text-xs text-slate-500 mt-1">Create your first job posting to start hiring</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="rounded-xl bg-slate-900/60 border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-white font-medium">{job.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {job.type} • {job.location}
                      {job.salary && ` • ${job.salary}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''} • Posted {format(new Date(job.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'draft' && (
                      <Button
                        onClick={() => handlePublishJob(job.id)}
                        disabled={isPending}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        Publish
                      </Button>
                    )}
                    {job.status === 'active' && (
                      <Button
                        onClick={() => handleCloseJob(job.id)}
                        disabled={isPending}
                        size="sm"
                        variant="outline"
                        className="border-white/10"
                      >
                        Close
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDeleteJob(job.id)}
                      disabled={isPending}
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applicants */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Recent Applicants</h3>
        
        {applicants.length === 0 ? (
          <div className="rounded-xl bg-slate-900/60 border border-white/10 p-8 text-center">
            <Users className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No applicants yet</p>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs text-slate-400 uppercase">Applicant</th>
                  <th className="text-left p-4 text-xs text-slate-400 uppercase">Position</th>
                  <th className="text-left p-4 text-xs text-slate-400 uppercase">Applied</th>
                  <th className="text-left p-4 text-xs text-slate-400 uppercase">Status</th>
                  <th className="text-left p-4 text-xs text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.slice(0, 10).map(applicant => (
                  <tr key={applicant.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div className="text-white font-medium">{applicant.name}</div>
                      <div className="text-xs text-slate-400">{applicant.email}</div>
                    </td>
                    <td className="p-4 text-slate-300">{applicant.jobTitle}</td>
                    <td className="p-4 text-slate-300">{format(new Date(applicant.appliedAt), 'MMM d')}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(applicant.status)}`}>
                        {applicant.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button
                        onClick={() => setSelectedApplicant(applicant)}
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Applicant Detail Sheet */}
      <Sheet open={!!selectedApplicant} onOpenChange={() => setSelectedApplicant(null)}>
        <SheetContent className="bg-slate-900 border-white/10 w-full sm:max-w-md overflow-y-auto">
          {selectedApplicant && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">Applicant Details</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedApplicant.name}</h3>
                  <p className="text-slate-400">Applied for: {selectedApplicant.jobTitle}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <a href={`mailto:${selectedApplicant.email}`} className="hover:text-white">
                      {selectedApplicant.email}
                    </a>
                  </div>
                  {selectedApplicant.phone && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <a href={`tel:${selectedApplicant.phone}`} className="hover:text-white">
                        {selectedApplicant.phone}
                      </a>
                    </div>
                  )}
                </div>

                {selectedApplicant.coverLetter && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Cover Letter</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">
                      {selectedApplicant.coverLetter}
                    </p>
                  </div>
                )}

                {selectedApplicant.resumeUrl && (
                  <Button
                    variant="outline"
                    className="w-full bg-white/5 border-white/10"
                    onClick={() => window.open(selectedApplicant.resumeUrl!, '_blank')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Resume
                  </Button>
                )}

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <h4 className="text-sm font-medium text-slate-400">Update Status</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleUpdateApplicantStatus(selectedApplicant.id, 'reviewing')}
                      disabled={isPending}
                      variant="outline"
                      size="sm"
                      className="bg-amber-500/10 border-amber-500/30 text-amber-400"
                    >
                      Reviewing
                    </Button>
                    <Button
                      onClick={() => handleUpdateApplicantStatus(selectedApplicant.id, 'interview')}
                      disabled={isPending}
                      variant="outline"
                      size="sm"
                      className="bg-purple-500/10 border-purple-500/30 text-purple-400"
                    >
                      Interview
                    </Button>
                    <Button
                      onClick={() => handleUpdateApplicantStatus(selectedApplicant.id, 'hired')}
                      disabled={isPending}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Hire
                    </Button>
                    <Button
                      onClick={() => handleUpdateApplicantStatus(selectedApplicant.id, 'rejected')}
                      disabled={isPending}
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
