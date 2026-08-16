import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ExistingTenantOnboardingClient from './existing-tenant-onboarding-client';

export const dynamic = 'force-dynamic';

export default async function ExistingTenantOnboardingPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error('Auth error in existing tenant onboarding:', error);
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (!session?.user) {
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (session.user.onboardingCompleted) {
    return redirect('/user/dashboard');
  }

  return <ExistingTenantOnboardingClient />;
}
