import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';

export const dynamic = 'force-dynamic';

export default async function ContractorOnboardingPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error('Auth error in contractor onboarding:', error);
    return redirect('/sign-in?callbackUrl=/onboarding/contractor/subscription');
  }

  if (!session?.user) {
    return redirect('/sign-in?callbackUrl=/onboarding/contractor/subscription');
  }

  // Business info (company name, specialties, license, insurance, invite code)
  // is collected in the contractor profile settings — not during signup.
  // Skip the onboarding wizard entirely and go straight to plan selection.
  return redirect('/onboarding/contractor/subscription');
}
