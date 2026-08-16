import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import CredentialsSignInForm from '@/app/(auth)/sign-in/credentials-signin-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';

/**
 * Sign-in page for subdomains
 */
export default async function SubdomainSignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ fromProperty?: string; propertySlug?: string }>;
}) {
  const { subdomain } = await params;
  const { fromProperty, propertySlug } = await searchParams;
  
  const session = await auth();

  if (session) {
    // Honor Apply intent for any signed-in user; the application page itself
    // handles role/onboarding reconciliation.
    if (fromProperty === 'true' && propertySlug) {
      redirect(`/${subdomain}/application?property=${encodeURIComponent(propertySlug)}`);
    }
    redirect('/');
  }

  // Get landlord information for branding
  const landlord = await prisma.landlord.findUnique({
    where: { subdomain },
  });

  const title = landlord ? `Sign in to ${landlord.name}` : 'Sign In';
  const description = fromProperty === 'true'
    ? 'Sign in or create an account to complete your rental application.'
    : landlord
    ? `Access your ${landlord.name} resident or landlord account.`
    : 'Sign in to your account';

  // Build callback URL for after sign-in
  const callbackUrl = fromProperty === 'true' && propertySlug
    ? `/${subdomain}/application?property=${encodeURIComponent(propertySlug)}`
    : '/';

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
              {fromProperty === 'true' && (
                <div className='rounded-lg bg-violet-500/10 border border-violet-400/30 p-4 mb-2'>
                  <p className='text-sm text-violet-100'>
                    <strong className='text-white'>Applying for a rental?</strong> Sign in to continue your application, or{' '}
                    <Link
                      href={`/${subdomain}/sign-up?fromProperty=true&propertySlug=${encodeURIComponent(propertySlug || '')}`}
                      className='text-violet-300 hover:text-violet-200 font-medium underline underline-offset-2'
                    >
                      create a new account
                    </Link>.
                  </p>
                </div>
              )}
              <CredentialsSignInForm
                callbackUrl={callbackUrl}
                fromProperty={fromProperty === 'true'}
                propertySlug={propertySlug}
                subdomain={subdomain}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
