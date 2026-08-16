'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Users,
  Clock,
  DollarSign,
  FileText,
  Camera,
  MessageSquare,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Edit,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Package,
  FilePlus,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { JobPhotoGallery } from '@/components/contractor/job-photo-gallery';
import { JobMaterialsPanel } from '@/components/contractor/job-materials-panel';
import { JobExpensesPanel } from '@/components/contractor/job-expenses-panel';
import { JobNotesPanel } from '@/components/contractor/job-notes-panel';
import { JobChangeOrdersPanel } from '@/components/contractor/job-change-orders-panel';
import { JobChecklistPanel } from '@/components/contractor/job-checklist-panel';
import { JobActivityPanel } from '@/components/contractor/job-activity-panel';
import { JobActionsMenu } from '@/components/contractor/job-actions-menu';
import { JobSignoffCard } from '@/components/contractor/job-signoff-card';

interface JobDetailsTabsProps {
  job: any;
  assignedEmployees: any[];
  contractorId: string;
  subscriptionTier: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'scheduled':
      return 'bg-violet-100 text-violet-700 border-violet-300';
    case 'approved':
      return 'bg-cyan-100 text-cyan-700 border-cyan-300';
    case 'quoted':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'on_hold':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'canceled':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export function JobDetailsTabs({
  job,
  assignedEmployees,
  contractorId,
  subscriptionTier,
}: JobDetailsTabsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const jobCost = job.actualCost || job.estimatedCost;
  const totalHours = job.timeEntries.reduce(
    (sum: number, entry: any) => sum + (entry.billableHours || 0),
    0
  );
  const totalExpenses = job.expenses.reduce(
    (sum: number, expense: any) => sum + Number(expense.amount),
    0
  );

  // Per-job profitability: revenue (job value) minus labor + expenses cost.
  const laborCost = job.timeEntries.reduce(
    (sum: number, entry: any) =>
      sum +
      Number(
        entry.totalAmount != null
          ? entry.totalAmount
          : Number(entry.billableHours || 0) * Number(entry.hourlyRate || 0)
      ),
    0
  );
  const revenue = Number(jobCost || 0);
  const totalJobCost = laborCost + totalExpenses;
  const profit = revenue - totalJobCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const hasCustomer = Boolean(job.customerId);
  const canEdit = job.status !== 'completed' && job.status !== 'canceled' && job.status !== 'archived';

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='relative rounded-xl border-2 border-black shadow-xl overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600' />
        <div className='relative p-4 sm:p-6'>
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
            <div className='flex-1'>
              <div className='flex items-center gap-3 mb-2'>
                <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>{job.title}</h1>
                <Badge className={`border-2 ${getStatusColor(job.status)}`}>
                  {formatStatus(job.status)}
                </Badge>
              </div>
              <p className='text-sm text-gray-900/80 mb-1'>Job #{job.jobNumber}</p>
              {job.customer && (
                <div className='flex items-center gap-4 text-sm text-gray-900/90'>
                  <span className='font-medium'>
                    {job.customer.name}
                  </span>
                  {job.customer.email && (
                    <a
                      href={`mailto:${job.customer.email}`}
                      className='flex items-center gap-1 hover:text-gray-900'
                    >
                      <Mail className='h-3 w-3' />
                      {job.customer.email}
                    </a>
                  )}
                  {job.customer.phone && (
                    <a
                      href={`tel:${job.customer.phone}`}
                      className='flex items-center gap-1 hover:text-gray-900'
                    >
                      <Phone className='h-3 w-3' />
                      {job.customer.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className='flex gap-2'>
              <Link href={`/contractor-dashboard/jobs/${job.id}/edit`}>
                <Button
                  variant='outline'
                  size='sm'
                  className='bg-white/20 hover:bg-white/30 text-gray-900 border-white/40'
                >
                  <Edit className='h-4 w-4 mr-2' />
                  Edit Job
                </Button>
              </Link>
              <JobActionsMenu
                jobId={job.id}
                jobStatus={job.status}
                hasCustomer={hasCustomer}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4'>
            <div className='rounded-lg bg-white/20 p-3 border border-white/30'>
              <div className='flex items-center gap-2 mb-1'>
                <DollarSign className='h-4 w-4 text-gray-900' />
                <span className='text-xs text-gray-900/80'>Value</span>
              </div>
              <p className='text-lg font-bold text-gray-900'>
                {jobCost ? formatCurrency(Number(jobCost)) : '—'}
              </p>
            </div>
            <div className='rounded-lg bg-white/20 p-3 border border-white/30'>
              <div className='flex items-center gap-2 mb-1'>
                <Clock className='h-4 w-4 text-gray-900' />
                <span className='text-xs text-gray-900/80'>Hours</span>
              </div>
              <p className='text-lg font-bold text-gray-900'>{totalHours.toFixed(1)}</p>
            </div>
            <div className='rounded-lg bg-white/20 p-3 border border-white/30'>
              <div className='flex items-center gap-2 mb-1'>
                <Users className='h-4 w-4 text-gray-900' />
                <span className='text-xs text-gray-900/80'>Team</span>
              </div>
              <p className='text-lg font-bold text-gray-900'>{assignedEmployees.length}</p>
            </div>
            <div className='rounded-lg bg-white/20 p-3 border border-white/30'>
              <div className='flex items-center gap-2 mb-1'>
                <TrendingUp className='h-4 w-4 text-gray-900' />
                <span className='text-xs text-gray-900/80'>Expenses</span>
              </div>
              <p className='text-lg font-bold text-gray-900'>{formatCurrency(totalExpenses)}</p>
            </div>
          </div>

          {/* Profitability strip */}
          <div className='mt-3 rounded-lg bg-white/15 border border-white/30 p-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4 text-gray-900' />
                <span className='text-xs font-semibold text-gray-900/90'>Profitability</span>
              </div>
              <div className='flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-900/90'>
                <span>Revenue <span className='font-bold'>{formatCurrency(revenue)}</span></span>
                <span>Labor <span className='font-bold'>{formatCurrency(laborCost)}</span></span>
                <span>Expenses <span className='font-bold'>{formatCurrency(totalExpenses)}</span></span>
                <span>
                  Profit{' '}
                  <span className={`font-bold ${profit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                    {formatCurrency(profit)}
                  </span>
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${
                  margin >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {revenue > 0 ? `${margin.toFixed(1)}% margin` : 'No value set'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <div className='relative rounded-xl border-2 border-black shadow-xl overflow-hidden bg-gradient-to-r from-violet-100 to-purple-100'>
          <div className='p-3'>
            <TabsList className='grid w-full grid-cols-3 sm:grid-cols-9 bg-white border-2 border-black'>
              <TabsTrigger value='overview' className='text-xs sm:text-sm'>
                <Briefcase className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Overview</span>
              </TabsTrigger>
              <TabsTrigger value='team' className='text-xs sm:text-sm'>
                <Users className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Team</span>
              </TabsTrigger>
              <TabsTrigger value='time' className='text-xs sm:text-sm'>
                <Clock className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Time</span>
              </TabsTrigger>
              <TabsTrigger value='materials' className='text-xs sm:text-sm'>
                <Package className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Materials</span>
              </TabsTrigger>
              <TabsTrigger value='expenses' className='text-xs sm:text-sm'>
                <DollarSign className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Expenses</span>
              </TabsTrigger>
              <TabsTrigger value='changeorders' className='text-xs sm:text-sm'>
                <FilePlus className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Changes</span>
              </TabsTrigger>
              <TabsTrigger value='photos' className='text-xs sm:text-sm'>
                <Camera className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Photos</span>
              </TabsTrigger>
              <TabsTrigger value='notes' className='text-xs sm:text-sm'>
                <MessageSquare className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Notes</span>
              </TabsTrigger>
              <TabsTrigger value='activity' className='text-xs sm:text-sm'>
                <Activity className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Activity</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <div className='relative rounded-xl border-2 border-black shadow-xl overflow-hidden bg-white'>
          <div className='p-4 sm:p-6'>
            {/* Overview Tab */}
            <TabsContent value='overview' className='mt-0 space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                {/* Job Details */}
                <Card className='border-2 border-black'>
                  <CardHeader>
                    <CardTitle className='text-black flex items-center gap-2'>
                      <Briefcase className='h-5 w-5' />
                      Job Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    {job.description && (
                      <div>
                        <p className='text-xs font-semibold text-black/60 mb-1'>Description</p>
                        <p className='text-sm text-black'>{job.description}</p>
                      </div>
                    )}
                    {job.jobType && (
                      <div>
                        <p className='text-xs font-semibold text-black/60 mb-1'>Type</p>
                        <p className='text-sm text-black'>{job.jobType}</p>
                      </div>
                    )}
                    {(job.address || job.city || job.state) && (
                      <div>
                        <p className='text-xs font-semibold text-black/60 mb-1'>Location</p>
                        <div className='flex items-start gap-2'>
                          <MapPin className='h-4 w-4 text-black/60 mt-0.5' />
                          <div className='text-sm text-black'>
                            {job.address && <p>{job.address}</p>}
                            {(job.city || job.state) && (
                              <p>
                                {job.city}
                                {job.city && job.state && ', '}
                                {job.state} {job.zipCode}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Schedule */}
                <Card className='border-2 border-black'>
                  <CardHeader>
                    <CardTitle className='text-black flex items-center gap-2'>
                      <Calendar className='h-5 w-5' />
                      Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    {job.estimatedStartDate && (
                      <div>
                        <p className='text-xs font-semibold text-black/60 mb-1'>Start Date</p>
                        <p className='text-sm text-black'>
                          {new Date(job.estimatedStartDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                    {job.estimatedEndDate && (
                      <div>
                        <p className='text-xs font-semibold text-black/60 mb-1'>End Date</p>
                        <p className='text-sm text-black'>
                          {new Date(job.estimatedEndDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                    {job.estimatedHours && (
                      <div>
                        <p className='text-xs font-semibold text-black/60 mb-1'>
                          Estimated Hours
                        </p>
                        <p className='text-sm text-black'>{job.estimatedHours} hours</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Checklist / Punch list + Sign-off */}
              <div className='grid gap-4 sm:grid-cols-3'>
                <Card className='border-2 border-black sm:col-span-2'>
                  <CardContent className='p-4 sm:p-6'>
                    <JobChecklistPanel jobId={job.id} canEdit={canEdit} />
                  </CardContent>
                </Card>
                <Card className='border-2 border-black'>
                  <CardContent className='p-4 sm:p-6'>
                    <JobSignoffCard
                      jobId={job.id}
                      jobStatus={job.status}
                      canEdit={job.status !== 'archived' && job.status !== 'canceled'}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value='team' className='mt-0'>
              <Card className='border-2 border-black'>
                <CardHeader>
                  <CardTitle className='text-black'>Assigned Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  {assignedEmployees.length === 0 ? (
                    <p className='text-sm text-black/60 text-center py-8'>
                      No team members assigned yet
                    </p>
                  ) : (
                    <div className='grid gap-3 sm:grid-cols-2'>
                      {assignedEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className='flex items-center gap-3 p-3 rounded-lg border border-black/10 bg-gradient-to-r from-violet-50 to-purple-50'
                        >
                          {employee.photo ? (
                            <Image
                              src={employee.photo}
                              alt={`${employee.firstName} ${employee.lastName}`}
                              width={48}
                              height={48}
                              className='rounded-full border-2 border-black'
                            />
                          ) : (
                            <div className='w-12 h-12 rounded-full bg-violet-200 border-2 border-black flex items-center justify-center'>
                              <span className='text-lg font-bold text-violet-700'>
                                {employee.firstName[0]}
                                {employee.lastName[0]}
                              </span>
                            </div>
                          )}
                          <div className='flex-1'>
                            <p className='font-medium text-black'>
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className='text-xs text-black/60'>{employee.role}</p>
                            {employee.email && (
                              <p className='text-xs text-black/60'>{employee.email}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Time Tab */}
            <TabsContent value='time' className='mt-0'>
              <Card className='border-2 border-black'>
                <CardHeader>
                  <CardTitle className='text-black'>Time Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  {job.timeEntries.length === 0 ? (
                    <p className='text-sm text-black/60 text-center py-8'>
                      No time entries yet
                    </p>
                  ) : (
                    <div className='space-y-2'>
                      {job.timeEntries.map((entry: any) => (
                        <div
                          key={entry.id}
                          className='flex items-center justify-between p-3 rounded-lg border border-black/10 bg-gradient-to-r from-violet-50 to-purple-50'
                        >
                          <div>
                            <p className='text-sm font-medium text-black'>
                              {entry.employee
                                ? `${entry.employee.firstName} ${entry.employee.lastName}`
                                : 'Owner'}
                            </p>
                            <p className='text-xs text-black/60'>
                              {new Date(entry.clockIn).toLocaleString()}
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='text-sm font-bold text-black'>
                              {entry.billableHours?.toFixed(1) || '0.0'} hrs
                            </p>
                            {entry.hourlyRate && (
                              <p className='text-xs text-black/60'>
                                {formatCurrency(Number(entry.totalAmount || 0))}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Materials Tab */}
            <TabsContent value='materials' className='mt-0'>
              <JobMaterialsPanel
                jobId={job.id}
                contractorId={contractorId}
                canEdit={job.status !== 'completed' && job.status !== 'canceled'}
              />
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value='expenses' className='mt-0'>
              <Card className='border-2 border-black'>
                <CardContent className='p-4 sm:p-6'>
                  <JobExpensesPanel
                    jobId={job.id}
                    canEdit={job.status !== 'completed' && job.status !== 'canceled'}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Change Orders Tab */}
            <TabsContent value='changeorders' className='mt-0'>
              <Card className='border-2 border-black'>
                <CardContent className='p-4 sm:p-6'>
                  <JobChangeOrdersPanel jobId={job.id} canEdit={canEdit} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value='photos' className='mt-0'>
              <Card className='border-2 border-black'>
                <CardContent className='p-4 sm:p-6'>
                  <JobPhotoGallery
                    jobId={job.id}
                    initialPhotos={{
                      before: (job.jobPhotos ?? []).filter((p: any) => p.category === 'before'),
                      during: (job.jobPhotos ?? []).filter((p: any) => p.category === 'during'),
                      after: (job.jobPhotos ?? []).filter((p: any) => p.category === 'after'),
                      issue: (job.jobPhotos ?? []).filter((p: any) => p.category === 'issue'),
                      inspection: (job.jobPhotos ?? []).filter((p: any) => p.category === 'inspection'),
                      general: (job.jobPhotos ?? []).filter((p: any) => p.category === 'general'),
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value='notes' className='mt-0'>
              <Card className='border-2 border-black'>
                <CardContent className='p-4 sm:p-6'>
                  <JobNotesPanel
                    jobId={job.id}
                    canEdit={job.status !== 'completed' && job.status !== 'canceled'}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value='activity' className='mt-0'>
              <Card className='border-2 border-black'>
                <CardContent className='p-4 sm:p-6'>
                  <JobActivityPanel jobId={job.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
