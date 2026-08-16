'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  Zap,
  FileText,
  CreditCard,
  Users,
  BarChart3,
  CheckSquare,
  ArrowRight,
  Star,
  X,
  Building2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { faqLd } from '@/lib/seo';
import JsonLdScript from '@/components/seo/json-ld-script';

const faqs = [
  {
    category: 'What is PropertyFlow HQ & How It Works',
    questions: [
      {
        q: 'What is PropertyFlow HQ?',
        a: 'PropertyFlow HQ is an all-in-one, automation-first property management platform built for independent landlords and property managers who are tired of juggling spreadsheets, chasing rent, and manually creating leases. Unlike traditional platforms, PropertyFlow HQ was designed from the ground up to eliminate the busy-work — so you can own rental properties without it consuming your life.',
      },
      {
        q: 'How does tenant onboarding work?',
        a: 'When you invite a tenant, they receive a branded onboarding link. They fill out their profile, upload their ID, sign their lease electronically, and set up their payment method — all in one guided flow. Once complete, they\'re automatically activated in your dashboard, their portal goes live, and you get a notification. No back-and-forth emails, no paperwork.',
      },
      {
        q: 'How does automatic rent collection work?',
        a: 'Tenants set up autopay during onboarding and rent is automatically charged on the due date. Payments process via ACH bank transfer or credit/debit card through Stripe and deposit directly into your bank account — no manual invoicing, no chasing. If a payment fails, the tenant is automatically notified with a retry link.',
      },
      {
        q: 'How are leases automatically generated?',
        a: 'Upload your lease template once to your Documents Center. When you add a new tenant and unit, the platform auto-populates the lease with the tenant\'s name, property address, rent amount, start/end dates, and any custom clauses you\'ve saved. The tenant receives it for e-signature instantly. Signed copies are stored in both the landlord and tenant portals automatically.',
      },
      {
        q: 'What is the tenant portal?',
        a: 'Every tenant gets their own secure portal where they can pay rent, view payment history, submit maintenance requests with photos, download their lease, and message their property manager. Everything is mobile-friendly and accessible 24/7 — tenants never need to call you for basic information.',
      },
      {
        q: 'How do investor reports get updated automatically?',
        a: 'Your investor reports pull live data from your properties — rent collected, vacancies, expenses, net income, and maintenance costs. Every time a payment is processed or an expense is logged, the reports update in real time. You can share a read-only investor report link with your partners or download a PDF at any time. No manual spreadsheet updates ever.',
      },
      {
        q: 'How do checklists and move-in/move-out work?',
        a: 'PropertyFlow HQ includes digital inspection checklists for move-in and move-out. You or your tenant complete them on a phone with photos attached to each item. The completed checklist is timestamped and stored permanently in the tenant\'s file, protecting you in any security deposit dispute.',
      },
      {
        q: 'How does the Documents Center work?',
        a: 'The Documents Center is your central hub for all property-related files — leases, addendums, inspection reports, insurance certificates, vendor contracts, and more. Upload a document once and it\'s accessible to the right people automatically. Lease templates stored here are used to auto-generate new leases for every new tenant.',
      },
      {
        q: 'What automations run behind the scenes?',
        a: 'PropertyFlow HQ automates: rent collection and late fee notices, lease generation and e-signature routing, tenant onboarding flows, maintenance request routing to contractors, investor report updates, move-in/move-out checklists, payment receipts and confirmations, and lease renewal reminders. Most landlords report spending less than 30 minutes a week on property management after setup.',
      },
    ],
  },
  {
    category: 'Why PropertyFlow HQ vs. AppFolio, Buildium & MagicDoor',
    questions: [
      {
        q: 'How is PropertyFlow HQ different from AppFolio?',
        a: 'AppFolio is built for large property management companies with hundreds of units and charges $1.49–$3/unit/month with a minimum monthly fee — pricing that punishes small landlords. PropertyFlow HQ is a flat subscription ($39–$199/month) with no per-unit fees, no setup costs, and no minimum commitments. We also include a built-in contractor marketplace, investor portal, and AI-assisted lease generation — features AppFolio charges extra for or doesn\'t offer at all.',
      },
      {
        q: 'How is PropertyFlow HQ different from Buildium?',
        a: 'Buildium starts at $55/month and charges per unit beyond your base tier. Their interface is complex and takes weeks to learn. PropertyFlow HQ is designed to be operational within an hour, with guided onboarding, smart automations, and a modern UI that doesn\'t require a training manual. We also don\'t charge extra for e-signatures, resident portals, or online payments — it\'s all included.',
      },
      {
        q: 'How is PropertyFlow HQ different from MagicDoor?',
        a: 'MagicDoor is a newer platform focused on simplicity, but it lacks the depth of automation and the contractor marketplace ecosystem that PropertyFlow HQ offers. We go beyond basic rent collection with automatic lease generation from your own templates, investor reporting, escrow-protected contractor payments, and a full API for power users. MagicDoor is a starting point — PropertyFlow HQ is a complete operating system for your rental business.',
      },
      {
        q: 'Do you charge per-unit fees like other platforms?',
        a: 'No. PropertyFlow HQ uses flat-rate subscriptions: Starter ($39/month, up to 24 units), Pro ($99/month, up to 100 units), and Enterprise ($199/month, unlimited units + team features + API access). You always know exactly what you\'re paying — no surprises, no per-unit penalties for growth.',
      },
      {
        q: 'Do you charge tenants fees to pay rent?',
        a: 'No. Unlike platforms that charge tenants $2–$5 per transaction, PropertyFlow HQ charges tenants nothing to pay rent via ACH or card. Your subscription covers payment processing. This means tenants are happier to use autopay, which means you get paid on time — every month.',
      },
      {
        q: 'Is there a long-term contract?',
        a: 'No contracts, no lock-ins. PropertyFlow HQ is month-to-month. You can upgrade, downgrade, or cancel at any time from your dashboard. We earn your business every month.',
      },
    ],
  },
  {
    category: 'General',
    questions: [
      {
        q: 'Who can use PropertyFlow HQ?',
        a: 'Our platform is designed for landlords, property managers, tenants, contractors, and homeowners. Each user type has access to features tailored to their specific needs.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes — every plan includes a 14-day free trial. We collect your card at checkout so the moment you decide to keep going there\'s no interruption, but the first charge happens on day 15. Cancel anytime during the trial and you\'re not billed at all.',
      },
    ],
  },
  {
    category: 'Pricing & Billing',
    questions: [
      {
        q: 'What are the subscription tiers?',
        a: 'We offer three tiers: Starter ($39/month for up to 24 units), Pro ($99/month for up to 100 units), and Enterprise ($199/month for unlimited units with team features).',
      },
      {
        q: 'Are there any transaction fees?',
        a: 'No platform fees on any transactions - your subscription covers everything. Tenants pay rent with no added fees, and payments go directly to your bank account.',
      },
      {
        q: 'What payment methods do tenants have?',
        a: 'Tenants can pay rent via ACH bank transfer or credit/debit card. No fees are charged to tenants - your subscription covers payment processing.',
      },
    ],
  },
  {
    category: 'For Landlords',
    questions: [
      {
        q: 'How do I receive rent payments?',
        a: 'Rent payments go directly to your bank account via Stripe. Complete a quick onboarding process (about 5 minutes), and payments will automatically deposit to your bank - typically within 2 business days for card payments or 5 days for ACH.',
      },
      {
        q: 'Can I manage multiple properties?',
        a: 'Yes! You can add unlimited properties and units based on your subscription tier. Each property can have multiple units with individual lease tracking.',
      },
      {
        q: 'How does the contractor marketplace work?',
        a: 'You can post work orders and hire verified contractors directly through our platform. Payments are handled securely with escrow protection.',
      },
    ],
  },
  {
    category: 'For Tenants',
    questions: [
      {
        q: 'How do I pay rent?',
        a: 'Log into your tenant dashboard and click "Pay Rent". You can pay via bank account (ACH) or credit/debit card - no fees either way.',
      },
      {
        q: 'Can I set up autopay?',
        a: 'Yes! You can enable automatic rent payments from your dashboard. We\'ll charge your saved payment method on your rent due date.',
      },
      {
        q: 'How do I submit a maintenance request?',
        a: 'From your tenant dashboard, go to Maintenance and click "New Request". Describe the issue, add photos if needed, and submit. Your landlord will be notified immediately.',
      },
    ],
  },
  {
    category: 'For Contractors',
    questions: [
      {
        q: 'How do I get hired for jobs?',
        a: 'Create a contractor profile, list your services and service areas, and you\'ll appear in search results. Landlords and homeowners can then hire you for work orders.',
      },
      {
        q: 'How do I get paid?',
        a: 'Payments are released to your connected Stripe account once the job is marked complete. Funds typically arrive in 2-3 business days.',
      },
      {
        q: 'What fees do contractors pay?',
        a: 'No platform fees for contractors. Payments go directly to your connected bank account when jobs are completed.',
      },
      {
        q: 'Do I get API access as a contractor?',
        a: 'Yes, on the Enterprise plan ($199/month). Contractor API keys start with pfhq_c_ and give you programmatic access to your jobs, invoices, and customers. You can also set up webhooks to receive real-time notifications when jobs are completed, invoices are paid, reviews come in, and more. Manage everything from Settings → API & Webhooks in your dashboard. Full docs at /docs/api/contractor.',
      },
      {
        q: 'What is the difference between the PM API and the Contractor API?',
        a: 'They are completely separate systems. The Property Manager API (pfhq_ keys) gives access to properties, units, leases, tenants, and rent payments — for landlords managing their portfolio. The Contractor API (pfhq_c_ keys) gives access to jobs, invoices, and customers — for contractors automating their business. Both require the Enterprise plan on their respective accounts.',
      },
      {
        q: 'How does the ranking system work? How do I show up higher in search?',
        a: 'Your position in search results is based entirely on merit — a composite score out of 100 points. Here\'s exactly how it breaks down: Average Rating (25pts, Bayesian-weighted so one review can\'t game the system), Review Volume (15pts, log scale so new contractors aren\'t buried), Completed Jobs (15pts, log scale), Response Rate (15pts — reply to messages fast!), Profile Completeness (10pts — fill in your photo, bio, tagline, location, and rate), Trust & Verification (10pts — get identity verified and insured), On-Time Rate (5pts), and Recent Activity (5pts — stay active). The best way to rank higher is completely free: get reviews, complete your profile, respond quickly, and get verified.',
      },
      {
        q: 'Can I pay to rank higher in search results?',
        a: 'No. Money cannot change your organic rank — that is always based on merit. What you can purchase is a Visibility Boost, which increases how many people see your card. Boosted cards appear in clearly labeled "Sponsored" slots (max 3 at a time) that rotate daily so no one locks the top forever. Packages start at $2.99 for 500 impressions, up to $9.99 for 3,000 impressions. Credits never expire.',
      },
      {
        q: 'What is the Visibility Boost and how does it work?',
        a: 'A Visibility Boost is an optional purchase that gets your contractor card shown to more people. You buy impression credits ($2.99–$9.99), and your card rotates into one of up to 3 "Sponsored" slots at the top of the marketplace. The rotation changes daily using a random seed, so even if many contractors have boosts, each gets fair exposure over time. Your organic rank is never affected — this is purely about reach, not rank. You can purchase boosts from your dashboard under Business → Marketplace Visibility.',
      },
      {
        q: 'Do new contractors get any help getting noticed?',
        a: 'Yes! Every new contractor automatically receives a free 30-day visibility boost when they create their profile. This gives you time to complete your profile, get your first reviews, and build your job history before competing purely on merit. After 30 days, your ranking is based on your actual quality signals.',
      },
      {
        q: 'What does "Verified" mean on a contractor card?',
        a: 'The green "Verified" badge means the contractor has completed both identity verification and insurance verification. This is worth 10 points in the ranking algorithm and signals to clients that you\'re a trusted professional. You can complete verification from your contractor dashboard.',
      },
      {
        q: 'Why does my specialty filter not show me even though I offer that service?',
        a: 'Make sure your specialties are listed in your profile under Business → Public Profile → Specialties. The filter matches against your listed specialties. If you offer Roofing and Electrical, you\'ll appear in results for both filters. The system matches regardless of capitalization.',
      },
    ],
  },
  {
    category: 'Security & Support',
    questions: [
      {
        q: 'Is my data secure?',
        a: 'Yes! We use industry-standard encryption, secure payment processing through Stripe, and follow best practices for data protection. We never store sensitive payment information on our servers.',
      },
      {
        q: 'How do I contact support?',
        a: 'You can reach our support team via the Contact page, or email us directly. Enterprise customers have access to priority support.',
      },
      {
        q: 'Do you offer an API?',
        a: 'Yes! Both Property Managers (Enterprise $199/month) and Contractors (Enterprise $199/month) have access to their own REST API and webhooks. Property Managers can automate properties, units, leases, tenants, and payments. Contractors can automate jobs, invoices, and customers. API keys are created from your dashboard under Settings → API & Webhooks. Full documentation is at /docs/api.',
      },
    ],
  },
];

