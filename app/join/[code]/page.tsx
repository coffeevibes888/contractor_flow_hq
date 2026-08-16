import { prisma } from '@/db/prisma';
import { notFound } from 'next/navigation';
import JoinClient from './join-client';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const { code } = await params;

  // Look up the invite code
  const inviteCode = await prisma.landlordInviteCode.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      landlord: {
        select: { name: true, id: true },
      },
      property: {
        select: { name: true, slug: true },
      },
    },
  });

  if (!inviteCode) {
    notFound();
  }

  const landlordName = inviteCode.landlord.name || 'Your landlord';
  const propertyName = inviteCode.property?.name ?? null;
  const propertySlug = inviteCode.property?.slug ?? null;

  return (
    <JoinClient
      code={code.toUpperCase()}
      landlordName={landlordName}
      propertyName={propertyName}
      propertySlug={propertySlug}
    />
  );
}
