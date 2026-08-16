import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import TenantStartClient from './tenant-start-client';

export const metadata: Metadata = {
  title: 'Tenant Sign Up — Property Flow HQ',
  description:
    'Create your free tenant account. Pay rent online, submit maintenance requests, and sign leases digitally — all in one place. Your landlord sent you here.',
  alternates: { canonical: 'https://www.propertyflowhq.com/tenant-start' },
  openGraph: {
    title: 'Your Rental, Managed Online — Tenant Sign Up | Property Flow HQ',
    description:
      'Pay rent, submit maintenance requests, and sign leases digitally. Free forever for tenants.',
    url: 'https://www.propertyflowhq.com/tenant-start',
  },
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function TenantStartPage() {
  const session = await auth();

  // Signed-in tenants go straight to their dashboard
  if (session?.user?.role === 'tenant') {
    redirect('/user/dashboard');
  }

  // Everyone else (unauthenticated, or landlords who navigated here by mistake)
  // sees the sign-up page — landlords will simply not be connected to another
  // landlord since no matching account will be found.
  return <TenantStartClient />;
}
