import { requireUser } from '@/lib/auth-guard';
import { Metadata } from 'next';
import { prisma } from '@/db/prisma';
import { unstable_cache } from 'next/cache';
import { 
  Home, 
  FileText, 
  CreditCard, 
  Wrench, 
  Bell,
  User,
  FileSignature,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Tenant Dashboard',
};

// Cache tenant dashboard data for 30 seconds
const getCachedTenantData = unstable_cache(
  async (userId: string) => {
    const [activeLease, pendingRentPayments, openTickets] = await Promise.all([
      prisma.lease.findFirst({
        where: {
          tenantId: userId,
          status: { in: ['active', 'pending_signature'] },
        },
        include: {
          unit: {
            include: {
              property: {
                include: {
                  landlord: true,
                },
              },
            },
          },
          signatureRequests: {
            select: { role: true, status: true },
          },
        },
      }),
      prisma.rentPayment.findMany({
        where: {
          tenantId: userId,
          status: 'pending',
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 3,
      }),
      prisma.maintenanceTicket.findMany({
        where: {
          tenant: { id: userId },
          status: { in: ['open', 'in_progress'] },
        },
        take: 3,
      }),
    ]);

    return { activeLease, pendingRentPayments, openTickets };
  },
  ['tenant-dashboard', 'by-user'],
  { revalidate: 30 }
);

export default async function TenantDashboardPage() {
  const session = await requireUser();
  
  // Use cached tenant data
  const { activeLease, pendingRentPayments, openTickets } = await getCachedTenantData(session.user.id);

  const totalPendingRent = pendingRentPayments.reduce(
    (sum, payment) => sum + Number(payment.amount), 
    0
  );

  const tenantNeedsSignature = !!activeLease?.signatureRequests?.some(
    (sr) => sr.role === 'tenant' && sr.status !== 'signed'
  );
  const landlordPendingSignature = !!activeLease?.signatureRequests?.some(
    (sr) => sr.role === 'landlord' && sr.status !== 'signed'
  );
  const bothPartiesSigned = !tenantNeedsSignature && !landlordPendingSignature && !!activeLease?.signatureRequests?.length;

  return (
    <main className='w-full'>
      <div className='max-w-7xl space-y-4 sm:space-y-6'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-1'>
            Tenant Dashboard
          </h1>
          <p className='text-xs sm:text-sm text-slate-600'>
            Welcome back, {session.user.name}. Manage your rental, payments, and requests.
          </p>
          {tenantNeedsSignature && !bothPartiesSigned && (
            <Badge className='mt-2 bg-amber-500 text-white border border-amber-600'>
              Lease requires your signature
            </Badge>
          )}
          {landlordPendingSignature && !tenantNeedsSignature && !bothPartiesSigned && (
            <Badge className='mt-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'>
              Waiting on landlord signature
            </Badge>
          )}
        </div>

        {/* Lease Pending Signature Alert */}
        {activeLease?.status === 'pending_signature' && tenantNeedsSignature && !bothPartiesSigned && (
          <div className='relative rounded-xl sm:rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-lg overflow-hidden'>
            <div className='relative p-3 sm:p-4 md:p-5 space-y-3'>
              <div className='flex items-start gap-3'>
                <div className='rounded-full bg-amber-500/20 p-2 shrink-0'>
                  <FileSignature className='h-4 w-4 sm:h-5 sm:w-5 text-amber-400' />
                </div>
                <div className='flex-1'>
                  <h3 className='text-sm sm:text-base font-bold text-white'>Application Approved — Sign Your Lease</h3>
                  <p className='text-[10px] sm:text-xs text-slate-400 mt-1'>
                    Your application has been approved. Sign your lease and pay move-in costs to complete.
                  </p>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Link href='/user/profile/lease'>
                  <button className='rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 px-3 py-1.5 text-xs font-bold text-white transition-colors active:scale-[0.98] flex items-center gap-1.5'>
                    <FileSignature className='h-3.5 w-3.5' />
                    Sign Lease
                  </button>
                </Link>
                <Link href='/user/profile/rent-receipts'>
                  <button className='rounded-lg bg-teal-600 hover:bg-teal-500 border border-teal-500/50 px-3 py-1.5 text-xs font-bold text-white transition-colors active:scale-[0.98] flex items-center gap-1.5'>
                    <CreditCard className='h-3.5 w-3.5' />
                    Pay Move-in Costs
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className='rounded-xl sm:rounded-2xl border border-white/10 bg-linear-to-r from-cyan-700 to-cyan-700 shadow-2xl overflow-hidden'>
          <div className='p-3 sm:p-4 md:p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-sm sm:text-base font-bold text-white'>Your Dashboard</h3>
              <span className='text-[10px] text-slate-700 bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/30 font-semibold'>Live</span>
            </div>

            <div className='grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 shadow-2xl shadow-slate-400/30'>
              {/* Pending Rent */}
              <Link
                href='/user/profile/rent-receipts'
                className='group rounded-lg sm:rounded-xl bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 p-2.5 sm:p-3 md:p-4 space-y-1 transition-all duration-200 active:scale-[0.98]'
              >
                <div className='flex items-center justify-between'>
                  <div className='text-[10px] sm:text-xs text-slate-700 font-semibold'>Pending Rent</div>
                  <CreditCard className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700' />
                </div>
                <div className='text-lg sm:text-xl md:text-2xl font-bold text-white'>${totalPendingRent.toFixed(2)}</div>
                <div className='text-[9px] sm:text-[10px] text-slate-600 font-medium'>{pendingRentPayments.length} payment{pendingRentPayments.length !== 1 ? 's' : ''} due</div>
              </Link>

              {/* Maintenance */}
              <Link
                href='/user/profile/ticket'
                className='group rounded-lg sm:rounded-xl bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 p-2.5 sm:p-3 md:p-4 space-y-1 transition-all duration-200 active:scale-[0.98]  shadow-2xl shadow-slate-400/30'
              >
                <div className='flex items-center justify-between'>
                  <div className='text-[10px] sm:text-xs text-slate-700 font-semibold'>Maintenance</div>
                  <Wrench className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400' />
                </div>
                <div className='text-lg sm:text-xl md:text-2xl font-bold text-white'>{openTickets.length}</div>
                <div className='text-[9px] sm:text-[10px] text-slate-600 font-medium'>Open tickets</div>
              </Link>

              {/* Current Lease */}
              <Link
                href='/user/profile/lease'
                className='group rounded-lg sm:rounded-xl bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 p-2.5 sm:p-3 md:p-4 space-y-1 transition-all duration-200 active:scale-[0.98]'
              >
                <div className='flex items-center justify-between'>
                  <div className='text-[10px] sm:text-xs text-slate-700 font-semibold'>Current Lease</div>
                  <Home className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-700' />
                </div>
                <div className='text-lg sm:text-xl md:text-2xl font-bold text-white truncate'>
                  {activeLease ? activeLease.unit.name : '—'}
                </div>
                <div className='text-[9px] sm:text-[10px] text-slate-600 font-medium truncate'>
                  {activeLease ? activeLease.unit.property.name : 'No active lease'}
                </div>
              </Link>

              {/* Applications */}
              <Link
                href='/user/applications'
                className='group rounded-lg sm:rounded-xl bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 p-2.5 sm:p-3 md:p-4 space-y-1 transition-all duration-200 active:scale-[0.98]'
              >
                <div className='flex items-center justify-between'>
                  <div className='text-[10px] sm:text-xs text-slate-700 font-semibold'>Applications</div>
                  <FileText className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-400' />
                </div>
                <div className='text-lg sm:text-xl md:text-2xl font-bold text-white'>View</div>
                <div className='text-[9px] sm:text-[10px] text-slate-600 font-medium'>Check status</div>
              </Link>

              {/* Notifications */}
              <Link
                href='/user/notifications'
                className='group rounded-lg sm:rounded-xl bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 p-2.5 sm:p-3 md:p-4 space-y-1 transition-all duration-200 active:scale-[0.98]'
              >
                <div className='flex items-center justify-between'>
                  <div className='text-[10px] sm:text-xs text-slate-700 font-semibold'>Notifications</div>
                  <Bell className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-700' />
                </div>
                <div className='text-lg sm:text-xl md:text-2xl font-bold text-white'>Alerts</div>
                <div className='text-[9px] sm:text-[10px] text-slate-600 font-medium'>View all</div>
              </Link>

              {/* Profile */}
              <Link
                href='/user/profile'
                className='group rounded-lg sm:rounded-xl bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 p-2.5 sm:p-3 md:p-4 space-y-1 transition-all duration-200 active:scale-[0.98]'
              >
                <div className='flex items-center justify-between'>
                  <div className='text-[10px] sm:text-xs text-slate-700 font-semibold'>Profile</div>
                  <User className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-400' />
                </div>
                <div className='text-lg sm:text-xl md:text-2xl font-bold text-white'>Edit</div>
                <div className='text-[9px] sm:text-[10px] text-slate-600 font-medium'>Update details</div>
              </Link>
            </div>

            {/* Summary Bar */}
            <div className='mt-3 rounded-lg sm:rounded-xl bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 p-2.5 sm:p-3 md:p-4 border border-indigo-500/20'>
              <div className='grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4'>
                <div className='space-y-0.5'>
                  <div className='text-[9px] sm:text-[10px] text-slate-700 font-semibold uppercase tracking-wide'>Monthly Rent</div>
                  <div className='text-xs sm:text-sm font-bold text-white'>
                    {activeLease ? `$${Number(activeLease.rentAmount).toFixed(2)}` : '—'}
                  </div>
                </div>
                <div className='space-y-0.5'>
                  <div className='text-[9px] sm:text-[10px] text-slate-700 font-semibold uppercase tracking-wide'>Lease Status</div>
                  <div className='text-xs sm:text-sm font-bold text-white capitalize'>
                    {activeLease ? activeLease.status.replace('_', ' ') : 'None'}
                  </div>
                </div>
                <div className='space-y-0.5'>
                  <div className='text-[9px] sm:text-[10px] text-slate-700 font-semibold uppercase tracking-wide'>Lease Ends</div>
                  <div className='text-xs sm:text-sm font-bold text-white'>
                    {activeLease?.endDate ? new Date(activeLease.endDate).toLocaleDateString() : 'Month-to-month'}
                  </div>
                </div>
                <div className='space-y-0.5'>
                  <div className='text-[9px] sm:text-[10px] text-slate-700 font-semibold uppercase tracking-wide'>Manager</div>
                  <div className='text-xs sm:text-sm font-bold text-white truncate'>
                    {activeLease?.unit.property.landlord?.name || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* No Lease Message */}
        {!activeLease && (
          <div className='rounded-xl sm:rounded-2xl border border-cyan-600/30 bg-linear-to-r from-cyan-700 to-cyan-700 shadow-lg overflow-hidden'>
            <div className='p-3 sm:p-4 md:p-5 space-y-3'>
              <div className='flex items-start gap-3'>
                <div className='rounded-full bg-indigo-500/20 p-2 shrink-0'>
                  <Home className='h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 mt-0 shrink-0' />
                </div>
                <div>
                  <h3 className='text-md sm:text-base font-bold text-white'>No Active Lease</h3>
                  <p className='text-[10px] sm:text-xs text-slate-300 mt-1'>
                    Browse available properties or check your applications.
                  </p>
                  <div className='flex flex-wrap gap-2 mt-3'>
                    <Link href='/search?category=all'>
                      <button className='rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 px-3 py-1.5 text-xs font-bold text-white transition-colors active:scale-[0.98]'>
                        Browse Properties
                      </button>
                    </Link>
                    <Link href='/user/applications'>
                      <button className='rounded-lg bg-slate-700 hover:bg-slate-600 border border-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors active:scale-[0.98]'>
                        View Applications
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

