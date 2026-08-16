import type { Metadata } from 'next';
import LeaseBuilderSection from '@/components/lease/lease-builder-section';
import Link from 'next/link';
import { CheckCircle, Star, ShieldCheck, Clock, Download, MapPin } from 'lucide-react';
import JsonLdScript from '@/components/seo/json-ld-script';

export const metadata: Metadata = {
  // Primary keyword first, brand last — Google weights title position heavily
  title: 'Free Lease Agreement Builder — All 50 States | PropertyFlow HQ',
  description:
    'Create a free lease agreement online in under 5 minutes. State-specific disclosures, late fees, and deposit rules auto-applied for all 50 US states. No account, no watermarks, printable PDF. E-sign included free.',
  keywords: [
    'free lease agreement builder',
    'free lease builder',
    'residential lease agreement',
    'rental agreement generator',
    'create a lease online',
    'apartment lease template',
    'landlord lease creator',
    'state specific lease agreement',
    'month to month lease builder',
    'printable rental agreement',
    'free rental agreement',
    'landlord lease agreement',
    'lease agreement with e-signature',
    'lease builder online',
    'free lease agreement all 50 states',
    'online lease agreement',
    'residential lease template',
    'property management software',
  ],
  openGraph: {
    title: 'Free Lease Agreement Builder — All 50 States | PropertyFlow HQ',
    description:
      'Generate a state-specific residential lease agreement online in under 5 minutes — completely free. Correct disclosures for all 50 states, printable PDF, no watermarks. E-sign included free.',
    url: 'https://www.propertyflowhq.com/free-lease-builder',
    type: 'website',
    images: [
      {
        url: 'https://www.propertyflowhq.com/og-free-lease-builder.png',
        width: 1200,
        height: 630,
        alt: 'Free Lease Agreement Builder — PropertyFlow HQ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Lease Agreement Builder — All 50 States | PropertyFlow HQ',
    description:
      'Generate a state-specific residential lease in under 5 minutes — free. No account, no watermarks, printable PDF. All 50 US states supported.',
    images: ['https://www.propertyflowhq.com/og-free-lease-builder.png'],
  },
  alternates: {
    canonical: 'https://www.propertyflowhq.com/free-lease-builder',
  },
};

// ─── Structured data (JSON-LD) ────────────────────────────────────────────────
const PAGE_URL = 'https://www.propertyflowhq.com/free-lease-builder';
const SITE_URL  = 'https://www.propertyflowhq.com';

const jsonLdItems = [
  // WebPage — clusters this URL under the WebSite entity Google already knows
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': PAGE_URL,
    url: PAGE_URL,
    name: 'Free Lease Agreement Builder — All 50 States | PropertyFlow HQ',
    description:
      'Create a free lease agreement online in under 5 minutes. State-specific disclosures, late fees, and deposit rules auto-applied for all 50 US states. No account, no watermarks, printable PDF.',
    isPartOf: { '@type': 'WebSite', name: 'PropertyFlow HQ', url: SITE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',                  item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Free Lease Builder',    item: PAGE_URL },
      ],
    },
  },
  // WebApplication — the tool itself; eligible for Software rich results
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${PAGE_URL}#app`,
    name: 'Free Lease Agreement Builder',
    url: PAGE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    isPartOf: { '@type': 'WebSite', name: 'PropertyFlow HQ', url: SITE_URL },
    featureList: [
      'All 50 US states supported',
      'State-specific disclosures auto-applied',
      'Court-ready format with 19 legal articles',
      'Month-to-month and fixed-term leases',
      'Print to PDF free — no watermarks',
      'Free e-signature included (one per email)',
      'No account required for first lease',
    ],
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'One free state-specific residential lease agreement — no sign-up required',
        eligibleRegion: { '@type': 'Country', name: 'US' },
      },
      // E-sign offer: temporarily free (one per email address)
      // {
      //   '@type': 'Offer',
      //   price: '2.99',
      //   priceCurrency: 'USD',
      //   description: 'Send lease for tenant e-signature — one-time fee, no account required',
      //   eligibleRegion: { '@type': 'Country', name: 'US' },
      // },
    ],
    provider: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#org`,
      name: 'PropertyFlow HQ',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
    },
  },
  // FAQPage — eligible for expandable rich snippets directly in Google results
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is this lease agreement builder really free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Your first lease is completely free — no credit card, no account required. Fill in your property details, enter your email, and download your lease as a PDF. Additional leases require a free PropertyFlow HQ trial account.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is the lease legally binding?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our lease template includes all standard residential lease provisions and is designed to be court-ready. PropertyFlow HQ is a software platform, not a law firm. We strongly recommend review by a licensed attorney in your state, especially in states with complex landlord-tenant laws such as New York, California, or New Jersey.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which states are supported?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'All 50 US states are supported. Each lease is generated with the correct state-specific disclosures, security deposit rules, eviction notice periods, and late fee caps for your jurisdiction.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I get my lease as a PDF?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "After generating your lease, click \"Print / Save as PDF\". Your browser's print dialog will appear — select \"Save as PDF\" as the destination. The lease is formatted for standard letter-size paper at no cost.",
        },
      },
      {
        '@type': 'Question',
        name: 'Can I add e-signatures to my lease?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes — two ways. After generating your lease you can send it to your tenant for a legally-binding e-signature completely free (one per email address, no account needed). Or start a free 14-day PropertyFlow HQ trial to get unlimited e-signatures, online rent collection, tenant portal, and more — all included.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is included in the free lease?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your free lease includes all 19 standard legal articles: parties & property, lease term, rent & payment, late fees, security deposit, utilities, pet policy, smoking policy, maintenance responsibilities, entry & access, renters insurance, move-out requirements, default & remedies, state-specific disclosures, and signature blocks.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to create an account?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No account is required to generate your first free lease agreement. Simply fill in your property and tenant details, enter your email address, and your complete state-specific lease is generated instantly.',
        },
      },
    ],
  },
];

