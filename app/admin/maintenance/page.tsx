import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { Wrench, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export default async function AdminMaintenancePage() {
  await requireAdmin();
  const landlordResult = await getOrCreateCurrentLandlord();

  if (!landlordResult.success || !landlordResult.landlord) {
    throw new Error(landlordResult.message || 'Unable to determine landlord');
  }

  const landlordId = landlordResult.landlord.id;

  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      unit: { property: { landlordId } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
    },
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const completedCount = tickets.filter((t) => t.status === 'completed').length;
  const urgentCount = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;

  return (
    <main className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Maintenance</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            View and manage work requests from tenants
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Open</p>
            <div className='h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center'>
              <Clock className='h-3 w-3 text-blue-600' />
            </div>
          </div>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{openCount}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>In Progress</p>
            <div className='h-6 w-6 rounded-md bg-violet-100 flex items-center justify-center'>
              <Wrench className='h-3 w-3 text-violet-600' />
            </div>
          </div>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{inProgressCount}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Completed</p>
            <div className='h-6 w-6 rounded-md bg-green-100 flex items-center justify-center'>
              <CheckCircle2 className='h-3 w-3 text-green-600' />
            </div>
          </div>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{completedCount}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Urgent</p>
            <div className='h-6 w-6 rounded-md bg-red-100 flex items-center justify-center'>
              <AlertTriangle className='h-3 w-3 text-red-600' />
            </div>
          </div>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{urgentCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {/* Desktop Table */}
        <div className='hidden md:block overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='bg-gray-50/80'>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Created</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Title</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Tenant</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Priority</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Status</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Assigned</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50 [&>tr]:relative'>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className='px-4 py-12 text-center'>
                    <Wrench className='mx-auto h-10 w-10 text-gray-300 mb-3' />
                    <p className='text-sm text-gray-500'>No maintenance tickets yet</p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const assignedToName = ticket.assignedToName ?? null;
                  return (
                    <tr
                      key={ticket.id}
                      className='hover:bg-gray-50/60 transition-colors cursor-pointer'
                    >
                      <td className='px-4 py-3'>
                        <Link href={`/admin/maintenance/${ticket.id}`} className='absolute inset-0' aria-label={ticket.title} />
                        <span className='text-[11px] text-gray-500'>
                          {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className='px-4 py-3 relative'>
                        <p className='text-xs font-semibold text-gray-800 group-hover:text-cyan-600 transition-colors'>
                          {ticket.title}
                        </p>
                        {ticket.description && (
                          <p className='text-[10px] text-gray-400 line-clamp-1 mt-0.5'>{ticket.description}</p>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <div className='h-6 w-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0'>
                            {(ticket.tenant?.name || '?')[0].toUpperCase()}
                          </div>
                          <p className='text-[11px] font-medium text-gray-700'>{ticket.tenant?.name || 'Unknown'}</p>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          ticket.priority === 'urgent' ? 'bg-red-50 text-red-600' :
                          ticket.priority === 'high' ? 'bg-orange-50 text-orange-600' :
                          ticket.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          ticket.status === 'completed' ? 'bg-green-50 text-green-600' :
                          ticket.status === 'in_progress' ? 'bg-violet-50 text-violet-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className={`text-[11px] ${assignedToName ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {assignedToName || 'Unassigned'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className='md:hidden divide-y divide-gray-100'>
          {tickets.length === 0 ? (
            <div className='p-8 text-center'>
              <Wrench className='mx-auto h-10 w-10 text-gray-300 mb-3' />
              <p className='text-sm text-gray-500'>No maintenance tickets yet</p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const assignedToName = ticket.assignedToName ?? null;
              return (
                <Link
                  key={ticket.id}
                  href={`/admin/maintenance/${ticket.id}`}
                  className='flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors active:scale-[0.99]'
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    ticket.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                    ticket.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <Wrench className='h-4 w-4' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800 truncate'>{ticket.title}</p>
                    <p className='text-[10px] text-gray-500'>
                      {ticket.tenant?.name || 'Unknown'} · {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      ticket.status === 'completed' ? 'bg-green-50 text-green-600' :
                      ticket.status === 'in_progress' ? 'bg-violet-50 text-violet-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                    {ticket.priority === 'urgent' && (
                      <span className='text-[9px] font-semibold text-red-500'>Urgent</span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
