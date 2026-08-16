import { requireUser } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, MapPin, Briefcase, FileText, FileSignature } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ApplicantMessageThread } from './applicant-message-thread';
import { WithdrawButton } from './withdraw-button';

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

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser();

  const app = await prisma.jobApplicant.findUnique({
    where: { id },
    include: {
      job: true,
    },
  });

  if (!app) notFound();
  if (app.userId !== session.user.id) redirect('/user/dashboard/jobs');

  // Hitting this page counts as "viewed" — mark employer/system messages read.
  await prisma.jobApplicantMessage.updateMany({
    where: { applicantId: id, readAt: null, NOT: { senderRole: 'applicant' } },
    data: { readAt: new Date() },
  });

  const status = STATUS_LABELS[app.status] || STATUS_LABELS.new;
  const docs = (app.documents as any[] | null) || [];
  const workHistory = (app.workHistory as any[] | null) || [];

  return (
    <main className="w-full">
      <div className="max-w-5xl space-y-6">
        <Link
          href="/user/dashboard/jobs"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Applications
        </Link>

        {/* Header card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                {(app.job.companyName || app.job.title).charAt(0)}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900">{app.job.title}</h1>
                {app.job.companyName && (
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {app.job.companyName}
                  </p>
                )}
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {app.job.location}
                  {app.job.isRemote && ' • Remote'}
                </p>
              </div>
            </div>
            <Badge className={`border ${status.className}`}>{status.label}</Badge>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Applied</p>
              <p className="font-medium text-slate-900">
                {formatDistanceToNow(app.appliedAt, { addSuffix: true })}
              </p>
            </div>
            {app.signedAt && (
              <div>
                <p className="text-xs text-slate-500">Signed</p>
                <p className="font-medium text-slate-900 flex items-center gap-1">
                  <FileSignature className="h-3 w-3" />
                  {formatDistanceToNow(app.signedAt, { addSuffix: true })}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Documents</p>
              <p className="font-medium text-slate-900 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {docs.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Positions</p>
              <p className="font-medium text-slate-900 flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {workHistory.length}
              </p>
            </div>
          </div>

          {app.status === 'offered' && app.offerMessage && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900">Offer Details</p>
              <p className="text-sm text-emerald-800 mt-1">{app.offerMessage}</p>
              {app.offerAmount && (
                <p className="text-sm text-emerald-900 mt-1">
                  <strong>Amount:</strong> ${Number(app.offerAmount).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {app.status === 'rejected' && app.rejectionReason && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-semibold text-slate-900">Feedback</p>
              <p className="text-sm text-slate-700 mt-1">{app.rejectionReason}</p>
            </div>
          )}

          {!['hired', 'rejected', 'withdrawn'].includes(app.status) && (
            <div className="mt-4">
              <WithdrawButton applicantId={app.id} />
            </div>
          )}
        </div>

        {/* Documents */}
        {docs.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Your Documents</h2>
            <div className="space-y-2">
              {docs.map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                >
                  <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-slate-900 truncate flex-1">{doc.name}</span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {doc.type}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Messages</h2>
          <ApplicantMessageThread applicantId={app.id} role="applicant" />
        </div>
      </div>
    </main>
  );
}