const FAQS = [
  {
    q: 'Is this lease agreement builder really free?',
    a: 'Yes. Your first lease is completely free — no credit card, no account required. Simply fill in your property details, enter your email, and download your lease as a PDF. Additional leases require a free PropertyFlow HQ trial.',
  },
  {
    q: 'Is the lease legally binding?',
    a: 'Our lease template includes all standard residential provisions and is designed to be court-ready. We strongly recommend review by a licensed attorney in your state, especially in NY, CA, or NJ.',
  },
  {
    q: 'Which states are supported?',
    a: 'All 50 US states are supported. Each lease includes the correct state-specific disclosures, security deposit limits, eviction notice periods, and late fee caps.',
  },
  {
    q: 'How do I save my lease as a PDF?',
    a: 'After generating your lease, click "Print / Save as PDF". In your browser\'s print dialog, set the destination to "Save as PDF". The lease is formatted for letter-size paper.',
  },
  {
    q: 'Can I add e-signatures?',
    a: 'Yes — two options. After generating your lease you can send it to your tenant for e-signature completely free (one per email address, no account needed). Or start a free 14-day PropertyFlow HQ trial to get unlimited e-signatures, rent collection, tenant portal, and more — all included.',
  },
  {
    q: 'What legal articles are included?',
    a: 'Your lease includes 19 articles covering: parties & property, lease term, rent & payment, late fees, security deposit, utilities, pets, smoking, maintenance, entry & access, renters insurance, move-out, default & remedies, governing law, and signatures.',
  },
];

export default function FreeLeaseBuilderPage() {
  return (
    <>
      <JsonLdScript data={jsonLdItems} id="free-lease-builder-ld" />

      <main className="min-h-screen bg-white">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 border-b border-sky-100 py-10 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Star className="h-3.5 w-3.5" />
              100% Free · No Account Required · All 50 States
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
              Free Lease Agreement Builder
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-5">
              Generate a free, court-ready residential lease agreement for any US state in under 5 minutes.
              State-specific disclosures, late fees, and deposit rules automatically included — no account required.
            </p>
            {/* ── Quick trust badges ── */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> No watermarks</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> Print to PDF free</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> All 50 states</span>
            </div>
          </div>
        </section>

        {/* ── Main content (wizard + sidebar, or full-width after generation) ── */}
        <LeaseBuilderSection />

        {/* ── Feature strip ────────────────────────────────────────────────── */}
        <section className="bg-slate-50 border-y border-slate-200 py-10 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Builder feature cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 items-stretch">
              {[
                {
                  icon: <MapPin className="h-5 w-5 text-sky-500" />,
                  title: 'All 50 States',
                  desc: 'Correct disclosures, deposit rules, and eviction notice periods auto-applied for your state.',
                },
                {
                  icon: <ShieldCheck className="h-5 w-5 text-sky-500" />,
                  title: 'Court-Ready Format',
                  desc: '19 legal articles drafted by property management professionals. Letter-size print layout.',
                },
                {
                  icon: <Clock className="h-5 w-5 text-sky-500" />,
                  title: 'Ready in 5 Minutes',
                  desc: 'No account needed for your first lease. Fill the form, enter your email, download PDF.',
                },
                {
                  icon: <Download className="h-5 w-5 text-sky-500" />,
                  title: 'Print to PDF Free',
                  desc: "Use your browser's built-in print-to-PDF. No watermarks, no hidden fees.",
                },
              ].map((item) => (
                <div key={item.title} className="flex flex-col bg-white rounded-xl border border-slate-200 p-3.5 text-left shadow-sm">
                  <div className="mb-2">{item.icon}</div>
                  <p className="text-xs font-bold text-gray-800 mb-1">{item.title}</p>
                  <p className="text-[11px] text-gray-500 leading-snug flex-1">{item.desc}</p>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-gray-900 text-center mb-8">
              What&apos;s included in every free lease
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                'Parties & property description',
                'Fixed-term or month-to-month',
                'Rent, due date & grace period',
                'Late fee schedule',
                'Security deposit terms',
                'Utilities (tenant vs. landlord)',
                'Pet policy & pet deposit',
                'Smoking & quiet hours',
                'Maintenance responsibilities',
                '24-hour entry notice',
                'Renters insurance clause',
                'Move-out checklist requirements',
                'Default & remedies language',
                'State-specific disclosures',
                'Lead paint / mold notices',
                'Signature blocks (all tenants)',
                'Auto-renewal language',
                'Early termination clause',
                'Governing law section',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-5">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 text-base mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-sky-500 to-cyan-500 py-14 px-4 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Ready to manage your whole rental business?</h2>
          <p className="text-sky-100 mb-6 max-w-xl mx-auto text-sm">
            PropertyFlow HQ gives landlords everything they need — leases, e-signatures, rent collection,
            tenant portal, maintenance tracking, and accounting. Free for 14 days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-up?utm_source=free_lease&utm_medium=bottom_cta"
              className="bg-white text-sky-600 font-bold px-8 py-3 rounded-xl hover:bg-sky-50 transition-colors"
            >
              Start Free Trial — No Credit Card
            </Link>
            <Link
              href="/about"
              className="border border-white/60 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* ── Legal disclaimer ─────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
          <span className="font-semibold text-gray-500">Legal disclaimer: </span>
          PropertyFlow HQ is a software platform, not a law firm. This lease builder does not constitute legal advice. Always consult a licensed attorney in your state before executing any lease agreement.
        </div>
      </main>
    </>
  );
}
