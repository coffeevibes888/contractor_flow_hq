import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import AnalyticsProvider from '@/components/analytics-provider';
import { Suspense } from 'react';

export default function ContractorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProviderWrapper>
      <Suspense fallback={null}>
        <AnalyticsProvider />
      </Suspense>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </SessionProviderWrapper>
  );
}
