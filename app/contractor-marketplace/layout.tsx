import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import type { Metadata } from 'next';
import AnalyticsProvider from '@/components/analytics-provider';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Contractor Marketplace | Property Flow HQ',
  description:
    'Browse verified contractors for your property maintenance needs, or find open jobs as a contractor.',
  alternates: { canonical: 'https://www.propertyflowhq.com/contractor-marketplace' },
};

export default function ContractorMarketplaceLayout({
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
