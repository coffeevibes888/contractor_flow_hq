import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const landlordId = landlordResult.landlord.id;

    // Get all properties for this landlord to match by propertySlug
    const landlordProperties = await prisma.property.findMany({
      where: { landlordId },
      select: { slug: true },
    });
    const landlordPropertySlugs = landlordProperties.map(p => p.slug);

    const applications = await prisma.rentalApplication.findMany({
      where: {
        OR: [
          // Applications linked to a unit under this landlord
          {
            unit: {
              property: {
                landlordId,
              },
            },
          },
          // Applications with a propertySlug matching this landlord's properties
          {
            propertySlug: {
              in: landlordPropertySlugs,
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        unit: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
        },
        applicant: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Serialize for JSON response
    const serializedApplications = applications.map(app => ({
      id: app.id,
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      monthlyIncome: app.monthlyIncome ? Number(app.monthlyIncome) : null,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      propertySlug: app.propertySlug,
      unit: app.unit ? {
        name: app.unit.name,
        property: app.unit.property,
      } : null,
      applicant: app.applicant,
    }));

    return NextResponse.json({ applications: serializedApplications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
