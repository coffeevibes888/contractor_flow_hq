import { redirect } from 'next/navigation';

// Redirect old role page to new onboarding flow
export default function OldRolePage() {
  redirect('/onboarding');
}
