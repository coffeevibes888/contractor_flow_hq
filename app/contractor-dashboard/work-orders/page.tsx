import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { ClipboardList, CheckCircle, Clock, AlertCircle, Info, ArrowRight, Building2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';
import { getContractorOwnerUserIdForUser } from '@/lib/contractor-profile';

export default async function ContractorWorkOrdersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  // Allow both contractor owners and active employees with jobs.view permission
  const contractorAuth = await resolveContractorAuth(session.user.id);
  if (!contractorAuth) {
    return redirect('/onboarding/contractor');
  }
  if (!can(contractorAuth, 'jobs.view')) {
    return redirect('/contractor-dashboard');
  }

  // The legacy `Contractor` model (landlord-contractor service relationship)
  // keys off the OWNER's userId. Employees see the contractor business's
  // landlord relationships, not their personal ones.
  const ownerUserId = await getContractorOwnerUserIdForUser(session.user.id);
  if (!ownerUserId) return redirect('/onboarding/contractor');

  const contractors = await prisma.contractor.findMany({
    where: { userId: ownerUserId },
    select: { id: true, landlordId: true },
  });

  const contractorIds = contractors.map((c) => c.id);

  const workOrders = await prisma.workOrder.findMany({
    where: { contractorId: { in: contractorIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      property: { select: { name: true, address: true } },
      landlord: { select: { name: true, companyName: true } },
    },
  });

  const statusGroups = {
    pending: workOrders.filter((wo) => wo.status === 'assigned' || wo.status === 'draft'),
    inProgress: workOrders.filter((wo) => wo.status === 'in_progress'),
    completed: workOrders.filter((wo) => ['completed', 'approved', 'paid'].includes(wo.status)),
  };

  const priorityConfig: Record<string, { bg: string; text: string }> = {
    urgent: { bg: 'bg-red-50', text: 'text-red-600' },
    high: { bg: 'bg-orange-50', text: 'text-orange-600' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-600' },
    low: { bg: 'bg-gray-100', text: 'text-gray-500' },
  };

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Draft' },
    assigned: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Assigned' },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'In Progress' },
    completed: { bg: 'bg-cyan-50', text: 'text-cyan-600', label: 'Completed' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Approved' },
    paid: { bg: 'bg-green-50', text: 'text-green-600', label: 'Paid' },
  };

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Work Orders</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Jobs assigned to you by property managers
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className='flex items-start gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50'>
        <div className='p-1.5 rounded-lg bg-blue-100 shrink-0'>
          <Info className='h-4 w-4 text-blue-600' />
        </div>
        <div>
          <p className='text-xs font-semibold text-blue-800'>What are Work Orders?</p>
          <p className='text-xs text-blue-700 mt-0.5 leading-relaxed'>
            Work orders come from <span className='font-semibold'>property managers and landlords</span> for maintenance or repairs on their properties. Payment is held in escrow and released when work is approved.{' '}
            Looking for your own client projects? Those are in{' '}
            <Link href='/contractor-dashboard/jobs' className='underline font-medium'>Jobs</Link>.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-amber-400 to-orange-400 opacity-10 rounded-bl-full' />
          <div className='flex items-center gap-3'>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white'>
              <AlertCircle className='h-4 w-4' />
            </div>
            <div>
              <p className='text-[10px] text-gray-500 font-medium'>Pending</p>
              <p className='text-2xl font-bold text-gray-900'>{statusGroups.pending.length}</p>
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-blue-400 to-indigo-400 opacity-10 rounded-bl-full' />
          <div className='flex items-center gap-3'>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white'>
              <Clock className='h-4 w-4' />
            </div>
            <div>
              <p className='text-[10px] text-gray-500 font-medium'>In Progress</p>
              <p className='text-2xl font-bold text-gray-900'>{statusGroups.inProgress.length}</p>
            </div>
          </div>
        </div>
        <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
          <div className='absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-emerald-400 to-cyan-400 opacity-10 rounded-bl-full' />
          <div className='flex items-center gap-3'>
            <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white'>
              <CheckCircle className='h-4 w-4' />
            </div>
            <div>
              <p className='text-[10px] text-gray-500 font-medium'>Completed</p>
              <p className='text-2xl font-bold text-gray-900'>{statusGroups.completed.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Work Orders List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Work Orders</h3>
          <span className='text-xs text-gray-400'>{workOrders.length} total</span>
        </div>
        {workOrders.length === 0 ? (
          <div className='p-10 text-center'>
            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center'>
              <ClipboardList className='h-7 w-7 text-gray-300' />
            </div>
            <h3 className='text-base font-bold text-gray-800 mb-1'>No work orders yet</h3>
            <p className='text-sm text-gray-500 mb-4 max-w-sm mx-auto'>
              Work orders appear here when property managers assign maintenance or repair jobs to you.
            </p>
            <Link
              href='/contractors?view=jobs'
              className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm'
            >
              Browse Open Jobs
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {workOrders.map((order) => {
              const pc = priorityConfig[order.priority] || { bg: 'bg-gray-100', text: 'text-gray-500' };
              const sc = statusConfig[order.status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: order.status };
              return (
                <Link
                  key={order.id}
                  href={`/contractor-dashboard/work-orders/${order.id}`}
                  className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'
                >
                  <div className='h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0'>
                    <Building2 className='h-4 w-4 text-blue-500' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>{order.title}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pc.bg} ${pc.text} capitalize shrink-0`}>
                        {order.priority}
                      </span>
                    </div>
                    <p className='text-[10px] text-gray-500 mt-0.5'>
                      {order.property.name} · {order.landlord.companyName || order.landlord.name}
                    </p>
                  </div>
                  <div className='text-right shrink-0'>
                    <p className='text-xs font-bold text-gray-800'>
                      {order.agreedPrice ? formatCurrency(Number(order.agreedPrice)) : 'TBD'}
                    </p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                  <ChevronRight className='h-4 w-4 text-gray-300 shrink-0' />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
