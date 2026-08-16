import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import EditPropertyClient from './edit-property-client';

export const metadata: Metadata = {
  title: 'Edit Property',
};

const AdminPropertyEditPage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  await requireAdmin();

  const { id } = await props.params;

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) return notFound();

  const property = await prisma.property.findFirst({
    where: { id, landlordId: landlordResult.landlord.id },
    select: { id: true },
  });

  if (!property) return notFound();

  return <EditPropertyClient propertyId={property.id} />;
};

export default AdminPropertyEditPage;
