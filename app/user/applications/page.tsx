import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import { ApplicationsClient } from './applications-client';

export default async function UserApplicationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id as string;

  const applications = await prisma.rentalApplication.findMany({
    where: { applicantId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      unit: {
        include: {
          property: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      },
      verification: {
        select: {
          identityStatus: true,
          employmentStatus: true,
          overallStatus: true,
        },
      },
    },
  });

  // Serialize for client component - convert Dates and Decimals to plain values
  const serializedApplications = applications.map(app => ({
    id: app.id,
    fullName: app.fullName,
    email: app.email,
    phone: app.phone,
    status: app.status,
    propertySlug: app.propertySlug,
    createdAt: app.createdAt.toISOString(),
    unit: app.unit ? {
      name: app.unit.name,
      property: app.unit.property ? {
        name: app.unit.property.name,
        address: app.unit.property.address,
      } : null,
    } : null,
    verification: app.verification ? {
      identityStatus: app.verification.identityStatus,
      employmentStatus: app.verification.employmentStatus,
      overallStatus: app.verification.overallStatus,
    } : null,
  }));

  return <ApplicationsClient applications={serializedApplications} />;
}
