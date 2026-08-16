import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Plus, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export default async function HomeownerJobsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  let workOrders: any[] = [];
  try {
    const homeowner = await (prisma as any).homeowner.findUnique({
      where: { userId: session.user.id },
      include: {
        workOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            bids: true,
          },
        },
      },
    });
    workOrders = homeowner?.workOrders || [];
  } catch {
    // Model doesn't exist yet
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Jobs</h1>
            <p className="text-slate-600 mt-1">Manage your home projects</p>
          </div>
          <Link href="/homeowner/jobs/new">
            <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Post a Job
            </Button>
          </Link>
        </div>

        {workOrders.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardContent className="py-16">
              <div className="text-center">
                <Briefcase className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No jobs yet</h3>
                <p className="text-slate-500 mb-6">Post your first job to get bids from contractors</p>
                <Link href="/homeowner/jobs/new">
                  <Button className="bg-gradient-to-r from-sky-500 to-blue-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Post a Job
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {workOrders.map((job: any) => (
              <Link key={job.id} href={`/homeowner/jobs/${job.id}`}>
                <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:border-sky-300 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-slate-900">{job.title}</h3>
                          <Badge className={
                            job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            job.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            job.status === 'assigned' ? 'bg-violet-100 text-violet-700' :
                            'bg-amber-100 text-amber-700'
                          }>
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{job.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                          <span className="capitalize">{job.category}</span>
                          <span>•</span>
                          <span>{job.bids.length} bid{job.bids.length !== 1 ? 's' : ''}</span>
                          {job.budgetMin && job.budgetMax && (
                            <>
                              <span>•</span>
                              <span>Budget: {formatCurrency(Number(job.budgetMin))} - {formatCurrency(Number(job.budgetMax))}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
