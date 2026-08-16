import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { CrewMapClient } from './crew-map-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Live Crew Map | Contractor Dashboard',
  description: 'See where your crew is clocked in right now.',
};

// Crew location data is real-time, so don't cache the page.
export const dynamic = 'force-dynamic';

export default async function CrewMapPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/contractor-dashboard/crew-map');
  }

  const profile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    subscriptionTier: true,
  });

  if (!profile) {
    redirect('/onboarding/contractor');
  }

  return (
    <CrewMapClient
      businessName={profile.businessName ?? ''}
      subscriptionTier={profile.subscriptionTier ?? 'starter'}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}
    />
  );
}
