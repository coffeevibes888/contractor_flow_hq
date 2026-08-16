import { auth } from '@/auth';
import { redirect } from 'next/navigation';
// import RoleSelectionClient from './role-selection-client';
// ROLE PICKER DISABLED: All users signing up from ContractorFlowHQ are
// contractors. Role is set to 'contractor' by default in the sign-up form.

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error('Auth error in onboarding:', error);
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  if (!session?.user) {
    return redirect('/sign-in?callbackUrl=/onboarding');
  }

  // Route to the correct dashboard based on role — no role picker shown
  switch (session.user.role) {
    case 'landlord':
    case 'property_manager':
    case 'admin':
      return redirect('/admin/overview');
    case 'superAdmin':
      return redirect('/super-admin');
    case 'tenant':
      return redirect('/user/dashboard');
    case 'agent':
      return redirect('/agent/dashboard');
    case 'contractor':
      return redirect('/contractor-dashboard');
    case 'homeowner':
      return redirect('/homeowner/dashboard');
    default:
      // ContractorFlowHQ: Default to contractor dashboard for all signups
      return redirect('/contractor-dashboard');
  }

  // RE-ENABLE ROLE PICKER: replace the switch above with:
  // if (session.user.onboardingCompleted) { ...switch above... }
  // return <RoleSelectionClient userName={session.user.name || 'there'} />;
}
