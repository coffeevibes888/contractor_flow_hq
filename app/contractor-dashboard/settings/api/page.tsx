import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/db/prisma';
import ContractorApiClient from './api-client';
import { getContractorIdForUser } from '@/lib/contractor-profile';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'API & Webhooks | Contractor Dashboard',
};

export default async function ContractorApiPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');
  // API keys & webhooks are owner-only — handing those out to an employee
  // would let them bypass every permission check we've put in place.
  if (session.user.role !== 'contractor') redirect('/contractor-dashboard');

  const contractorId = await getContractorIdForUser(session.user.id);
  if (!contractorId) redirect('/onboarding/contractor');

  const profile = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    select: {
      id: true,
      subscriptionTier: true,
      apiKeys: {
        where: { isActive: true },
        select: {
          id: true, name: true, keyPrefix: true, scopes: true,
          lastUsedAt: true, expiresAt: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      webhookEndpoints: {
        select: {
          id: true, url: true, description: true, events: true,
          isActive: true, failureCount: true, lastSuccessAt: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!profile) redirect('/onboarding/contractor');

  // The client component types these date fields as strings (it never needs
  // Date methods on them). Serialize here so the prop types line up — and so
  // we don't ship a non-serializable Date across the server/client boundary.
  const apiKeys = profile.apiKeys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  }));

  const webhooks = profile.webhookEndpoints.map((w) => ({
    ...w,
    lastSuccessAt: w.lastSuccessAt ? w.lastSuccessAt.toISOString() : null,
    createdAt: w.createdAt.toISOString(),
  }));

  const isEnterprise = profile.subscriptionTier === 'enterprise';

  return (
    <ContractorApiClient
      isEnterprise={isEnterprise}
      apiKeys={apiKeys}
      webhooks={webhooks}
    />
  );
}
