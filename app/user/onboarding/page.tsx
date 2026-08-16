import { requireUser } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import TenantOnboardingClient from './tenant-onboarding-client';

export default async function TenantOnboardingPage(props: {
  searchParams: Promise<{ applicationId?: string }>;
}) {
  const session = await requireUser();

  if (session.user.role !== 'tenant') {
    redirect('/user/dashboard');
  }

  const { applicationId } = await props.searchParams;

  if (!applicationId) {
    redirect('/user/dashboard');
  }

  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, applicantId: true, propertySlug: true },
  });

  if (!application || application.applicantId !== session.user.id) {
    redirect('/user/dashboard');
  }

  return (
    <main className='w-full px-4 py-8 md:px-0'>
      <div className='max-w-3xl mx-auto'>
        <TenantOnboardingClient applicationId={application.id} propertySlug={application.propertySlug || ''} />
      </div>
    </main>
  );
}
