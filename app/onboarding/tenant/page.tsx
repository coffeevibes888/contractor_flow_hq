import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import TenantOnboardingClient from './tenant-onboarding-client';

export const dynamic = 'force-dynamic';

export default async function TenantOnboardingPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error('Auth error in tenant onboarding:', error);
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (!session?.user) {
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (session.user.onboardingCompleted) {
    return redirect('/user/dashboard');
  }

  return <TenantOnboardingClient />;
}
