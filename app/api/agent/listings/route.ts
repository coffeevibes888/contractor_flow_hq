import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { canonicalUrl } from '@/lib/seo';
import { indexNowSubmit } from '@/lib/seo/indexnow';
import { NextResponse } from 'next/server';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId: session.user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      propertyType,
      listingType,
      price,
      address,
      bedrooms,
      bathrooms,
      sizeSqFt,
      yearBuilt,
      lotSizeSqFt,
      garage,
      images,
      videoUrl,
    } = body;

    if (!title || !price || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const listing = await prisma.agentListing.create({
      data: {
        agentId: agent.id,
        title,
        slug: generateSlug(title),
        description: description || null,
        propertyType: propertyType || 'house',
        listingType: listingType || 'sale',
        status: 'active',
        price: parseFloat(price),
        address: address,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        sizeSqFt: sizeSqFt ? parseInt(sizeSqFt) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        lotSizeSqFt: lotSizeSqFt ? parseInt(lotSizeSqFt) : null,
        garage: garage ? parseInt(garage) : null,
        images: images || [],
        videoUrl: videoUrl || null,
      },
    });

    // Update agent's total listings count
    await prisma.agent.update({
      where: { id: agent.id },
      data: { totalListings: { increment: 1 } },
    });

    // Ping IndexNow so Bing/Yandex pick up the new listing immediately.
    // Best-effort — never blocks the response.
    if (agent.subdomain) {
      void indexNowSubmit([
        canonicalUrl(`/${agent.subdomain}/listings/${listing.slug}`),
        canonicalUrl(`/${agent.subdomain}`),
        canonicalUrl('/listings'),
      ]);
    }

    return NextResponse.json({ success: true, listing });
  } catch (error) {
    console.error('Create listing error:', error);
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId: session.user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const listings = await prisma.agentListing.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Get listings error:', error);
    return NextResponse.json(
      { error: 'Failed to get listings' },
      { status: 500 }
    );
  }
}