const automationFeatures = [
  { icon: FileText, label: 'Auto Lease Generation', desc: 'Upload your template once. Leases are generated, populated, and sent for e-signature automatically for every new tenant.' },
  { icon: CreditCard, label: 'Automatic Rent Collection', desc: 'Autopay charges tenants on the due date. Funds deposit directly to your bank. Late notices send themselves.' },
  { icon: Users, label: 'Guided Tenant Onboarding', desc: 'Tenants complete onboarding, ID upload, lease signing, and payment setup in one seamless flow — no emails needed.' },
  { icon: BarChart3, label: 'Live Investor Reports', desc: 'Reports update in real time with every payment, expense, and vacancy change. Share a link or download a PDF instantly.' },
  { icon: CheckSquare, label: 'Digital Checklists', desc: 'Move-in and move-out inspections with photos, timestamps, and permanent storage — protecting you in any dispute.' },
  { icon: Zap, label: 'Contractor Marketplace', desc: 'Post work orders, get bids from verified contractors, and pay securely with escrow — all inside the platform.' },
];

function FAQItem({ question, answer, highlight }: { question: string; answer: string; highlight?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-cyan-400/30 text-cyan-200 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="font-medium text-white text-sm md:text-base">
          {highlightText(question, highlight || '')}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 flex-shrink-0 text-white/60 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="pb-4 text-white/70 text-sm leading-relaxed">
          {highlightText(answer, highlight || '')}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (faq) =>
            faq.q.toLowerCase().includes(q) ||
            faq.a.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.questions.length > 0);
  }, [searchQuery]);

  const totalResults = filteredFaqs.reduce((sum, cat) => sum + cat.questions.length, 0);

  // Flatten every Q&A across categories into a single FAQPage schema.
  // Google ranks rich-snippet eligibility by completeness, so we feed it
  // the full canonical list, not just the currently-filtered ones (the
  // search filter is a UX layer, not what Google should index).
  const faqLdData = useMemo(
    () =>
      faqLd(
        faqs.flatMap((cat) =>
          cat.questions.map((q) => ({ question: q.q, answer: q.a })),
        ),
      ),
    [],
  );

  return (
    <div className="min-h-screen">
      <JsonLdScript data={faqLdData} id="faq" />

      {/* ── HERO / ABOUT SECTION ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 pt-14 pb-10 max-w-5xl relative">

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/30 rounded-full px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300 tracking-wide uppercase">Property Management, Reimagined</span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
              The operating system<br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                for your rental business.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              PropertyFlow HQ automates the entire lifecycle of rental property management — from tenant onboarding and lease generation to rent collection and investor reporting — so you can own more properties without working more hours.
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { label: 'Flat-rate pricing', sub: 'No per-unit fees ever' },
              { label: 'No tenant fees', sub: 'Free ACH & card payments' },
              { label: 'Month-to-month', sub: 'No contracts or lock-ins' },
              { label: '< 30 min/week', sub: 'After setup — seriously' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center">
                <div className="text-white font-bold text-sm">{s.label}</div>
                <div className="text-white/50 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Automation features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {automationFeatures.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="bg-white/8 backdrop-blur-sm border border-white/15 rounded-xl p-5 flex flex-col gap-3 hover:bg-white/12 hover:border-cyan-400/40 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4.5 w-4.5 text-cyan-400" style={{ width: '1.1rem', height: '1.1rem' }} />
                  </div>
                  <span className="font-semibold text-white text-sm">{label}</span>
                </div>
                <p className="text-white/60 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* VS comparison strip */}
          <div className="bg-white/8 border border-white/15 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="h-4 w-4 text-white/50" />
              <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">How we compare</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/50 font-medium pb-3 pr-4 text-xs">Feature</th>
                    <th className="text-center pb-3 px-3">
                      <span className="text-cyan-400 font-bold text-xs">PropertyFlow HQ</span>
                    </th>
                    <th className="text-center pb-3 px-3">
                      <span className="text-white/40 font-medium text-xs">AppFolio</span>
                    </th>
                    <th className="text-center pb-3 px-3">
                      <span className="text-white/40 font-medium text-xs">Buildium</span>
                    </th>
                    <th className="text-center pb-3 px-3">
                      <span className="text-white/40 font-medium text-xs">MagicDoor</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  {[
                    ['Flat-rate pricing', '✅', '❌ per-unit', '❌ per-unit', '✅'],
                    ['No tenant payment fees', '✅', '❌', '❌', '✅'],
                    ['Auto lease generation', '✅', '✅ (extra cost)', '⚠️ limited', '❌'],
                    ['Built-in contractor marketplace', '✅', '❌', '❌', '❌'],
                    ['Live investor reports', '✅', '✅', '✅', '❌'],
                    ['Escrow-protected payments', '✅', '❌', '❌', '❌'],
                    ['Full REST API + webhooks', '✅', '✅ (enterprise)', '⚠️ limited', '❌'],
                    ['Month-to-month, no contracts', '✅', '❌', '❌', '✅'],
                    ['Setup time', '< 1 hour', '1–2 weeks', '1–2 weeks', '< 1 hour'],
                  ].map(([feature, ...vals]) => (
                    <tr key={feature} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-4 text-white/60 text-xs">{feature}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={cn('py-2.5 px-3 text-center text-xs', i === 0 ? 'text-cyan-300 font-medium' : 'text-white/50')}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── FAQ SECTION ── */}
      <div className="container mx-auto px-4 pb-16 max-w-4xl">

        {/* FAQ Header + AI Search */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">Search anything</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-white/60 text-base mb-6">
            Search across all questions, or browse by category below.
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything… e.g. 'how does autopay work' or 'vs appfolio'"
              className="w-full bg-white/10 backdrop-blur border border-white/25 rounded-xl pl-12 pr-12 py-4 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-cyan-400/60 focus:bg-white/15 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="text-white/40 text-xs mt-3">
              {totalResults === 0
                ? 'No results found. Try different keywords or contact support.'
                : `Found ${totalResults} result${totalResults === 1 ? '' : 's'} across ${filteredFaqs.length} categor${filteredFaqs.length === 1 ? 'y' : 'ies'}`}
            </p>
          )}
        </div>

        {/* FAQ Categories */}
        <div className="space-y-6">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
              <Search className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">No questions match &ldquo;{searchQuery}&rdquo;</p>
              <button onClick={() => setSearchQuery('')} className="mt-3 text-cyan-400 text-sm hover:underline">
                Clear search
              </button>
            </div>
          ) : (
            filteredFaqs.map((category) => (
              <div
                key={category.category}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  {(category.category === 'What is PropertyFlow HQ & How It Works') && (
                    <Zap className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  )}
                  {(category.category === 'Why PropertyFlow HQ vs. AppFolio, Buildium & MagicDoor') && (
                    <Star className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  )}
                  {category.category}
                </h3>
                <div className="space-y-0">
                  {category.questions.map((faq) => (
                    <FAQItem
                      key={faq.q}
                      question={faq.q}
                      answer={faq.a}
                      highlight={searchQuery}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center bg-white/8 border border-white/15 rounded-2xl p-8">
          <p className="text-white font-semibold text-lg mb-2">Still have questions?</p>
          <p className="text-white/50 text-sm mb-6">Our team responds within a few hours, usually faster.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-7 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20"
            >
              Contact Support
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-7 py-3 rounded-xl font-semibold text-sm transition-all"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
