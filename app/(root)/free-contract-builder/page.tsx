import type { Metadata } from 'next';
import ContractBuilderSection from '@/components/contractor/contracts/contract-builder-section';
import Link from 'next/link';
import { CheckCircle, Star, ShieldCheck, Clock, Download, Hammer } from 'lucide-react';
import JsonLdScript from '@/components/seo/json-ld-script';

export const metadata: Metadata = {
  title: 'Free Contractor Contract Builder — All 50 States | PropertyFlow HQ',
  description:
    'Create a free contractor service agreement online in under 5 minutes. Trade-specific legal language for 12+ trades. Court-ready, printable PDF — no account required. E-sign included free.',
  keywords: [
    'free contractor contract builder',
    'free service agreement',
    'contractor contract template',
    'contractor agreement generator',
    'free construction contract',
    'service agreement builder',
    'contractor e-sign contract',
    'HVAC contract template',
    'plumbing contract template',
    'roofing contract template',
    'general contractor agreement',
    'free contractor agreement',
    'construction contract builder',
  ],
  openGraph: {
    title: 'Free Contractor Contract Builder — All 50 States | PropertyFlow HQ',
    description:
      'Generate a trade-specific contractor service agreement online in under 5 minutes — completely free. 12+ trades supported, court-ready PDF, no watermarks.',
    url: 'https://www.propertyflowhq.com/free-contract-builder',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Contractor Contract Builder — All 50 States',
    description:
      'Generate a trade-specific service agreement in under 5 minutes — free. No account, no watermarks, printable PDF.',
  },
  alternates: {
    canonical: 'https://www.propertyflowhq.com/free-contract-builder',
  },
};

const PAGE_URL = 'https://www.propertyflowhq.com/free-contract-builder';
const SITE_URL = 'https://www.propertyflowhq.com';

const jsonLdItems = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': PAGE_URL,
    url: PAGE_URL,
    name: 'Free Contractor Contract Builder — All 50 States | PropertyFlow HQ',
    description: 'Create a free contractor service agreement online in under 5 minutes. Trade-specific legal language for 12+ trades.',
    isPartOf: { '@type': 'WebSite', name: 'PropertyFlow HQ', url: SITE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Free Contract Builder', item: PAGE_URL },
      ],
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${PAGE_URL}#app`,
    name: 'Free Contractor Contract Builder',
    url: PAGE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    isPartOf: { '@type': 'WebSite', name: 'PropertyFlow HQ', url: SITE_URL },
    featureList: [
      '12+ contractor trades supported',
      'Trade-specific legal provisions auto-applied',
      'Court-ready format with signature blocks',
      'Warranty, insurance, and dispute clauses included',
      'Print to PDF free — no watermarks',
      'Free e-signature included (one per email)',
      'No account required for first contract',
    ],
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'One free trade-specific contractor service agreement — no sign-up required',
        eligibleRegion: { '@type': 'Country', name: 'US' },
      },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is this contractor contract builder really free?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. Your first contract is completely free — no credit card, no account required. Simply fill in your project details, enter your email, and download as PDF.' },
      },
      {
        '@type': 'Question',
        name: 'Which contractor trades are supported?',
        acceptedAnswer: { '@type': 'Answer', text: 'We support 12+ trades: General Contractor, HVAC, Plumbing, Roofing, Electrical, Painting, Landscaping, Flooring, Solar, Concrete, Excavation, and Remodeling. Each includes trade-specific warranty, compliance, and safety language.' },
      },
      {
        '@type': 'Question',
        name: 'Can I add e-signatures?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes — start a free 14-day PropertyFlow HQ trial to send your contract for legally-binding e-signature, manage jobs, invoices, and your entire business from one platform.' },
      },
      {
        '@type': 'Question',
        name: 'Is the contract legally binding?',
        acceptedAnswer: { '@type': 'Answer', text: 'Our contract template includes comprehensive legal provisions (warranty, dispute resolution, termination, insurance requirements) and is designed to be court-ready. We recommend attorney review for high-value projects.' },
      },
    ],
  },
];

