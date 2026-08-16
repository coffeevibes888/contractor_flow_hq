import type { Metadata } from 'next';
import PricingSection from '@/components/home/pricing-section';
import AudienceSwitcher from '@/components/home/audience-switcher';
import ComparisonSection from '@/components/home/comparison-section';
import { ContractorLifecycleSection } from '@/components/home/contractor-lifecycle-section';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import JsonLdScript from '@/components/seo/json-ld-script';

// ─── Structured data (JSON-LD) ────────────────────────────────────────────────
const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Contractor Flow HQ',
    url: 'https://www.contractorflowhq.com',
    description:
      'The all-in-one business platform for contractors. Jobs, invoices, leads, team scheduling, inventory, payroll, and your own branded marketplace profile.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.contractorflowhq.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Contractor Flow HQ',
    url: 'https://www.contractorflowhq.com',
    logo: 'https://www.contractorflowhq.com/logo.png',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://www.contractorflowhq.com/contact',
    },
    description:
      'The all-in-one platform built for contractors. Jobs, invoices, team scheduling, inventory, payroll, and your own branded marketplace profile — no per-job fees.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Contractor Flow HQ',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://www.contractorflowhq.com',
    offers: {
      '@type': 'Offer',
      price: '39',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '39',
        priceCurrency: 'USD',
        unitText: 'MONTH',
      },
      description: 'Contractor business management software starting at $39/mo. No per-job fees. Free 14-day trial.',
    },
    featureList: [
      'Job management & dispatch',
      'Invoicing & estimates',
      'Team scheduling & time tracking',
      'Inventory & equipment management',
      'Lead management & CRM',
      'Branded marketplace profile',
      'Payroll integration',
      'QuickBooks sync',
    ],
    provider: {
      '@type': 'Organization',
      name: 'Contractor Flow HQ',
      url: 'https://www.contractorflowhq.com',
    },
  },
];

export const metadata: Metadata = {
  title: 'Contractor Business Management Software — ContractorFlowHQ',
  description:
    'Run your entire contracting business from one platform. Jobs, invoices, leads, team scheduling, inventory, and payroll — starting at $39/mo. No per-job fees. Free trial.',
  alternates: { canonical: 'https://www.contractorflowhq.com' },
  keywords: [
    'contractor management software',
    'contractor business software',
    'job management for contractors',
    'contractor invoicing',
    'contractor scheduling software',
    'field service management',
    'contractor CRM',
    'contractor estimates',
    'team scheduling software',
    'contractor inventory management',
    'contractor payroll',
    'contractor marketplace',
  ],
  openGraph: {
    title: 'Contractor Business Management Software — ContractorFlowHQ',
    description:
      'Jobs, invoices, leads, team scheduling, inventory, and payroll — all in one platform built for contractors. Starting at $39/mo.',
    url: 'https://www.contractorflowhq.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contractor Business Management Software — ContractorFlowHQ',
    description:
      'Jobs, invoices, leads, team scheduling, inventory, and payroll — all in one platform built for contractors. Starting at $39/mo.',
  },
};

// Below-the-fold components — lazy loaded to reduce initial JS bundle and TBT
const HomeContactCard = dynamic(() => import('@/components/home/home-contact-card'));
const FAQSection = dynamic(() => import('@/components/home/faq-section'));
const StickyTrialBar = dynamic(() => import('@/components/home/sticky-trial-bar'));
const NewsletterSignup = dynamic(() => import('@/components/home/newsletter-signup'));

// Stub PM sections — not shown but AudienceSwitcher requires the props
function PMLifecycleStub() { return null; }
function PMLeasePortalStub() { return null; }

const Homepage = async () => {
  return (
    <>
      <JsonLdScript data={homeJsonLd} id="home-ld" />
      <main className='flex-1 w-full'>
        <Suspense fallback={null}>
          <AudienceSwitcher
            forceAudience="contractor"
            pmPricingSection={<PricingSection variant="pm" />}
            contractorPricingSection={<PricingSection variant="contractor" />}
            pmLifecycleSection={<PMLifecycleStub />}
            pmLeasePortalSection={<PMLeasePortalStub />}
            contractorLifecycleSection={<ContractorLifecycleSection />}
            pmComparisonSection={<ComparisonSection variant="pm" />}
            contractorComparisonSection={<ComparisonSection variant="contractor" />}
          />
        </Suspense>
        <FAQSection />
        <NewsletterSignup />
      </main>
      <HomeContactCard />
      <Suspense fallback={null}>
        <StickyTrialBar />
      </Suspense>
    </>
  );
};

export default Homepage;
