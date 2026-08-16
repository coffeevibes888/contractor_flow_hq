import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { notFound } from 'next/navigation';
import PaymentClient from './payment-client';

export default async function JobPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bidId?: string }>;
}) {
  const session = await auth();
  const { id: jobId } = await params;
  const { bidId } = await searchParams;

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  // Get homeowner profile
  const homeowner = await prisma.homeowner.findUnique({
    where: { userId: session.user.id },
  });

  if (!homeowner) {
    return redirect('/homeowner/dashboard');
  }

  // Get work order with accepted bid
  const workOrder = await prisma.homeownerWorkOrder.findFirst({
    where: {
      id: jobId,
      homeownerId: homeowner.id,
    },
    include: {
      bids: {
        where: bidId ? { id: bidId } : { status: 'accepted' },
      },
    },
  });

  if (!workOrder) {
    return notFound();
  }

  const acceptedBid = workOrder.bids[0];

  if (!acceptedBid) {
    return redirect(`/homeowner/jobs/${jobId}`);
  }

  // Get contractor details
  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: acceptedBid.contractorId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
    },
  });

  return (
    <PaymentClient
      workOrder={workOrder}
      bid={acceptedBid}
      contractor={contractor}
      currentUser={{
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
      }}
    />
  );
}
