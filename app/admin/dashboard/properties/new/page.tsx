'use client';

import { useRouter } from 'next/navigation';
import { PropertyWizard } from '@/components/admin/property-wizard/property-wizard';

export default function NewPropertyPage() {
  const router = useRouter();

  const handleComplete = (propertyId: string) => {
    router.push(`/admin/dashboard/properties/${propertyId}/details`);
  };

  const handleCancel = () => {
    router.push('/admin/dashboard/properties');
  };

  return (
    <PropertyWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
