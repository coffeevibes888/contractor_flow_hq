import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import MainNav from './main-nav';
import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import { HomeownerSidebarWrapper } from '@/components/homeowner/homeowner-sidebar-wrapper';
import AnalyticsProvider from '@/components/analytics-provider';
import { Suspense } from 'react';

export default async function HomeownerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  return (
    <SessionProviderWrapper>
      <Suspense fallback={null}>
        <AnalyticsProvider />
      </Suspense>
      <div className='flex min-h-screen flex-col bg-white'>
        <Header />
        <div className='flex flex-1 text-black'>
          {/* Collapsible Sidebar */}
          <HomeownerSidebarWrapper>
            <div className='flex items-center gap-3 px-2 p-2'>
              <div className='relative h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center bg-white/10'>
                <Image
                  src='/images/logo.svg'
                  height={40}
                  width={40}
                  alt={APP_NAME}
                  className='object-contain filter brightness-0 invert'
                />
              </div>
              <div className='flex flex-col sidebar-expanded-only'>
                <span className='text-sm text-black'>Home, jobs & contractors</span>
              </div>
            </div>
            <MainNav className='flex-1' />
          </HomeownerSidebarWrapper>

          {/* Content */}
          <div className='flex-1 flex flex-col min-w-0'>
            <main className='flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 md:py-6 bg-gray-50/50'>
              <div className='mx-auto max-w-7xl w-full'>
                {children}
              </div>
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </SessionProviderWrapper>
  );
}
