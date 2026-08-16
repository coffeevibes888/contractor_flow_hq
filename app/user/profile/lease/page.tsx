import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import SignButton from './sign-button';
import LeaseViewer from './lease-viewer';
import { renderLeaseHtml } from '@/lib/services/lease-template';

export default async function UserProfileLeasePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id as string;

  const lease = await prisma.lease.findFirst({
    where: {
      tenantId: userId,
      status: { in: ['active', 'pending_signature'] },
    },
    orderBy: { startDate: 'desc' },
    include: {
      unit: {
        select: {
          name: true,
          type: true,
          property: { select: { name: true, landlord: { select: { name: true } } } },
        },
      },
      signatureRequests: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Get the most recent signed PDF URL (could be from tenant or landlord signature)
  // For a fully executed lease, we want the landlord's signed PDF (which includes both signatures)
  // Otherwise fall back to tenant's signed PDF
  // Cast to include new signature data fields
  const signatureRequests = lease?.signatureRequests as Array<{
    id: string;
    role: string;
    status: string;
    recipientName: string;
    recipientEmail: string;
    signerName: string | null;
    signedAt: Date | null;
    signedPdfUrl: string | null;
    signatureDataUrl?: string | null;
    initialsDataUrl?: string | null;
  }> | undefined;
  
  const landlordSignedRequest = signatureRequests?.find(sr => sr.role === 'landlord' && sr.status === 'signed');
  const tenantSignedRequest = signatureRequests?.find(sr => sr.role === 'tenant' && sr.status === 'signed');
  const signedRequest = landlordSignedRequest || tenantSignedRequest;
  
  // Generate a signed URL for authenticated Cloudinary PDFs
  const rawPdfUrl = signedRequest?.signedPdfUrl || null;
  // Use proxy API for PDF viewing (handles authentication properly for iframes)
  const signedPdfUrl = rawPdfUrl && lease ? `/api/leases/${lease.id}/pdf` : null;
  
  // Check if tenant needs to sign
  const tenantSignatureRequest = lease?.signatureRequests?.find(
    sr => sr.role === 'tenant' && sr.recipientEmail === session.user.email
  );
  const needsTenantSignature = tenantSignatureRequest && tenantSignatureRequest.status !== 'signed';
  const isPendingSignature = lease?.status === 'pending_signature';

  let leaseHtml = lease
    ? renderLeaseHtml({
        landlordName: lease.unit.property?.landlord?.name || lease.unit.property?.name || 'Landlord',
        tenantName: session.user.name || 'Tenant',
        propertyLabel: `${lease.unit.property?.name || 'Property'} - ${lease.unit.name} (${lease.unit.type})`,
        leaseStartDate: new Date(lease.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        leaseEndDate: lease.endDate
          ? new Date(lease.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'Month-to-Month',
        rentAmount: Number(lease.rentAmount).toLocaleString(),
        billingDayOfMonth: String(lease.billingDayOfMonth),
        todayDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      })
    : '';

  // Replace signature placeholders with actual images if available
  if (lease && leaseHtml) {
    // Tenant signature
    if (tenantSignedRequest) {
      if (tenantSignedRequest.signatureDataUrl) {
        const sigImgTag = `<img src="${tenantSignedRequest.signatureDataUrl}" alt="Tenant Signature" style="height: 40px; display: inline-block; vertical-align: middle;" />`;
        leaseHtml = leaseHtml.replace('/sig_tenant/', sigImgTag);
      } else {
        const tenantSignedDate = tenantSignedRequest.signedAt 
          ? new Date(tenantSignedRequest.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'N/A';
        const tenantSigHtml = `<div style="display: inline-block; padding: 8px 16px; background: #dcfce7; border: 1px solid #86efac; border-radius: 8px;">
          <span style="color: #166534; font-size: 14px; font-weight: 500;">✓ Signed by ${tenantSignedRequest.signerName || session.user.name || 'Tenant'}</span>
          <span style="color: #166534; font-size: 12px; display: block;">${tenantSignedDate}</span>
        </div>`;
        leaseHtml = leaseHtml.replace('/sig_tenant/', tenantSigHtml);
      }
      
      // Tenant initials
      for (let i = 1; i <= 6; i++) {
        const initPlaceholder = `/init${i}/`;
        if (leaseHtml.includes(initPlaceholder)) {
          if (tenantSignedRequest.initialsDataUrl) {
            const initImgTag = `<img src="${tenantSignedRequest.initialsDataUrl}" alt="Initials" style="height: 24px; display: inline-block; vertical-align: middle;" />`;
            leaseHtml = leaseHtml.replace(initPlaceholder, initImgTag);
          } else {
            const initialHtml = `<span style="display: inline-block; padding: 2px 8px; background: #dcfce7; border: 1px solid #86efac; border-radius: 4px; color: #166534; font-size: 12px; font-weight: 500;">✓</span>`;
            leaseHtml = leaseHtml.replace(initPlaceholder, initialHtml);
          }
        }
      }
    }
    
    // Landlord signature
    if (landlordSignedRequest) {
      if (landlordSignedRequest.signatureDataUrl) {
        const sigImgTag = `<img src="${landlordSignedRequest.signatureDataUrl}" alt="Landlord Signature" style="height: 40px; display: inline-block; vertical-align: middle;" />`;
        leaseHtml = leaseHtml.replace('/sig_landlord/', sigImgTag);
      } else {
        const landlordSignedDate = landlordSignedRequest.signedAt 
          ? new Date(landlordSignedRequest.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'N/A';
        const landlordSigHtml = `<div style="display: inline-block; padding: 8px 16px; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px;">
          <span style="color: #1e40af; font-size: 14px; font-weight: 500;">✓ Signed by ${landlordSignedRequest.signerName || lease.unit.property?.landlord?.name || 'Landlord'}</span>
          <span style="color: #1e40af; font-size: 12px; display: block;">${landlordSignedDate}</span>
        </div>`;
        leaseHtml = leaseHtml.replace('/sig_landlord/', landlordSigHtml);
      }
    }
  }

  return (
    <div className='w-full min-h-screen px-4 py-8 md:px-8'>
      <div className='max-w-5xl mx-auto space-y-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-3xl md:text-4xl font-bold text-slate-800'>Current Lease</h1>
          <p className='text-sm md:text-base text-slate-600'>
            Review the key details of your active rental agreement.
          </p>
        </div>

        {!lease ? (
          <div className='bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-xl px-6 py-8 shadow-lg text-sm text-slate-300'>
            You don&apos;t have an active lease on file yet. Please contact management if you believe this is a mistake.
          </div>
        ) : (
          <>
            {/* Pending Signature Banner */}
            {isPendingSignature && (
              <div className='backdrop-blur-md bg-amber-500/20 border border-amber-400/50 rounded-xl px-6 py-4 shadow-lg'>
                <div className='flex items-start gap-3'>
                  <div className='rounded-full bg-amber-500/30 p-2 mt-0.5'>
                    <svg className='h-5 w-5 text-amber-300' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' />
                    </svg>
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-base font-semibold text-amber-100'>Lease Awaiting Signature</h3>
                    <p className='text-sm text-amber-200/80 mt-1'>
                      {needsTenantSignature 
                        ? 'Your application has been approved! Please review and sign your lease agreement below to complete your move-in process.'
                        : 'Your lease is pending final signatures. You can still proceed with move-in payments.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className='bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-xl p-8 shadow-lg space-y-6 text-sm text-slate-100'>
            <div className='space-y-2'>
              <p className='text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>Property</p>
              <p className='text-base md:text-lg font-medium text-white'>
                {lease.unit.property?.name || 'Property'} • {lease.unit.name}
              </p>
              <p className='text-xs text-slate-500'>{lease.unit.type}</p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/10'>
              <div className='space-y-1'>
                <p className='text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>Start date</p>
                <p className='text-sm md:text-base'>
                  {new Date(lease.startDate).toLocaleDateString()}
                </p>
              </div>
              <div className='space-y-1'>
                <p className='text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>End date</p>
                <p className='text-sm md:text-base'>
                  {lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'Ongoing'}
                </p>
              </div>
              <div className='space-y-1'>
                <p className='text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>Monthly rent</p>
                <p className='text-sm md:text-base font-semibold text-white'>
                  ${Number(lease.rentAmount).toLocaleString()}
                </p>
              </div>
              <div className='space-y-1'>
                <p className='text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>Billing day</p>
                <p className='text-sm md:text-base'>Day {lease.billingDayOfMonth} of each month</p>
              </div>
            </div>

            <div className='pt-6 mt-2 border-t border-white/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <p className='text-xs md:text-sm text-slate-400 md:max-w-xl'>
                This summary is for convenience only. For the full legal agreement, review and sign the electronic lease
                document.
              </p>
              <div className='flex gap-3'>
                <LeaseViewer 
                  leaseHtml={leaseHtml} 
                  signedPdfUrl={signedPdfUrl} 
                  triggerLabel='View lease' 
                />
                <SignButton leaseId={lease.id} />
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
