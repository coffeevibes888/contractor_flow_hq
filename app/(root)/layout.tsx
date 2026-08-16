import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import { SessionProvider } from 'next-auth/react';
import AnalyticsProvider from '@/components/analytics-provider';
import { Suspense } from 'react';
// `auth()` and `headers()` inside <Header /> already opt the layout into
// dynamic rendering. Keep this explicit so static pages nested under (root)
// don't accidentally get prerendered with stale auth state.
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <AnalyticsProvider />
      </Suspense>
      <div className='flex min-h-screen flex-col'>
        <Header />
        <main className='flex-1'>{children}</main>
        <Footer />
      </div>
    </SessionProvider>
  );
}

// bg-gradient-to-r from-teal-50 to-sky-500