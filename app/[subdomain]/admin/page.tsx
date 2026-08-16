import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminDashboard from '../admin-dashboard';

export const metadata: Metadata = {
  title: 'Landlord Dashboard',
};

const SubdomainAdminPage = async ({ params }: { params: Promise<{ subdomain: string }> }) => {
  const { subdomain } = await params;
  await requireAdmin();

  const landlordResult = await getOrCreateCurrentLandlord();

  if (!landlordResult.success) {
    throw new Error(landlordResult.message || 'Unable to determine landlord');
  }

  const landlord = landlordResult.landlord;

  // Verify this landlord owns the subdomain
  if (landlord.subdomain !== subdomain) {
    redirect('/unauthorized');
  }

  // Pass only the fields needed by the client component
  return (
    <AdminDashboard
      landlord={{
        id: landlord.id,
        name: landlord.name,
        subdomain: landlord.subdomain,
      }}
    />
  );
};

export default SubdomainAdminPage;
