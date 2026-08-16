import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import MainNav from './main-nav';
import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import AnalyticsProvider from '@/components/analytics-provider';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';

export default async function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Require email verification for tenant/user dashboard access
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      redirect(`/verify-email/required?next=/user/dashboard`);
    }
  }

  return (
    <SessionProviderWrapper>
      <Suspense fallback={null}>
        <AnalyticsProvider />
      </Suspense>
      <div className='flex min-h-screen flex-col bg-white'>
        <Header />
        <div className='flex flex-1'>
          {/* Desktop Sidebar */}
          <aside className='hidden md:flex flex-col w-64 border-r border-indigo-500/20 px-4 py-6 gap-6'>
            <Link href='/' className='flex items-center gap-3 px-2'>
              <div className='flex flex-col text-center'>
                <span className='text-sm font-semibold text-bold text-black '>Resident Portal</span>
                <span className='text-xs text-emerald-600 text-semibold'>Profile & Rentals</span>
              </div>
            </Link>

            <MainNav className='flex-1' />
          </aside>

          {/* Content — extra left padding on mobile to clear hamburger button */}
          <div className='flex-1 flex flex-col bg-white'>
            <main className='flex-1 overflow-y-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6'>
              <div className='mx-auto max-w-6xl'>{children}</div>
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </SessionProviderWrapper>
  );
}
