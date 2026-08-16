import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Plus, ClipboardList, AlertCircle, CheckCircle2, ChevronRight, PenLine } from 'lucide-react';

export default async function AdminLeasesPage() {
  await requireAdmin();
  const landlordResult = await getOrCreateCurrentLandlord();

  if (!landlordResult.success || !landlordResult.landlord) {
    throw new Error(landlordResult.message || 'Unable to determine landlord');
  }

  const landlordId = landlordResult.landlord.id;

  const leases = await prisma.lease.findMany({
    where: {
      unit: { property: { landlordId } },
    },
    orderBy: { startDate: 'desc' },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      unit: {
        select: {
          name: true,
          type: true,
          property: { select: { name: true } },
        },
      },
      signatureRequests: {
        select: { id: true, status: true, role: true },
      },
    },
  });

  const leasesAwaitingSignature = leases.filter((l) => {
    const landlordPending = l.signatureRequests?.some(
      (sr) => sr.role === 'landlord' && sr.status !== 'signed'
    );
    return landlordPending && l.tenantSignedAt && !l.landlordSignedAt;
  });

  const activeCount = leases.filter((l) => l.status === 'active').length;
  const pendingCount = leases.filter((l) => l.status === 'pending').length;

  return (
    <main className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Leases</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            View active and past leases and sign pending documents
          </p>
        </div>
        <Link
          href='/admin/tenants/add'
          className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md hover:shadow-lg transition-all'
        >
          <Plus className='h-3.5 w-3.5' />
          Add Tenant
        </Link>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-medium'>Total Leases</p>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{leases.length}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-medium'>Active</p>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{activeCount}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-medium'>Pending</p>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{pendingCount}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-medium'>Awaiting Signature</p>
          <p className='text-lg font-bold text-orange-600 mt-0.5'>{leasesAwaitingSignature.length}</p>
        </div>
      </div>

      {/* Signature Alert Banner */}
      {leasesAwaitingSignature.length > 0 && (
        <div className='rounded-xl border border-orange-200 bg-orange-50 p-4'>
          <div className='flex items-start gap-3'>
            <div className='h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0'>
              <PenLine className='h-4 w-4 text-orange-600' />
            </div>
            <div className='flex-1'>
              <h3 className='text-sm font-bold text-orange-800 mb-1'>
                {leasesAwaitingSignature.length} {leasesAwaitingSignature.length === 1 ? 'Lease Awaits' : 'Leases Await'} Your Signature
              </h3>
              <p className='text-[11px] text-orange-600 mb-3'>
                Tenants have signed. Review and sign to complete.
              </p>
              <div className='space-y-2'>
                {leasesAwaitingSignature.map((lease) => (
                  <div key={lease.id} className='flex items-center justify-between bg-white rounded-lg p-2.5 border border-orange-200'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>
                        {lease.tenant?.name || 'Tenant'} — {lease.unit.property?.name} · {lease.unit.name}
                      </p>
                      <p className='text-[10px] text-gray-500'>
                        Tenant signed: {lease.tenantSignedAt ? new Date(lease.tenantSignedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <Link
                      href={`/admin/leases/${lease.id}`}
                      className='ml-2 inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-md transition-all shrink-0'
                    >
                      <PenLine className='h-3 w-3' />
                      Sign Now
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {/* Desktop Table */}
        <div className='hidden md:block overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='bg-gray-50/80'>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Tenant</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Property / Unit</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Start</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>End</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Status</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Signatures</th>
                <th className='text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'></th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {leases.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-4 py-12 text-center'>
                    <ClipboardList className='mx-auto h-10 w-10 text-gray-300 mb-3' />
                    <p className='text-sm text-gray-500'>No leases found</p>
                  </td>
                </tr>
              ) : (
                leases.map((lease) => {
                  const tenantSigned = !!lease.tenantSignedAt;
                  const landlordSigned = !!lease.landlordSignedAt;
                  const bothSigned = tenantSigned && landlordSigned;
                  const landlordPending = lease.signatureRequests?.some(
                    (sr) => sr.role === 'landlord' && sr.status !== 'signed'
                  );

                  return (
                    <tr key={lease.id} className={cn('hover:bg-gray-50/50 transition-colors', landlordPending && 'bg-orange-50/50')}>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2.5'>
                          <div className='h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                            {(lease.tenant?.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className='text-xs font-semibold text-gray-800'>{lease.tenant?.name || 'Tenant'}</p>
                            {lease.tenant?.email && (
                              <p className='text-[10px] text-gray-500'>{lease.tenant.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='text-xs text-gray-700'>{lease.unit.property?.name} · {lease.unit.name}</span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='text-xs text-gray-500'>{new Date(lease.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='text-xs text-gray-500'>{lease.endDate ? new Date(lease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}</span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          lease.status === 'active' ? 'bg-green-50 text-green-600' :
                          lease.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          lease.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {lease.status}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex flex-wrap gap-1'>
                          {bothSigned ? (
                            <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 flex items-center gap-1'>
                              <CheckCircle2 className='h-3 w-3' /> Fully Signed
                            </span>
                          ) : tenantSigned && !landlordSigned ? (
                            <>
                              <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600'>Tenant ✓</span>
                              <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 flex items-center gap-1'>
                                <AlertCircle className='h-3 w-3' /> Sign Now
                              </span>
                            </>
                          ) : (
                            <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500'>Unsigned</span>
                          )}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <Link
                          href={`/admin/leases/${lease.id}`}
                          className={cn(
                            'text-[11px] font-medium flex items-center gap-0.5 justify-end',
                            tenantSigned && !landlordSigned
                              ? 'text-orange-600 hover:text-orange-700'
                              : 'text-cyan-600 hover:text-cyan-700'
                          )}
                        >
                          {tenantSigned && !landlordSigned ? 'Sign' : 'View'} <ChevronRight className='h-3 w-3' />
                        </Link>
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
          {leases.length === 0 ? (
            <div className='p-8 text-center'>
              <ClipboardList className='mx-auto h-10 w-10 text-gray-300 mb-3' />
              <p className='text-sm text-gray-500'>No leases found</p>
            </div>
          ) : (
            leases.map((lease) => {
              const tenantSigned = !!lease.tenantSignedAt;
              const landlordSigned = !!lease.landlordSignedAt;
              const bothSigned = tenantSigned && landlordSigned;
              const landlordPending = lease.signatureRequests?.some(
                (sr) => sr.role === 'landlord' && sr.status !== 'signed'
              );

              return (
                <Link
                  key={lease.id}
                  href={`/admin/leases/${lease.id}`}
                  className={cn(
                    'flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors active:scale-[0.99]',
                    landlordPending && 'bg-orange-50/50'
                  )}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    landlordPending ? 'bg-orange-100 text-orange-600' :
                    lease.status === 'active' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    <ClipboardList className='h-4 w-4' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800 truncate'>
                      {lease.tenant?.name || 'Tenant'}
                    </p>
                    <p className='text-[10px] text-gray-500'>
                      {lease.unit.property?.name} · {lease.unit.name}
                    </p>
                    <p className='text-[10px] text-gray-400'>
                      {new Date(lease.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {lease.endDate ? ` – ${new Date(lease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ' – Ongoing'}
                    </p>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      lease.status === 'active' ? 'bg-green-50 text-green-600' :
                      lease.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {lease.status}
                    </span>
                    {bothSigned && (
                      <span className='text-[9px] text-green-600 font-medium'>Fully Signed</span>
                    )}
                    {tenantSigned && !landlordSigned && (
                      <span className='text-[9px] text-orange-600 font-semibold'>Sign Now</span>
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
