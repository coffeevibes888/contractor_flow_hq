import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SignUpForm from './sign-up-form';

export const metadata: Metadata = {
  title: 'Sign Up',
};

const SignUpPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; plan?: string; role?: string; skipOnboarding?: string }>;
}) => {
  const session = await auth();
  const params = await searchParams;

  // If already logged in, redirect appropriately
  if (session?.user) {
    // If the ad/pricing flow sent a plan + role, route straight to the subscription page
    if (params.plan || params.skipOnboarding === 'true') {
      const plan = params.plan || 'starter';
      const route =
        params.role === 'contractor'
          ? `/onboarding/contractor/subscription?plan=${plan}`
          : `/onboarding/landlord/subscription?plan=${plan}${params.skipOnboarding === 'true' ? '&skipOnboarding=true' : ''}`;
      return redirect(route);
    }

    // If an explicit callbackUrl was provided, honor it (only relative URLs)
    if (params.callbackUrl && params.callbackUrl.startsWith('/')) {
      return redirect(params.callbackUrl);
    }

    // If onboarding not completed, go to onboarding
    if (!session.user.onboardingCompleted) {
      return redirect('/onboarding');
    }
    
    // Role-based redirect for completed users
    const role = session.user.role;
    if (role === 'admin' || role === 'landlord') {
      return redirect('/admin');
    } else if (role === 'superAdmin') {
      return redirect('/super-admin');
    } else {
      return redirect('/user');
    }
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-4'>
          <Link href='/' className='flex-center'>
            <Image
              src='/images/logo.svg'
              width={100}
              height={100}
              alt={`${APP_NAME} logo`}
              priority={true}
            />
          </Link>
          <CardTitle className='text-center'>Create Your Account</CardTitle>
          <CardDescription className='text-center'>
            Join thousands of landlords, tenants, and agents on our platform
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <SignUpForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;
