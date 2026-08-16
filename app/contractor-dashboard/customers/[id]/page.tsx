import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Briefcase, DollarSign, Lock, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { JobStatusBadge } from '@/components/contractor/job-status-badge';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    subscriptionTier: true,
  });

  if (!contractorProfile) {
    return redirect('/onboarding/contractor');
  }

  // Determine subscription tier
  const tier = contractorProfile.subscriptionTier || 'starter';

  // Check if CRM feature is available
  const hasCRMAccess = tier === 'pro' || tier === 'enterprise';

  if (!hasCRMAccess) {
    return (
      <main className="w-full px-4 py-10 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-8 text-center">
            <Lock className="h-12 w-12 text-violet-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Customer CRM</h1>
            <p className="text-slate-300 mb-6">
              Customer relationship management features are available on the Pro plan. 
              Upgrade to manage customers, track communication history, and grow your business.
            </p>
            <Link
              href="/contractor-dashboard/settings/subscription"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-full font-semibold transition-colors"
            >
              <Zap className="h-5 w-5" />
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const customer = await prisma.contractorCustomer.findFirst({
    where: {
      id,
      contractorId: contractorProfile.id,
    },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    lead: 'bg-amber-500/30 text-amber-200',
    prospect: 'bg-blue-500/30 text-blue-200',
    customer: 'bg-emerald-500/30 text-emerald-200',
    inactive: 'bg-gray-500/30 text-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contractor-dashboard/customers">
            <Button variant="outline" size="icon" className="border-gray-300 text-gray-900 hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-600">{customer.name}</h1>
              <Badge className={statusColors[customer.status]}>
                {customer.status}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">Customer since {new Date(customer.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 text-gray-900">
          <Edit className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(Number(customer.totalSpent))}
                </p>
                <p className="text-sm text-gray-600">Lifetime Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Briefcase className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{customer.totalJobs}</p>
                <p className="text-sm text-gray-600">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Last Contact</p>
              <p className="text-gray-900">
                {customer.lastContactedAt 
                  ? new Date(customer.lastContactedAt).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Last Job</p>
              <p className="text-gray-900">
                {customer.lastJobAt 
                  ? new Date(customer.lastJobAt).toLocaleDateString()
                  : 'No jobs yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Jobs */}
          <Card className="border-2 border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900">Jobs</CardTitle>
              <Link href={`/contractor-dashboard/jobs/new?customerId=${customer.id}`}>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-gray-900">
                  New Job
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {customer.jobs.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No jobs yet</p>
              ) : (
                <div className="space-y-3">
                  {customer.jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/contractor-dashboard/jobs/${job.id}`}
                      className="block p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{job.title}</h4>
                            <JobStatusBadge status={job.status} />
                          </div>
                          <p className="text-sm text-gray-500">{job.jobNumber}</p>
                        </div>
                        {job.estimatedCost && (
                          <p className="text-lg font-semibold text-emerald-600">
                            {formatCurrency(Number(job.estimatedCost))}
                          </p>
                        )}
                      </div>
                      {job.estimatedStartDate && (
                        <p className="text-sm text-gray-500">
                          Start: {new Date(job.estimatedStartDate).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card className="border-2 border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <a href={`mailto:${customer.email}`} className="text-gray-900 hover:text-violet-600">
                      {customer.email}
                    </a>
                  </div>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <a href={`tel:${customer.phone}`} className="text-gray-900 hover:text-violet-600">
                      {customer.phone}
                    </a>
                  </div>
                </div>
              )}

              {customer.address && typeof customer.address === 'object' && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="text-gray-900">
                      {(customer.address as any).street}<br />
                      {(customer.address as any).city}, {(customer.address as any).state} {(customer.address as any).zip}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {customer.tags.length > 0 && (
            <Card className="border-2 border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag, index) => (
                    <Badge key={index} className="bg-white/10 text-gray-900">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border-2 border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/contractor-dashboard/jobs/new?customerId=${customer.id}`}>
                <Button variant="outline" size="sm" className="w-full border-gray-300 text-gray-900 hover:bg-gray-100">
                  Create Job
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="w-full border-gray-300 text-gray-900 hover:bg-gray-100">
                Send Email
              </Button>
              <Button variant="outline" size="sm" className="w-full border-gray-300 text-gray-900 hover:bg-gray-100">
                Add Note
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
