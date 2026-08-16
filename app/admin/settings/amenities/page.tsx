import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import AmenitiesManagement from './amenities-management';

export const metadata: Metadata = {
  title: 'Amenities Management',
};

export default async function AmenitiesSettingsPage() {
  await requireAdmin();

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    return <div className="text-white p-8">Unable to load landlord data</div>;
  }

  // Get all properties with their amenities
  const properties = await prisma.property.findMany({
    where: { landlordId: landlordResult.landlord.id },
    select: {
      id: true,
      name: true,
      amenities: true,
      units: {
        select: {
          id: true,
          name: true,
          amenities: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Collect all unique amenities used across properties and units
  const propertyAmenitiesSet = new Set<string>();
  const unitAmenitiesSet = new Set<string>();

  properties.forEach((property) => {
    (property.amenities as string[]).forEach((a: string) => propertyAmenitiesSet.add(a));
    property.units.forEach((unit) => {
      (unit.amenities as string[]).forEach((a: string) => unitAmenitiesSet.add(a));
    });
  });

  return (
    <AmenitiesManagement
      landlordId={landlordResult.landlord.id}
      properties={properties as any}
      existingPropertyAmenities={Array.from(propertyAmenitiesSet)}
      existingUnitAmenities={Array.from(unitAmenitiesSet)}
    />
  );
}
