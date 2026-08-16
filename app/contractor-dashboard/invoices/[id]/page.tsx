import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { InvoiceDetailClient } from '@/components/contractor/invoice-detail-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Invoice Details',
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  const invoice = await prisma.contractorInvoice.findFirst({
    where: {
      id: params.id,
      contractorId: contractorProfile.id,
    },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailClient invoice={invoice} />;
}
