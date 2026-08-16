import { requireUser } from '@/lib/auth-guard';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import UserDashboard from '../user-dashboard';

export const metadata: Metadata = {
  title: 'Tenant Dashboard',
};

const SubdomainUserPage = async ({ params }: { params: Promise<{ subdomain: string }> }) => {
  const { subdomain } = await params;
  const session = await requireUser();

  // Verify this tenant belongs to this subdomain's landlord
  const landlord = await prisma.landlord.findUnique({
    where: { subdomain },
  });

  if (!landlord) {
    redirect('/unauthorized');
  }

  const tenantLease = await prisma.lease.findFirst({
    where: {
      tenantId: session.user.id,
      status: 'active',
      unit: {
        property: {
          landlordId: landlord.id,
        },
      },
    },
    include: {
      unit: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!tenantLease) {
    redirect('/unauthorized');
  }

  // Pass only the fields needed by the client component (with Decimals converted to numbers)
  return (
    <UserDashboard
      tenantLease={{
        id: tenantLease.id,
        rentAmount: Number(tenantLease.rentAmount),
        unit: {
          name: tenantLease.unit.name,
          rentAmount: Number(tenantLease.unit.rentAmount),
          property: {
            name: tenantLease.unit.property.name,
            address: tenantLease.unit.property.address,
          },
        },
      }}
      landlord={{
        id: landlord.id,
        name: landlord.name,
      }}
    />
  );
};

export default SubdomainUserPage;
