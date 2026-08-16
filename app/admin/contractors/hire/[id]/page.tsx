import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import HireContractorClient from './hire-contractor-client';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Send Job Offer | Admin',
};

export default async function HireContractorPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect('/sign-in');

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) redirect('/admin');

  // Try ContractorProfile first (marketplace profile), then fall back to Contractor
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const profile = await prisma.contractorProfile.findFirst({
    where: isUUID ? { OR: [{ id }, { slug: id }] } : { slug: id },
    select: {
      id: true,
      displayName: true,
      businessName: true,
      specialties: true,
      profilePhoto: true,
      avgRating: true,
      totalReviews: true,
      completedJobs: true,
      baseCity: true,
      baseState: true,
    },
  });

  const legacyContractor = !profile && isUUID
    ? await prisma.contractor.findUnique({
        where: { id },
        select: { id: true, name: true, specialties: true, user: { select: { image: true } } },
      })
    : null;

  if (!profile && !legacyContractor) notFound();

  const contractorId = profile?.id ?? legacyContractor!.id;
  const contractorName = profile
    ? (profile.displayName || profile.businessName || 'Contractor')
    : legacyContractor!.name;
  const contractorSpecialties = profile?.specialties ?? legacyContractor?.specialties ?? [];
  const contractorPhoto = profile?.profilePhoto ?? legacyContractor?.user?.image ?? null;
  const contractorLocation =
    profile?.baseCity && profile?.baseState
      ? `${profile.baseCity}, ${profile.baseState}`
      : null;

  // Fetch landlord's properties for the form
  const properties = await prisma.property.findMany({
    where: { landlordId: landlordResult.landlord.id, status: { not: 'deleted' } },
    select: { id: true, name: true, address: true },
    orderBy: { name: 'asc' },
  });

  return (
    <HireContractorClient
      contractorId={contractorId}
      contractorName={contractorName}
      contractorSpecialties={contractorSpecialties}
      contractorPhoto={contractorPhoto}
      contractorLocation={contractorLocation}
      avgRating={profile?.avgRating ? Number(profile.avgRating) : null}
      totalReviews={profile?.totalReviews ?? null}
      completedJobs={profile?.completedJobs ?? null}
      properties={properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address as { street?: string; city?: string; state?: string } | null,
      }))}
    />
  );
}
