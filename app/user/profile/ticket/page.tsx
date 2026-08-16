import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Wrench, Plus, Clock, CheckCircle2, Truck, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

// ─── Status pipeline (mirrors admin side) ─────────────────────────────────────
const STATUS_PIPELINE = [
  { key: 'open', label: 'Submitted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'contractor_on_the_way', label: 'On the Way' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'completed', label: 'Done' },
];

function getProgressIdx(status: string) {
  const idx = STATUS_PIPELINE.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    open: { label: 'Open', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className='h-3 w-3' /> },
    in_progress: { label: 'In Progress', cls: 'bg-violet-50 text-violet-700 border-violet-200', icon: <Wrench className='h-3 w-3' /> },
    contractor_on_the_way: { label: 'On the Way 🚐', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Truck className='h-3 w-3' /> },
    resolved: { label: 'Resolved', cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 className='h-3 w-3' /> },
    completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className='h-3 w-3' /> },
    closed: { label: 'Closed', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: null },
  };
  const info = map[status] ?? map.open;
  return (
    <span className={`inline-flex items-center gap-1 border text-[11px] font-semibold px-2 py-0.5 rounded-full ${info.cls}`}>
      {info.icon}
      {info.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-400',
    low: 'bg-gray-300',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[priority] ?? map.low}`} />;
}

function ProgressBar({ status }: { status: string }) {
  if (status === 'closed') return null;
  const idx = getProgressIdx(status);
  const pct = ((idx + 1) / STATUS_PIPELINE.length) * 100;
  const colorMap: Record<string, string> = {
    open: 'bg-blue-400',
    in_progress: 'bg-violet-500',
    contractor_on_the_way: 'bg-amber-500',
    resolved: 'bg-green-500',
    completed: 'bg-emerald-500',
  };
  const barColor = colorMap[status] ?? 'bg-blue-400';
  return (
    <div className='space-y-1 mt-3'>
      <div className='flex justify-between text-[10px] text-gray-400'>
        {STATUS_PIPELINE.map((s, i) => (
          <span key={s.key} className={i === idx ? 'text-gray-700 font-semibold' : ''}>{s.label}</span>
        ))}
      </div>
      <div className='relative h-1.5 bg-gray-100 rounded-full overflow-hidden'>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function TenantTicketPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className='w-full'>
        <p className='text-slate-500 p-8'>Please sign in to view your maintenance requests.</p>
      </main>
    );
  }

  const userId = session.user.id as string;

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { tenantId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      location: true,
      assignedToName: true,
      estimatedCompletionDate: true,
      createdAt: true,
      updatedAt: true,
      comments: true,
    },
  });

  // Count unread updates (comments that are non-internal and were added after the last time
  // we surfaced this to the user — for now we just count public comments as updates)
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const activeCount = tickets.filter((t) => ['in_progress', 'contractor_on_the_way'].includes(t.status)).length;

  return (
    <main className='w-full space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-slate-800'>Maintenance Requests</h1>
          <p className='text-sm text-slate-500 mt-0.5'>
            Track the status of your submitted maintenance requests.
          </p>
        </div>
        <Link
          href='/user/maintenance/create'
          className='inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow transition-colors'
        >
          <Plus className='h-3.5 w-3.5' />
          New Request
        </Link>
      </div>

      {/* Stats */}
      {tickets.length > 0 && (
        <div className='grid grid-cols-3 gap-3'>
          <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-center'>
            <p className='text-lg font-bold text-gray-900'>{tickets.length}</p>
            <p className='text-[10px] text-gray-500 font-medium'>Total</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-center'>
            <p className='text-lg font-bold text-blue-600'>{openCount}</p>
            <p className='text-[10px] text-gray-500 font-medium'>Pending</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-center'>
            <p className='text-lg font-bold text-violet-600'>{activeCount}</p>
            <p className='text-[10px] text-gray-500 font-medium'>Active</p>
          </div>
        </div>
      )}

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <div className='rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center'>
          <Wrench className='mx-auto h-10 w-10 text-gray-200 mb-3' />
          <p className='text-sm font-medium text-gray-600'>No maintenance requests yet</p>
          <p className='text-xs text-gray-400 mt-1 mb-4'>
            Submit a request and we&apos;ll take care of it.
          </p>
          <Link
            href='/user/maintenance/create'
            className='inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-colors'
          >
            <Plus className='h-3.5 w-3.5' />
            Submit a Request
          </Link>
        </div>
      ) : (
        <div className='space-y-3'>
          {tickets.map((ticket) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const comments = Array.isArray(ticket.comments) ? (ticket.comments as any[]) : [];
            const publicComments = comments.filter((c) => !c.isInternal);
            const latestUpdate = publicComments[publicComments.length - 1] ?? null;

            return (
              <div
                key={ticket.id}
                className='rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3 hover:border-indigo-200 transition-colors'
              >
                {/* Top row */}
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap mb-1'>
                      <PriorityDot priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                      {ticket.location && (
                        <span className='inline-flex items-center gap-1 text-[10px] text-gray-500'>
                          <MapPin className='h-2.5 w-2.5' />
                          {ticket.location.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className='text-sm font-semibold text-gray-900 truncate'>{ticket.title}</p>
                    {ticket.description && (
                      <p className='text-[11px] text-gray-500 line-clamp-1 mt-0.5'>{ticket.description}</p>
                    )}
                  </div>
                  <div className='text-right shrink-0'>
                    <p className='text-[10px] text-gray-400'>
                      {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    {ticket.assignedToName && (
                      <p className='text-[10px] text-gray-500 mt-0.5'>
                        Assigned: <span className='font-medium'>{ticket.assignedToName}</span>
                      </p>
                    )}
                    {ticket.estimatedCompletionDate && (
                      <p className='text-[10px] text-indigo-600 mt-0.5'>
                        Est. {new Date(ticket.estimatedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* "Contractor on the way" alert banner */}
                {ticket.status === 'contractor_on_the_way' && (
                  <div className='flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2'>
                    <Truck className='h-4 w-4 text-amber-600 shrink-0' />
                    <p className='text-xs font-semibold text-amber-800'>
                      A technician is on their way — please ensure access is available.
                    </p>
                  </div>
                )}

                {/* Progress bar */}
                <ProgressBar status={ticket.status} />

                {/* Latest update from staff */}
                {latestUpdate && (
                  <div className='pt-2 border-t border-gray-100'>
                    <p className='text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide font-semibold'>Latest update from staff</p>
                    <p className='text-xs text-gray-700 line-clamp-2'>{latestUpdate.message}</p>
                    <p className='text-[10px] text-gray-400 mt-0.5'>
                      {latestUpdate.userName} · {new Date(latestUpdate.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
