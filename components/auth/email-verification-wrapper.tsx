import { auth } from '@/auth';
import { EmailVerificationBanner } from './email-verification-banner';

export async function EmailVerificationWrapper() {
  const session = await auth();

  // Only show banner if user is logged in and email is not verified
  if (!session?.user?.email || session?.user?.emailVerified) {
    return null;
  }

  return <EmailVerificationBanner email={session.user.email} />;
}
