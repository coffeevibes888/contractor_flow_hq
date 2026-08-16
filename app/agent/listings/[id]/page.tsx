import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import ListingDetailClient from './listing-detail-client';

interface ListingDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  
  const listing = await prisma.agentListing.findUnique({
    where: { id },
    select: { title: true, description: true, address: true, images: true },
  });

  if (!listing) {
    return { title: 'Listing Not Found | Property Flow HQ' };
  }

  const address = listing.address as any;
  
  return {
    title: `${listing.title} | ${address?.city || ''} Real Estate`,
    description: listing.description?.slice(0, 160) || `View this property listing in ${address?.city || ''}`,
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 160) || '',
      images: listing.images?.[0] ? [{ url: listing.images[0] }] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const session = await auth();

  // Fetch listing with agent details and open houses
  const listing = await prisma.agentListing.findUnique({
    where: { id },
    include: {
      agent: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              phoneNumber: true,
            },
          },
        },
      },
      openHouses: {
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!listing) {
    notFound();
  }

  // Check if current user is the listing agent (safely handle missing agent)
  const isOwner = session?.user?.id != null && listing.agent?.userId === session.user.id;

  // Get similar listings from same agent
  const similarListings = await prisma.agentListing.findMany({
    where: {
      agentId: listing.agentId,
      id: { not: id },
      status: 'active',
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      agent: {
        select: {
          name: true,
          subdomain: true,
        },
      },
    },
  });

  return (
    <ListingDetailClient
      listing={listing}
      agent={listing.agent || null}
      openHouses={listing.openHouses}
      similarListings={similarListings}
      isOwner={isOwner}
    />
  );
}
