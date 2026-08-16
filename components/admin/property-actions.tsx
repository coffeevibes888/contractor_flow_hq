'use client';

import { PropertyDeleteDialog } from '@/components/admin/property-delete-dialog';
import { deletePropertyById } from '@/lib/actions/property.actions';

export function PropertyActions({ propertyId }: { propertyId: string }) {
  return <PropertyDeleteDialog propertyId={propertyId} action={deletePropertyById} />;
}

export default PropertyActions;
