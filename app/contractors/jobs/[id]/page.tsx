import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import JobDetailClient from './job-detail-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.workOrder.findUnique({
    where: { id, isOpenBid: true },
    select: { title: true, description: true },
  });

  if (!job) {
    return { title: 'Job Not Found' };
  }

  return {
    title: `${job.title} | Contractor Jobs`,
    description: job.description.substring(0, 160),
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const job = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      property: {
        select: {
          name: true,
          address: true,
          type: true,
        },
      },
      unit: {
        select: { name: true },
      },
      landlord: {
        select: {
          id: true,
          name: true,
          companyName: true,
          logoUrl: true,
          createdAt: true,
          _count: {
            select: { 
              workOrders: true,
              properties: true,
            },
          },
        },
      },
      media: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          type: true,
          caption: true,
          phase: true,
        },
      },
      bids: {
        include: {
          contractor: {
            select: {
              id: true,
              name: true,
              specialties: true,
              isPaymentReady: true,
              user: {
                select: { image: true },
              },
              _count: {
                select: { workOrders: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { bids: true, media: true },
      },
    },
  });

  if (!job || (!job.isOpenBid && job.status !== 'open')) {
    notFound();
  }

  // Check if current user is a contractor and has already bid
  let myBid = null;
  let myContractorId = null;
  if (session?.user?.id) {
    const contractor = await prisma.contractor.findFirst({
      where: { userId: session.user.id },
    });
    if (contractor) {
      myContractorId = contractor.id;
      myBid = job.bids.find(b => b.contractorId === contractor.id) || null;
    }
  }

  // Get similar jobs
  const similarJobs = await prisma.workOrder.findMany({
    where: {
      isOpenBid: true,
      status: 'open',
      id: { not: job.id },
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      budgetMin: true,
      budgetMax: true,
      priority: true,
      createdAt: true,
      property: {
        select: { address: true },
      },
      _count: {
        select: { bids: true },
      },
    },
  });

  // Calculate lowest bid
  const lowestBidAmount = job.bids.length > 0 
    ? Math.min(...job.bids.map(b => Number(b.amount)))
    : null;

  return (
    <JobDetailClient
      lowestBidAmount={lowestBidAmount}
      lifecycle={{
        status: job.lifecycleStatus as any,
        escrowAmount: job.escrowAmount ? Number(job.escrowAmount) : null,
        pmApprovalDeadline: job.pmApprovalDeadline?.toISOString() || null,
        scheduledDate: job.scheduledDate?.toISOString() || null,
        acceptedBidId: job.acceptedBidId,
      }}
      job={{
        id: job.id,
        title: job.title,
        description: job.description,
        priority: job.priority,
        status: job.status,
        budgetMin: job.budgetMin?.toString() || null,
        budgetMax: job.budgetMax?.toString() || null,
        bidDeadline: job.bidDeadline?.toISOString() || null,
        scheduledDate: job.scheduledDate?.toISOString() || null,
        createdAt: job.createdAt.toISOString(),
        property: {
          name: job.property.name,
          type: job.property.type,
          city: (job.property.address as any)?.city || '',
          state: (job.property.address as any)?.state || '',
        },
        unit: job.unit?.name || null,
        landlord: {
          id: job.landlord.id,
          name: job.landlord.companyName || job.landlord.name,
          logo: job.landlord.logoUrl,
          memberSince: job.landlord.createdAt.toISOString(),
          totalJobs: job.landlord._count.workOrders,
          totalProperties: job.landlord._count.properties,
        },
        media: job.media.map(m => ({
          id: m.id,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          type: m.type,
          caption: m.caption,
        })),
        mediaCount: job._count.media,
        bidCount: job._count.bids,
      }}
      myBid={myBid ? {
        id: myBid.id,
        amount: myBid.amount.toString(),
        laborCost: myBid.laborCost?.toString() || null,
        materialsCost: myBid.materialsCost?.toString() || null,
        estimatedHours: myBid.estimatedHours?.toString() || null,
        proposedStartDate: myBid.proposedStartDate?.toISOString() || null,
        estimatedCompletionDate: myBid.estimatedCompletionDate?.toISOString() || null,
        inclusions: myBid.inclusions || [],
        exclusions: myBid.exclusions || [],
        warrantyDays: myBid.warrantyDays ?? null,
        willPullPermits: myBid.willPullPermits ?? null,
        paymentTerms: myBid.paymentTerms || null,
        validUntil: myBid.validUntil?.toISOString() || null,
        message: myBid.message,
        status: myBid.status,
        createdAt: myBid.createdAt.toISOString(),
      } : null}
      myContractorId={myContractorId}
      currentUserId={session?.user?.id || null}
      isLoggedIn={!!session?.user}
      isContractor={session?.user?.role === 'contractor'}
      similarJobs={similarJobs.map(j => ({
        id: j.id,
        title: j.title,
        budgetMin: j.budgetMin?.toString() || null,
        budgetMax: j.budgetMax?.toString() || null,
        priority: j.priority,
        city: (j.property.address as any)?.city || '',
        bidCount: j._count.bids,
        createdAt: j.createdAt.toISOString(),
      }))}
    />
  );
}
