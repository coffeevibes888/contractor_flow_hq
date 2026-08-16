/**
 * GET /api/mobile/public/listings/:slug
 *
 * Public detail for a single rental listing — used by the mobile listing
 * detail screen. Returns the full property with its available units, address
 * (as a structured object including lat/lng if geocoded), and landlord
 * branding so the apply-now CTA can route to the right subdomain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

interface AddressJson {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const property = await prisma.property.findUnique({
      where: { slug },
      include: {
        landlord: {
          select: { id: true, companyName: true, subdomain: true },
        },
        units: {
          where: { isAvailable: true },
          select: {
            id: true,
            name: true,
            rentAmount: true,
            isAvailable: true,
            bedrooms: true,
            bathrooms: true,
            sizeSqFt: true,
            images: true,
            amenities: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const sample = property.units[0];
    const addr = (property.address ?? {}) as AddressJson;
    const rents = property.units.map((u) => Number(u.rentAmount ?? 0)).filter((r) => r > 0);
    const minRent = rents.length ? Math.min(...rents) : 0;

    // Aggregate up to 5 hero images from any available unit.
    const images = property.units.flatMap((u) => u.images ?? []).slice(0, 5);

    // Aggregate de-duped amenities across all available units.
    const amenities = Array.from(
      new Set(
        property.units.flatMap((u) => (u.amenities ?? []) as string[]).filter(Boolean),
      ),
    );

    // If the address wasn't pre-geocoded but we have a Maps key, geocode
    // server-side once so the mobile map renders without a round-trip.
    let lat: number | null = typeof addr.lat === 'number' ? addr.lat : null;
    let lng: number | null = typeof addr.lng === 'number' ? addr.lng : null;
    if ((lat == null || lng == null)) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const fullAddress = [addr.street, addr.city, addr.state, addr.zip]
        .filter(Boolean)
        .join(', ');
      if (apiKey && fullAddress) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`,
            { next: { revalidate: 60 * 60 * 24 } },
          );
          const geo = (await geoRes.json()) as {
            status?: string;
            results?: { geometry?: { location?: { lat: number; lng: number } } }[];
          };
          if (geo.status === 'OK' && geo.results?.[0]?.geometry?.location) {
            lat = geo.results[0].geometry.location.lat;
            lng = geo.results[0].geometry.location.lng;
          }
        } catch {
          // Non-fatal — fall through with null lat/lng and the address card.
        }
      }
    }

    return NextResponse.json({
      id: property.id,
      slug: property.slug,
      name: property.name,
      type: property.type,
      description: property.description,
      coverImage: images[0] ?? null,
      images,
      amenities,
      beds: sample?.bedrooms ?? null,
      baths: sample?.bathrooms ? Number(sample.bathrooms) : null,
      sizeSqFt: sample?.sizeSqFt ?? null,
      rent: minRent,
      address: {
        street: addr.street ?? null,
        city: addr.city ?? null,
        state: addr.state ?? null,
        zip: addr.zip ?? null,
      },
      lat,
      lng,
      landlordName: property.landlord?.companyName ?? 'Property Manager',
      landlordSubdomain: property.landlord?.subdomain ?? null,
      units: property.units.map((u) => ({
        id: u.id,
        name: u.name,
        rentAmount: Number(u.rentAmount ?? 0),
        isAvailable: u.isAvailable,
        bedrooms: u.bedrooms ?? null,
        bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
      })),
    });
  } catch (e) {
    console.error('public listing detail', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
