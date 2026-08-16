import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import SignUpForm from '@/app/(auth)/sign-up/sign-up-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';

/**
 * Sign-up page for subdomains - primarily for rental applicants
 */
export default async function SubdomainSignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ fromProperty?: string; propertySlug?: string }>;
}) {
  const { subdomain } = await params;
  const { fromProperty, propertySlug } = await searchParams;
  
  const session = await auth();

  if (session?.user) {
    // Apply-link intent beats everything else: if the user clicked "Apply" on a
    // property, send them straight to the application wizard. The wizard page
    // handles auto-upgrading role/onboarding state for brand-new applicants.
    if (fromProperty === 'true' && propertySlug) {
      redirect(`/${subdomain}/application?property=${encodeURIComponent(propertySlug)}`);
    }
    // If onboarding not completed, go to onboarding
    if (!session.user.onboardingCompleted) {
      redirect('/onboarding');
    }
    // Otherwise redirect to home
    redirect('/');
  }

  // Get landlord information for branding
  const landlord = await prisma.landlord.findUnique({
    where: { subdomain },
  });

  const title = landlord ? `Apply at ${landlord.name}` : 'Create Account';
  const description = fromProperty === 'true'
    ? 'Create an account to complete your rental application.'
    : landlord
    ? `Create an account to apply for rentals at ${landlord.name}.`
    : 'Create your account to get started';

  return (
    <main className='fixed inset-0 min-h-screen w-full overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'>
      <div className='min-h-screen flex items-center justify-center px-4 py-10 sm:py-16'>
        <div className='w-full max-w-md mx-auto'>
          <Card className='border-white/10 bg-slate-900/80 backdrop-blur-sm text-white shadow-2xl'>
            <CardHeader className='space-y-4'>
              <Link href={`/${subdomain}`} className='flex items-center justify-center'>
                <Image
                  src='/images/logo.svg'
                  width={96}
                  height={96}
                  alt={`${APP_NAME} logo`}
                  priority={true}
                />
              </Link>
              <CardTitle className='text-center text-white text-2xl'>{title}</CardTitle>
              <CardDescription className='text-center text-slate-300'>
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <SignUpForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
