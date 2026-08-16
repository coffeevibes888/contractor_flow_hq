import { requireUser } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Briefcase, Building2, MapPin, Clock, MessageSquare, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export const metadata = {
  title: 'My Job Applications',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  new: { label: 'Submitted', className: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  reviewing: { label: 'Under Review', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  interview: { label: 'Interview', className: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  offered: { label: 'Offer Extended', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  hired: { label: 'Hired 🎉', className: 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50' },
  rejected: { label: 'Not Selected', className: 'bg-red-500/20 text-red-300 border-red-500/40' },
  withdrawn: { label: 'Withdrawn', className: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
};

export default async function UserJobApplicationsPage() {
  const session = await requireUser();

  const applications = await prisma.jobApplicant.findMany({
    where: { userId: session.user.id },
    orderBy: { appliedAt: 'desc' },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          companyName: true,
          location: true,
          type: true,
          isRemote: true,
        },
      },
      _count: { select: { messages: true } },
    },
  });

  // Unread message counts per application
  const unreadCounts = await prisma.jobApplicantMessage.groupBy({
    by: ['applicantId'],
    where: {
      applicant: { userId: session.user.id },
      readAt: null,
      NOT: { senderRole: 'applicant' },
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unreadCounts.map((u) => [u.applicantId, u._count._all]));

  return (
    <main className="w-full">
      <div className="max-w-7xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-1">
            My Job Applications
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Track your applications, messages, and offers.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/50 p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-slate-800">No applications yet</h3>
            <p className="text-sm text-slate-600 mt-1">
              Browse open roles and submit your first application.
            </p>
            <Link
              href="/jobs"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const status = STATUS_LABELS[app.status] || STATUS_LABELS.new;
              const unread = unreadMap.get(app.id) || 0;
              const isDraft = app.status === 'draft';
              return (
                <Link
                  key={app.id}
                  href={isDraft ? `/jobs/${app.jobId}/apply` : `/user/dashboard/jobs/${app.id}`}
                  className="block rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                      {(app.job.companyName || app.job.title).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{app.job.title}</h3>
                          {app.job.companyName && (
                            <p className="text-sm text-slate-600 flex items-center gap-1 truncate">
                              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                              {app.job.companyName}
                            </p>
                          )}
                        </div>
                        <Badge className={`border ${status.className} flex-shrink-0`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {app.job.location}
                          {app.job.isRemote && ' • Remote'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isDraft
                            ? 'Draft — resume anytime'
                            : `Applied ${formatDistanceToNow(app.appliedAt, { addSuffix: true })}`}
                        </span>
                        {app._count.messages > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {app._count.messages} message{app._count.messages !== 1 ? 's' : ''}
                            {unread > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                                {unread} new
                              </span>
                            )}
                          </span>
                        )}
                        {app.documents && Array.isArray(app.documents) && app.documents.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {(app.documents as any[]).length} doc
                            {(app.documents as any[]).length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {app.status === 'offered' && app.offerMessage && (
                        <p className="mt-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                          <strong>Offer:</strong> {app.offerMessage}
                        </p>
                      )}
                      {app.status === 'rejected' && app.rejectionReason && (
                        <p className="mt-2 text-xs text-slate-500">
                          Reason: {app.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
