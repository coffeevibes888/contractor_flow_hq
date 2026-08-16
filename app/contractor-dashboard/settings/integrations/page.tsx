import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { IntegrationsClient } from './integrations-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = { title: 'Integrations | Contractor Settings' };

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ qb?: string; reason?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  // Integrations are owner-only — connecting QuickBooks etc. should not be
  // exposed to employees regardless of their role permissions.
  const profile = await getContractorProfileForUser(session.user.id, {
    id: true,
    subscriptionTier: true,
    userId: true,
  });
  if (!profile) redirect('/onboarding/contractor');
  if (profile.userId !== session.user.id) redirect('/contractor-dashboard');

  const db = prisma as any;

  const qbConn = await db.contractorQBConnection.findUnique({
    where: { contractorId: profile.id },
    select: { connectedAt: true, realmId: true, lastSyncAt: true, companyName: true },
  }).catch(() => null);

  const [unsyncedInvoices, unsyncedExpenses] = await Promise.all([
    db.contractorInvoice.count({
      where: {
        contractorId: profile.id,
        status: { in: ['sent', 'paid', 'partial', 'viewed'] },
        qbInvoiceId: null,
      },
    }).catch(() => 0),
    db.contractorExpense.count({
      where: { contractorId: profile.id, qbPurchaseId: null, status: { not: 'rejected' } },
    }).catch(() => 0),
  ]);

  const params = await searchParams;

  return (
    <IntegrationsClient
      tier={profile.subscriptionTier ?? 'starter'}
      qbConnected={Boolean(qbConn?.connectedAt && qbConn?.realmId)}
      qbConnectedAt={qbConn?.connectedAt?.toISOString() ?? null}
      qbLastSyncAt={qbConn?.lastSyncAt?.toISOString() ?? null}
      qbCompanyName={qbConn?.companyName ?? null}
      unsyncedInvoices={unsyncedInvoices}
      unsyncedExpenses={unsyncedExpenses}
      qbStatus={params.qb ?? null}
    />
  );
}
