import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AgentOnboardingClient from './agent-onboarding-client';

export const dynamic = 'force-dynamic';

export default async function AgentOnboardingPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error('Auth error in agent onboarding:', error);
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (!session?.user) {
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (session.user.onboardingCompleted && session.user.role === 'agent') {
    return redirect('/agent/dashboard');
  }

  return <AgentOnboardingClient />;
}