const FAQS = [
  {
    q: 'Is this contractor contract builder really free?',
    a: 'Yes. Your first contract is completely free — no credit card, no account required. Simply fill in your project details, enter your email, and download your contract as a PDF. Unlimited contracts require a free PropertyFlow HQ trial.',
  },
  {
    q: 'Is the contract legally binding?',
    a: 'Our contract template includes comprehensive legal provisions — warranty, dispute resolution, termination, insurance requirements, and signature blocks. It\'s designed to be court-ready. We recommend attorney review for high-value projects.',
  },
  {
    q: 'Which contractor trades are supported?',
    a: 'All 12+ trades: General Contractor, HVAC, Plumbing, Roofing, Electrical, Painting, Landscaping, Flooring, Solar, Concrete, Excavation, and Remodeling. Each includes trade-specific warranty language, compliance notes, and safety provisions.',
  },
  {
    q: 'How do I save my contract as a PDF?',
    a: 'After generating your contract, click "Print / Save as PDF". In your browser\'s print dialog, set the destination to "Save as PDF". The contract is formatted for letter-size paper.',
  },
  {
    q: 'Can I send it for e-signature?',
    a: 'Yes — start a free 14-day PropertyFlow HQ trial to send contracts for e-signature, manage jobs and crew, send invoices, and get paid online. $99/month after trial, cancel anytime.',
  },
  {
    q: 'What legal sections are included?',
    a: 'Your contract includes: parties & job site, scope of work & deliverables, timeline & milestones, payment terms & late fees, warranty provisions, insurance requirements, termination & cure period, dispute resolution, change order process, and signature blocks.',
  },
];

export default function FreeContractBuilderPage() {
  return (
    <>
      <JsonLdScript data={jsonLdItems} id="free-contract-builder-ld" />

      <main className="min-h-screen bg-white">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-orange-50 via-white to-rose-50 border-b border-orange-100 py-10 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Star className="h-3.5 w-3.5" />
              100% Free · No Account Required · 12+ Trades
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
              Free Contractor Contract Builder
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-5">
              Generate a free, court-ready contractor service agreement in under 5 minutes.
              Trade-specific warranty, insurance, and compliance provisions automatically included — no account required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> No watermarks</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> Print to PDF free</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> 12+ trades</span>
            </div>
          </div>
        </section>

        {/* ── Main content (wizard + sidebar) ──────────────────────────────── */}
        <ContractBuilderSection />

        {/* ── Feature strip ────────────────────────────────────────────────── */}
        <section className="bg-slate-50 border-y border-slate-200 py-10 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 items-stretch">
              {[
                { icon: <Hammer className="h-5 w-5 text-orange-500" />, title: '12+ Trades', desc: 'Trade-specific warranty, safety, and compliance language for every major contractor trade.' },
                { icon: <ShieldCheck className="h-5 w-5 text-orange-500" />, title: 'Court-Ready Format', desc: 'Comprehensive legal articles: scope, payment, warranty, dispute resolution, and signatures.' },
                { icon: <Clock className="h-5 w-5 text-orange-500" />, title: 'Ready in 5 Minutes', desc: 'No account needed for your first contract. Fill the form, enter your email, download PDF.' },
                { icon: <Download className="h-5 w-5 text-orange-500" />, title: 'Print to PDF Free', desc: "Use your browser's built-in print-to-PDF. No watermarks, no hidden fees." },
              ].map((item) => (
                <div key={item.title} className="flex flex-col bg-white rounded-xl border border-slate-200 p-3.5 text-left shadow-sm">
                  <div className="mb-2">{item.icon}</div>
                  <p className="text-xs font-bold text-gray-800 mb-1">{item.title}</p>
                  <p className="text-[11px] text-gray-500 leading-snug flex-1">{item.desc}</p>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-gray-900 text-center mb-8">
              What&apos;s included in every free contract
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                'Parties & job site address',
                'Detailed scope of work',
                'Deliverables checklist',
                'Project timeline & milestones',
                'Payment terms & schedule',
                'Late fee provisions',
                'Deposit & retainage terms',
                'Warranty period & coverage',
                'Insurance requirements',
                'Workers comp provisions',
                'Materials & permits responsibility',
                'Change order process',
                'Termination & cure period',
                'Dispute resolution clause',
                'Governing law section',
                'Trade-specific compliance',
                'Subcontractor provisions',
                'Signature blocks',
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
        <section className="bg-gradient-to-br from-orange-500 to-rose-500 py-14 px-4 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Ready to run your whole contracting business?</h2>
          <p className="text-orange-100 mb-6 max-w-xl mx-auto text-sm">
            PropertyFlow HQ gives contractors everything — contracts, e-signatures, invoicing, scheduling,
            crew management, inventory, and payments. $99/month, everything unlimited. 14-day free trial.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-up?role=contractor&utm_source=free_contract&utm_medium=bottom_cta"
              className="bg-white text-orange-600 font-bold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors"
            >
              Start Free Trial — No Credit Card
            </Link>
            <Link
              href="/contractor"
              className="border border-white/60 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* ── Legal disclaimer ─────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
          <span className="font-semibold text-gray-500">Legal disclaimer: </span>
          PropertyFlow HQ is a software platform, not a law firm. This contract builder does not constitute legal advice. Always consult a licensed attorney in your state before executing any service agreement.
        </div>
      </main>
    </>
  );
}
