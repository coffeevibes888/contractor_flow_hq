import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { SubcontractorDetailClient } from './subcontractor-detail-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = { title: 'Subcontractor | Contractor Dashboard' };

export default async function SubcontractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const { id } = await params;

  const profile = await getContractorProfileForUser(session.user.id, {
    id: true,
  });
  if (!profile) redirect('/onboarding/contractor');

  const db = prisma as any;

  // Fetch the subcontractor — if this fails the record doesn't exist
  let sub: any = null;
  try {
    sub = await db.contractorSubcontractor.findFirst({
      where: { id, contractorId: profile.id },
    });
  } catch (err) {
    console.error('[subcontractor page] findFirst error:', err);
  }

  if (!sub) notFound();

  // All secondary queries are wrapped individually so a missing table
  // (e.g. ContractorSubcontractorPayment not yet migrated) doesn't crash the page
  const [assignments, payments, jobs] = await Promise.all([
    db.contractorSubcontractorAssignment
      .findMany({
        where: { subcontractorId: id, contractorId: profile.id },
        include: {
          job: {
            select: {
              id: true, title: true, jobNumber: true, status: true,
              address: true, city: true, state: true,
              estimatedStartDate: true, estimatedEndDate: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      })
      .catch((err: any) => {
        console.error('[subcontractor page] assignments error:', err?.message);
        return [];
      }),

    db.contractorSubcontractorPayment
      .findMany({
        where: { subcontractorId: id, contractorId: profile.id },
        orderBy: { paidAt: 'desc' },
      })
      .catch((err: any) => {
        // Table may not exist yet — return empty array gracefully
        console.warn('[subcontractor page] payments table not ready:', err?.message);
        return [];
      }),

    db.contractorJob
      .findMany({
        where: {
          contractorId: profile.id,
          status: { in: ['approved', 'scheduled', 'in_progress'] },
        },
        select: { id: true, title: true, jobNumber: true, status: true },
        orderBy: { estimatedStartDate: 'asc' },
        take: 50,
      })
      .catch((err: any) => {
        console.error('[subcontractor page] jobs error:', err?.message);
        return [];
      }),
  ]);

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const ytdTotal = (payments as any[])
    .filter((p) => p.paidAt && new Date(p.paidAt) >= yearStart)
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const totalOwed = (assignments as any[])
    .filter((a) => a.paymentStatus !== 'paid')
    .reduce((sum, a) => sum + Number(a.agreedPrice ?? 0) - Number(a.paidAmount ?? 0), 0);

  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj));

  return (
    <SubcontractorDetailClient
      subcontractor={serialize(sub)}
      assignments={serialize(assignments)}
      payments={serialize(payments)}
      availableJobs={serialize(jobs)}
      ytdTotal={ytdTotal}
      totalOwed={Math.max(0, totalOwed)}
      contractorId={profile.id}
    />
  );
}
