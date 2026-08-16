import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';
import ContractorDocumentsClient from './documents-client';

export const metadata: Metadata = { title: 'Document Center' };

export default async function ContractorDocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractorAuth = await resolveContractorAuth(session.user.id);
  if (!contractorAuth) redirect('/onboarding/contractor');

  const db = prisma as any;
  const contractorId = contractorAuth.contractorId;

  // Fetch all data in parallel
  const [contracts, documents, expenses, jobs] = await Promise.all([
    // Contracts
    db.contractorContract.findMany({
      where: { contractorId },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        type: true,
        status: true,
        customerName: true,
        customerEmail: true,
        contractAmount: true,
        sentAt: true,
        signedAt: true,
        expiresAt: true,
        createdAt: true,
        job: { select: { title: true, jobNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    // Uploaded documents (receipts, templates, etc.)
    db.contractorDocument.findMany({
      where: { contractorId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    // Expenses (for receipts tab)
    db.contractorExpense.findMany({
      where: { contractorId },
      select: {
        id: true,
        category: true,
        description: true,
        amount: true,
        vendor: true,
        expenseDate: true,
        receiptUrl: true,
        status: true,
        createdAt: true,
        job: { select: { title: true, jobNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    // Jobs for linking
    db.contractorJob.findMany({
      where: { contractorId, status: { notIn: ['cancelled', 'paid'] } },
      select: { id: true, title: true, jobNumber: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  // Contractor profile info for the builder
  const profile = await db.contractorProfile.findUnique({
    where: { id: contractorId },
    select: {
      businessName: true,
      email: true,
      phone: true,
      licenseNumber: true,
      insuranceProvider: true,
      baseCity: true,
      baseState: true,
      user: { select: { name: true, email: true } },
    },
  });

  const contractorInfo = {
    businessName: profile?.businessName || '',
    legalName: profile?.user?.name || '',
    address: [profile?.baseCity, profile?.baseState].filter(Boolean).join(', ') || '',
    email: profile?.email || profile?.user?.email || '',
    phone: profile?.phone || '',
    licenseNumber: profile?.licenseNumber || undefined,
    insurancePolicy: profile?.insuranceProvider || undefined,
  };

  return (
    <ContractorDocumentsClient
      contracts={JSON.parse(JSON.stringify(contracts))}
      documents={JSON.parse(JSON.stringify(documents))}
      expenses={JSON.parse(JSON.stringify(expenses))}
      jobs={JSON.parse(JSON.stringify(jobs))}
      contractor={contractorInfo}
      appUrl={process.env.NEXT_PUBLIC_APP_URL || ''}
    />
  );
}
