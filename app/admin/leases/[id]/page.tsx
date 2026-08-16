import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import LandlordSignButton from './landlord-sign-button';

interface AdminLeaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminLeaseDetailPage({ params }: AdminLeaseDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const lease = await prisma.lease.findUnique({
    where: { id },
    include: {
      tenant: {
        select: { name: true, email: true },
      },
      unit: {
        select: {
          name: true,
          type: true,
          property: { select: { name: true } },
        },
      },
      signatureRequests: {
        select: { role: true, status: true, signedAt: true },
      },
    },
  });

  if (!lease) {
    return (
      <main className='w-full min-h-[calc(100vh-4rem)] flex items-center justify-center'>
        <p className='text-slate-500'>Lease not found.</p>
      </main>
    );
  }

  const tenantSignature = lease.signatureRequests?.find((sr) => sr.role === 'tenant');
  const landlordSignature = lease.signatureRequests?.find((sr) => sr.role === 'landlord');
  
  const tenantSigned = tenantSignature?.status === 'signed';
  const landlordSigned = landlordSignature?.status === 'signed';
  const awaitingLandlordSignature = tenantSigned && !landlordSigned;

  return (
    <main className='w-full px-4 py-8 md:px-0'>
      <div className='max-w-3xl mx-auto space-y-6'>
        <div>
          <h1 className='text-2xl md:text-3xl font-semibold text-white mb-1'>Lease Document</h1>
          <p className='text-sm text-slate-400'>Review and manage lease agreement.</p>
        </div>

        {awaitingLandlordSignature && (
          <div className='rounded-xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-6 space-y-4'>
            <div className='flex items-start gap-3'>
              <div className='flex-shrink-0 w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center'>
                <Bell className='h-6 w-6 animate-pulse' />
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-white mb-2 text-lg'>
                  Lease Requires Your Signature
                </h3>
                <p className='text-sm text-slate-200 mb-4'>
                  {lease.tenant?.name || 'The tenant'} signed this lease{' '}
                  {tenantSignature?.signedAt ? `on ${new Date(tenantSignature.signedAt).toLocaleDateString()}` : ''}.
                  Please review and sign to complete the agreement.
                </p>
                <LandlordSignButton leaseId={lease.id} />
              </div>
            </div>
          </div>
        )}

        <section className='rounded-xl border border-white/10 bg-slate-900/60 shadow-lg p-6 space-y-4 text-sm text-slate-300'>
          <header className='space-y-1 border-b border-white/10 pb-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs font-semibold text-slate-400 uppercase tracking-wide'>Property</p>
                <p className='text-sm text-slate-100'>
                  {lease.unit.property?.name || 'Property'} • {lease.unit.name}
                </p>
                <p className='text-xs text-slate-400'>{lease.unit.type}</p>
              </div>
              <div className='flex flex-col gap-2 items-end'>
                {tenantSigned && (
                  <Badge className='bg-emerald-500/20 text-emerald-300 border-emerald-400/50'>
                    Tenant Signed
                  </Badge>
                )}
                {landlordSigned && (
                  <Badge className='bg-emerald-500/20 text-emerald-300 border-emerald-400/50'>
                    Landlord Signed
                  </Badge>
                )}
                {!tenantSigned && !landlordSigned && (
                  <Badge className='bg-slate-500/20 text-slate-300 border-slate-400/50'>
                    Pending Signatures
                  </Badge>
                )}
              </div>
            </div>
          </header>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wide'>Tenant</p>
              <p className='text-slate-100'>{lease.tenant?.name || 'Tenant'}</p>
              {lease.tenant?.email && <p className='text-xs text-slate-400'>{lease.tenant.email}</p>}
            </div>
            <div>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wide'>Lease dates</p>
              <p className='text-slate-100'>
                {new Date(lease.startDate).toLocaleDateString()} –{' '}
                {lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'Ongoing'}
              </p>
            </div>
            <div>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wide'>Monthly rent</p>
              <p className='text-slate-100'>${Number(lease.rentAmount).toLocaleString()}</p>
            </div>
            <div>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wide'>Billing day</p>
              <p className='text-slate-100'>Day {lease.billingDayOfMonth} of each month</p>
            </div>
          </div>

          {(tenantSigned || landlordSigned) && (
            <div className='pt-4 border-t border-white/10 space-y-2'>
              <p className='text-xs font-semibold text-slate-400 uppercase tracking-wide'>Signature History</p>
              {tenantSigned && tenantSignature?.signedAt && (
                <p className='text-xs text-slate-300'>
                  <strong className='text-slate-100'>Tenant:</strong> Signed on {new Date(tenantSignature.signedAt).toLocaleString()}
                </p>
              )}
              {landlordSigned && landlordSignature?.signedAt && (
                <p className='text-xs text-slate-300'>
                  <strong className='text-slate-100'>Landlord:</strong> Signed on {new Date(landlordSignature.signedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className='pt-4 border-t border-white/10 text-xs text-slate-400 leading-relaxed space-y-2'>
            <p>
              This is a lease summary generated by the system. Use this together with your signed lease documents and any state-specific addenda.
            </p>
            <p>
              Landlord and tenant agree to the terms of the full lease agreement, including rent amount, due dates,
              late fees, house rules, and all attached addenda.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
