import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import HomeownerOnboardingClient from './homeowner-onboarding-client';

export const dynamic = 'force-dynamic';

export default async function HomeownerOnboardingPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error('Auth error in homeowner onboarding:', error);
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (!session?.user) {
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (session.user.onboardingCompleted) {
    return redirect('/homeowner/dashboard');
  }

  return <HomeownerOnboardingClient />;
}
