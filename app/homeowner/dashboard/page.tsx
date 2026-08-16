import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import Image from 'next/image';
import {
  HousePlus,
  Wrench,
  Plus,
  Briefcase,
  Clock,
  CheckCircle,
  CheckCircle2,
  MapPin,
  Camera,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Shield,
  ChevronRight,
  Hammer,
  FileSignature,
} from 'lucide-react';
import { Metadata } from 'next';
import RecommendedContractors from '@/components/homeowner/recommended-contractors';
import { Progress } from '@/components/ui/progress';

export const metadata: Metadata = {
  title: 'Homeowner Dashboard',
};

interface WorkOrder {
  id: string;
  title: string;
  category: string;
  status: string;
  scheduledDate: Date | null;
  agreedPrice: unknown;
  bids: { id: string; status: string }[];
}

const STATUS_STEPS = [
  { key: 'open', label: 'Open' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

function getStatusProgress(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STATUS_STEPS.length) * 100);
}

export default async function HomeownerDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  // Get homeowner profile with work orders
  let homeowner: any = null;
  try {
    homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
      include: {
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            bids: true,
          },
        },
      },
    });
  } catch {
    // Model doesn't exist yet - show empty state
  }

  // Marketplace leads
  const leads = await prisma.contractorLead.findMany({
    where: { customerUserId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      matches: {
        include: {
          contractor: {
            select: { businessName: true, displayName: true, slug: true },
          },
        },
      },
    },
  });

  // Saved payment methods for Stripe payment-setup card
  const savedPaymentMethods = await prisma.savedPaymentMethod.count({
    where: { userId: session.user.id },
  });

  const workOrders: WorkOrder[] = homeowner?.workOrders || [];

  // Active in-progress job (the most recent one currently in progress)
  const inProgressJob = workOrders.find((wo) => wo.status === 'in_progress')
    || workOrders.find((wo) => wo.status === 'assigned')
    || null;

  const activeJobs = workOrders.filter((wo) =>
    ['open', 'assigned', 'in_progress'].includes(wo.status)
  ).length;

  const completedJobs = workOrders.filter((wo) => wo.status === 'completed').length;
  const pendingBids = workOrders.reduce(
    (sum, wo) => sum + wo.bids.filter((b) => b.status === 'pending').length,
    0
  );

  // Profile completeness
  const hasAddress = homeowner?.address && (homeowner.address as any)?.street;
  const hasImages = homeowner?.images?.length > 0;
  const hasHomeType = Boolean(homeowner?.homeType);
  const profileComplete = hasAddress && hasImages && hasHomeType;

  const paymentReady = savedPaymentMethods > 0;

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900'>
            Welcome back, {session.user.name?.split(' ')[0] || 'Homeowner'}
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage your home, jobs, and contractor work
          </p>
        </div>
        <Link
          href='/homeowner/jobs/new'
          className='inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all'
        >
          <Plus className='h-3.5 w-3.5' />
          Post a Job
        </Link>
      </div>

      {/* Profile Completion Banner */}
      {!profileComplete && (
        <div className='rounded-xl border border-amber-200 bg-amber-50 p-4'>
          <div className='flex items-start gap-3'>
            <div className='rounded-lg bg-amber-100 p-2 shrink-0'>
              <AlertCircle className='h-5 w-5 text-amber-600' />
            </div>
            <div className='flex-1 min-w-0'>
              <h3 className='text-sm font-bold text-amber-900'>Complete your home profile</h3>
              <p className='text-xs text-amber-800 mt-0.5'>
                Add your address and photos to help contractors understand your property better.
              </p>
              <div className='flex flex-wrap gap-2 mt-3'>
                {!hasAddress && (
                  <span className='inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-1 text-[10px] font-medium text-amber-700'>
                    <MapPin className='h-3 w-3' /> Add address
                  </span>
                )}
                {!hasImages && (
                  <span className='inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-1 text-[10px] font-medium text-amber-700'>
                    <Camera className='h-3 w-3' /> Add photos
                  </span>
                )}
                {!hasHomeType && (
                  <span className='inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-1 text-[10px] font-medium text-amber-700'>
                    <HousePlus className='h-3 w-3' /> Set home type
                  </span>
                )}
              </div>
            </div>
            <Link
              href='/homeowner/settings'
              className='shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors'
            >
              Complete
              <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
        </div>
      )}

      {/* Stripe Payment Setup Card */}
      {!paymentReady ? (
        <div className='rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 p-4'>
          <div className='flex items-start gap-3'>
            <div className='rounded-lg bg-indigo-100 p-2 shrink-0'>
              <CreditCard className='h-5 w-5 text-indigo-600' />
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <h3 className='text-sm font-bold text-gray-900'>Set up payments with Stripe</h3>
                <span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold'>
                  <Shield className='h-2.5 w-2.5' />
                  Secure
                </span>
              </div>
              <p className='text-xs text-gray-600 mt-0.5'>
                Save a card or bank account so you can pay contractors instantly when work is complete. Funds are held in escrow until you approve the job.
              </p>
            </div>
            <Link
              href='/homeowner/settings/payment'
              className='shrink-0 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-sm'
            >
              Set up
              <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
        </div>
      ) : (
        <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-3'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-emerald-100 p-1.5'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
            </div>
            <div className='flex-1'>
              <p className='text-xs font-semibold text-emerald-900'>
                Payment method ready · {savedPaymentMethods} saved
              </p>
              <p className='text-[10px] text-emerald-700'>
                You can pay contractors with one click. Stripe-secured.
              </p>
            </div>
            <Link
              href='/homeowner/settings/payment'
              className='text-[11px] font-semibold text-emerald-700 hover:text-emerald-900'
            >
              Manage →
            </Link>
          </div>
        </div>
      )}

      {/* Work-In-Progress Status Bar */}
      {inProgressJob && (
        <div className='rounded-xl border border-cyan-200 bg-white shadow-sm overflow-hidden'>
          <div className='bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 border-b border-cyan-200/60 px-4 py-3 flex items-center justify-between'>
            <div className='flex items-center gap-2 min-w-0'>
              <div className='rounded-lg bg-cyan-100 p-1.5 shrink-0'>
                <Hammer className='h-4 w-4 text-cyan-600' />
              </div>
              <div className='min-w-0'>
                <p className='text-xs font-bold text-gray-900 truncate'>
                  Work in progress · {inProgressJob.title}
                </p>
                <p className='text-[10px] text-gray-500 capitalize truncate'>
                  {inProgressJob.category}
                  {inProgressJob.scheduledDate
                    ? ` · scheduled ${new Date(inProgressJob.scheduledDate).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
            </div>
            <Link
              href={`/homeowner/jobs/${inProgressJob.id}`}
              className='shrink-0 text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-0.5'
            >
              View <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          <div className='p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase tracking-wide text-gray-500'>
                Job Progress
              </span>
              <span className='text-[10px] font-bold text-cyan-600'>
                {getStatusProgress(inProgressJob.status)}%
              </span>
            </div>
            <Progress
              value={getStatusProgress(inProgressJob.status)}
              className='h-1.5 bg-gray-100 [&>div]:bg-gradient-to-r [&>div]:from-sky-500 [&>div]:to-cyan-500'
            />
            <div className='flex items-center justify-between gap-2'>
              {STATUS_STEPS.map((step, idx) => {
                const currentIdx = STATUS_STEPS.findIndex((s) => s.key === inProgressJob.status);
                const reached = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step.key} className='flex flex-col items-center gap-1 flex-1'>
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                        reached
                          ? 'bg-gradient-to-br from-sky-500 to-cyan-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                      } ${isCurrent ? 'ring-2 ring-cyan-300' : ''}`}
                    >
                      {reached ? <CheckCircle2 className='h-3 w-3' /> : idx + 1}
                    </div>
                    <span
                      className={`text-[9px] font-semibold text-center ${
                        reached ? 'text-gray-800' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <KPICard
          title='Active Jobs'
          value={String(activeJobs)}
          subtitle={inProgressJob ? '1 in progress' : 'Open & assigned'}
          icon={Wrench}
          gradient='from-sky-400 to-cyan-400'
          href='/homeowner/jobs'
        />
        <KPICard
          title='Pending Bids'
          value={String(pendingBids)}
          subtitle='Awaiting your review'
          icon={Clock}
          gradient='from-amber-400 to-orange-400'
          href='/homeowner/jobs'
          alert={pendingBids > 0}
        />
        <KPICard
          title='Completed'
          value={String(completedJobs)}
          subtitle='Lifetime jobs'
          icon={CheckCircle}
          gradient='from-emerald-400 to-teal-400'
          href='/homeowner/jobs?status=completed'
        />
        <KPICard
          title='Quote Requests'
          value={String(leads.length)}
          subtitle='Recent matches'
          icon={Briefcase}
          gradient='from-violet-400 to-purple-400'
          href='/homeowner/requests'
        />
      </div>

      {/* Summary Bar */}
      <div className='relative rounded-xl border border-gray-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 overflow-hidden'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-200/30 to-transparent rounded-bl-full' />
        <div className='relative p-4'>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <SummaryItem label='Home Type' value={homeowner?.homeType?.replace('_', ' ') || '—'} />
            <SummaryItem label='Bedrooms' value={homeowner?.bedrooms ? String(homeowner.bedrooms) : '—'} />
            <SummaryItem
              label='Bathrooms'
              value={homeowner?.bathrooms ? String(Number(homeowner.bathrooms)) : '—'}
            />
            <SummaryItem
              label='Square Feet'
              value={homeowner?.squareFootage ? homeowner.squareFootage.toLocaleString() : '—'}
            />
          </div>
        </div>
      </div>

      {/* My Home Card */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex flex-col md:flex-row'>
          {/* Home Image */}
          <div className='md:w-1/3 relative'>
            {hasImages ? (
              <div className='relative h-48 md:h-full min-h-[200px]'>
                <Image
                  src={homeowner.images[0]}
                  alt='My Home'
                  fill
                  className='object-cover'
                />
                {homeowner.images.length > 1 && (
                  <span className='absolute bottom-2 right-2 rounded-full bg-black/70 text-white px-2 py-0.5 text-[10px] font-medium'>
                    +{homeowner.images.length - 1} photos
                  </span>
                )}
              </div>
            ) : (
              <div className='h-48 md:h-full min-h-[200px] bg-gray-50 flex items-center justify-center border-r border-gray-100'>
                <div className='text-center'>
                  <Camera className='h-12 w-12 mx-auto text-gray-300 mb-2' />
                  <p className='text-xs text-gray-500'>No photos yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Home Details */}
          <div className='md:w-2/3 p-5'>
            <div className='flex items-start justify-between mb-3'>
              <div className='min-w-0'>
                <h2 className='text-base font-bold text-gray-900 truncate'>
                  {homeowner?.name || 'My Home'}
                </h2>
                {hasAddress && (
                  <p className='text-xs text-gray-500 flex items-center gap-1 mt-0.5'>
                    <MapPin className='h-3 w-3 shrink-0' />
                    <span className='truncate'>
                      {(homeowner.address as any).street}, {(homeowner.address as any).city},{' '}
                      {(homeowner.address as any).state}
                    </span>
                  </p>
                )}
              </div>
              <Link
                href='/homeowner/settings'
                className='shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition-colors'
              >
                Edit
              </Link>
            </div>

            {homeowner?.interestedServices?.length > 0 && (
              <div>
                <p className='text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-2'>
                  Services Needed
                </p>
                <div className='flex flex-wrap gap-1.5'>
                  {homeowner.interestedServices.map((service: string) => (
                    <span
                      key={service}
                      className='inline-flex items-center rounded-full bg-sky-50 border border-sky-100 text-sky-700 px-2 py-0.5 text-[10px] font-medium capitalize'
                    >
                      {service.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Contractors */}
      <RecommendedContractors interestedServices={homeowner?.interestedServices || []} />

      {/* Recent Jobs + Quote Requests */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Recent Jobs */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Your Jobs</h3>
              <p className='text-[11px] text-gray-500'>Recently posted work</p>
            </div>
            <Link
              href='/homeowner/jobs'
              className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'
            >
              View All <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          {workOrders.length === 0 ? (
            <div className='p-8 text-center'>
              <Briefcase className='mx-auto h-8 w-8 text-gray-300 mb-2' />
              <p className='text-sm text-gray-500'>No jobs yet</p>
              <p className='text-[11px] text-gray-400 mt-0.5 mb-3'>
                Post your first job to get bids from contractors
              </p>
              <Link
                href='/homeowner/jobs/new'
                className='inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white'
              >
                <Plus className='h-3.5 w-3.5' />
                Post a Job
              </Link>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {workOrders.map((job) => (
                <Link
                  key={job.id}
                  href={`/homeowner/jobs/${job.id}`}
                  className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'
                >
                  <div className='h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0'>
                    <Wrench className='h-4 w-4' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800 truncate'>{job.title}</p>
                    <p className='text-[10px] text-gray-500 capitalize'>{job.category}</p>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    {job.bids.length > 0 && (
                      <span className='text-[10px] text-gray-500'>
                        {job.bids.length} bid{job.bids.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <StatusBadge status={job.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Marketplace Requests */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Recent Quote Requests</h3>
              <p className='text-[11px] text-gray-500'>Marketplace matches</p>
            </div>
            <Link
              href='/homeowner/requests'
              className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1'
            >
              View All <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          {leads.length === 0 ? (
            <div className='p-8 text-center'>
              <FileSignature className='mx-auto h-8 w-8 text-gray-300 mb-2' />
              <p className='text-sm text-gray-500'>No quote requests yet</p>
              <p className='text-[11px] text-gray-400 mt-0.5'>
                Request quotes from the contractor marketplace
              </p>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/homeowner/requests/${lead.id}`}
                  className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'
                >
                  <div className='h-8 w-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0'>
                    <Hammer className='h-4 w-4' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800 truncate capitalize'>
                      {lead.projectType.replace('_', ' ')}
                    </p>
                    <p className='text-[10px] text-gray-500 truncate'>
                      {lead.projectDescription}
                    </p>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    <span className='text-[10px] text-gray-500'>
                      {lead.matches.length} match{lead.matches.length !== 1 ? 'es' : ''}
                    </span>
                    <StatusBadge status={lead.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        <QuickAction href='/homeowner/jobs/new' icon={Plus} label='Post a Job' />
        <QuickAction href='/contractors' icon={Wrench} label='Find Contractors' />
        <QuickAction href='/homeowner/jobs' icon={Briefcase} label='My Jobs' />
        <QuickAction href='/homeowner/settings' icon={HousePlus} label='My Home' />
      </div>
    </div>
  );
}

// --- Sub-components ---

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  href,
  alert,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className='relative rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-all overflow-hidden group'
    >
      <div
        className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`}
      />
      {alert && (
        <div className='absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse' />
      )}
      <div className='flex items-start justify-between'>
        <div className='space-y-1'>
          <p className='text-[10px] sm:text-xs text-gray-500 font-medium'>{title}</p>
          <p className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900'>{value}</p>
          <p className='text-[10px] text-gray-400'>{subtitle}</p>
        </div>
        <div
          className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}
        >
          <Icon className='h-4 w-4' />
        </div>
      </div>
    </Link>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-0.5'>
      <div className='text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wide'>
        {label}
      </div>
      <div className='text-sm sm:text-base font-bold text-gray-800 capitalize'>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Open' },
    assigned: { bg: 'bg-violet-50', text: 'text-violet-600', label: 'Assigned' },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'In Progress' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Completed' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
    matching: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Matching' },
  };
  const c = config[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    label: status.replace(/_/g, ' '),
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text} capitalize whitespace-nowrap`}
    >
      {c.label}
    </span>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className='rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md hover:border-cyan-300 transition-all group'
    >
      <Icon className='h-7 w-7 mx-auto text-gray-400 group-hover:text-cyan-600 transition-colors mb-2' />
      <p className='text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition-colors'>
        {label}
      </p>
    </Link>
  );
}
