import { requireAdmin } from '@/lib/auth-guard';
import { getPropertiesWithUnits } from '@/lib/actions/tenant.actions';
import { AddTenantForm } from '@/components/admin/add-tenant-form';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    propertyId?: string;
    unitId?: string;
    /** Pre-fill tenant name (from free lease builder onboarding) */
    tenantName?: string;
    /** Pre-fill tenant email */
    tenantEmail?: string;
    /** Pre-built LegalDocument ID to attach to the lease */
    legalDocumentId?: string;
  }>;
}

export default async function AddTenantPage({ searchParams }: PageProps) {
  await requireAdmin();
  
  const params = await searchParams;
  const { properties } = await getPropertiesWithUnits();

  return (
    <main className="w-full max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/leases"
          className="inline-flex items-center text-xs text-slate-400 hover:text-white mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Leases
        </Link>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-50 mb-1">
          Add Tenant
        </h1>
        <p className="text-xs text-slate-300/80">
          Manually add tenant information and create a lease for a property.
        </p>
      </div>

      <AddTenantForm
        properties={properties}
        preselectedPropertyId={params.propertyId}
        preselectedUnitId={params.unitId}
        prefilledTenantName={params.tenantName}
        prefilledTenantEmail={params.tenantEmail}
        prebuiltLegalDocumentId={params.legalDocumentId}
      />
    </main>
  );
}
