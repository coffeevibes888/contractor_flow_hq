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
  Wrench,
  ArrowRight,
  Star,
  X,
  Sparkles,
  Hammer,
  ClipboardList,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { faqLd } from '@/lib/seo';
import JsonLdScript from '@/components/seo/json-ld-script';

const faqs = [
  {
    category: 'What is Contractor Flow HQ & How It Works',
    questions: [
      {
        q: 'What is Contractor Flow HQ?',
        a: 'Contractor Flow HQ is an all-in-one business platform built specifically for contractors. It replaces the patchwork of tools most contractors use — separate apps for invoicing, scheduling, time tracking, estimates, and customer management — with a single integrated system. Jobs, invoices, team scheduling, inventory, payroll, contracts, and your own branded marketplace profile — all in one place for $99/month.',
      },
      {
        q: 'How does job management work?',
        a: 'Create jobs from leads, estimates, or scratch. Each job tracks scope, timeline, materials, photos, time entries, expenses, and change orders. Assign crew members, set milestones, and move jobs through statuses (quoted → approved → scheduled → in progress → completed → invoiced → paid). The whole lifecycle is connected — when a job completes, an invoice is auto-generated from logged time and expenses.',
      },
      {
        q: 'How does invoicing and getting paid work?',
        a: 'Create and send professional invoices in seconds — or let the system auto-generate them when jobs complete. Customers pay online via credit card, debit card, or bank transfer (ACH) through Stripe. Funds deposit directly to your bank account in 1-2 business days. Auto-reminders chase overdue invoices so you don\'t have to.',
      },
      {
        q: 'How do estimates and contracts work?',
        a: 'Build professional estimates with line items, photos, and terms. When a customer accepts, the estimate auto-converts to a job and a contract is generated for e-signature — no re-typing, no printing. Contracts are state-specific and trade-specific (12+ trades supported) with proper warranty, insurance, and dispute resolution language.',
      },
      {
        q: 'How does team scheduling work?',
        a: 'Assign crew to jobs with a drag-and-drop calendar. Team members see their schedule on their phone. GPS clock-in/out tracks hours by job site automatically. Timesheets are generated at the end of each pay period, and payroll can be processed with one click after review.',
      },
      {
        q: 'How does inventory tracking work?',
        a: 'Track materials, tools, and equipment across your warehouse, trucks, and job sites. Set reorder points — when stock drops below the threshold, purchase orders are auto-created and sent to your preferred vendors. When materials arrive, the system checks if any waiting jobs are now fully stocked and notifies your crew.',
      },
      {
        q: 'What automations run behind the scenes?',
        a: 'Contractor Flow HQ automates: invoice generation on job completion, invoice sending to customers, payroll calculation when invoices are paid, purchase order creation when materials run low, crew assignment based on skills and availability, timesheet generation at pay period close, material readiness notifications, shipment delivery alerts to crew, and escrow auto-release after PM approval deadlines pass.',
      },
      {
        q: 'How does the CRM and lead pipeline work?',
        a: 'Every lead, estimate request, and customer interaction is tracked in your CRM pipeline. Leads move through stages (new → contacted → quoted → won/lost). When you win a lead, it converts to a job with one click. The marketplace also sends you qualified leads from property managers in your area — no cold calling needed.',
      },
    ],
  },
  {
    category: 'Why Contractors Switch from Jobber, Angi & Thumbtack',
    questions: [
      {
        q: 'How is Contractor Flow HQ different from Jobber?',
        a: 'Same core tools (jobs, invoices, scheduling, GPS time tracking) at a lower price — $99/month vs Jobber\'s $129+ Connect plan. Jobber charges extra for time tracking, route optimization, and inventory. We include everything in one plan. Plus we have a built-in marketplace where property managers actively hire contractors — Jobber doesn\'t send you any leads.',
      },
      {
        q: 'How is Contractor Flow HQ different from Angi?',
        a: 'Angi charges $15-80+ per lead whether you win the job or not. We charge a flat $99/month — zero per-lead fees, zero per-job fees. You also get the full business management platform (invoicing, scheduling, team, inventory) that Angi doesn\'t offer. And our marketplace lets property managers hire you directly without per-lead charges.',
      },
      {
        q: 'How is Contractor Flow HQ different from Thumbtack?',
        a: 'Thumbtack charges per lead ($15-50+) and offers no business management tools. You\'re paying for introductions with no guarantee of work. With Contractor Flow HQ, you get unlimited leads from our marketplace PLUS the entire toolkit to run your business — $99/month flat. No per-lead charges ever.',
      },
      {
        q: 'Is there a per-job or per-lead fee?',
        a: 'No. Flat $99/month for everything — unlimited jobs, unlimited invoices, unlimited team members, unlimited customers. We make money on the subscription, not by taxing your jobs or charging per lead. That\'s the fundamental difference.',
      },
      {
        q: 'Is there a long-term contract?',
        a: 'No contracts, no lock-ins. Month-to-month. Cancel anytime from your dashboard — your data exports and your account simply pauses. No early-termination fees, no gotchas.',
      },
    ],
  },
  {
    category: 'Pricing & Billing',
    questions: [
      {
        q: 'How much does Contractor Flow HQ cost?',
        a: '$99/month for everything unlimited. One plan, no tiers, no upsells. Jobs, invoices, team members, customers, inventory, contracts, scheduling, payroll, marketplace — all included. We also offer a 20% discount for annual billing ($950/year instead of $1,188).',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes — 14 days, completely free, no credit card required. You get full access to every feature. After the trial, add a payment method to continue at $99/month. If you don\'t add payment, your account pauses (data is preserved, just read-only).',
      },
      {
        q: 'Are there any transaction fees?',
        a: 'No platform fees from us on any transactions. When customers pay invoices via Stripe, standard Stripe processing fees apply (2.9% + $0.30 for cards, 0.8% for ACH). These are Stripe\'s fees, not ours — same rates you\'d pay anywhere.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel from your dashboard at any time. No penalty, no early termination fee. Your subscription continues until the end of the current billing period, then your account moves to read-only mode. You can reactivate anytime.',
      },
    ],
  },
  {
    category: 'Jobs & Invoicing',
    questions: [
      {
        q: 'Can I track job profitability?',
        a: 'Yes. Every job shows real-time profit and loss: revenue (from invoice) minus labor costs (from time entries × hourly rates) minus material costs (from expenses). The finance dashboard shows which job types are most profitable, revenue trends by month, and where your money is going.',
      },
      {
        q: 'How do change orders work?',
        a: 'Create a change order with the scope change description, additional cost, and timeline adjustment. Send it for customer approval. Once signed, the change order amount is rolled into the job\'s total cost automatically. All change orders are tracked and linked to the original contract.',
      },
      {
        q: 'Can I create recurring invoices?',
        a: 'Yes. Set up recurring invoices for maintenance contracts, retainer agreements, or any ongoing service. Choose the frequency (weekly, monthly, quarterly), and invoices are auto-generated and sent on schedule.',
      },
      {
        q: 'How does the free contract builder work?',
        a: 'Our free contract builder generates court-ready service agreements for 12+ contractor trades (HVAC, plumbing, roofing, electrical, painting, etc.). Each contract includes trade-specific warranty language, state-specific disclosures and cancellation rights, payment terms, insurance requirements, and e-signature blocks. One free contract per email, no account needed.',
      },
    ],
  },
  {
    category: 'Team & Scheduling',
    questions: [
      {
        q: 'How many team members can I add?',
        a: 'Unlimited. There\'s no cap on team members, crew size, or subcontractors. Add everyone from your lead technician to your office admin — all included in the $99/month.',
      },
      {
        q: 'How does GPS time tracking work?',
        a: 'Team members clock in from their phone. The app captures GPS coordinates at clock-in and clock-out, so you know they\'re at the job site. Hours are automatically logged against the job. At the end of the pay period, timesheets are generated for your review and approval.',
      },
      {
        q: 'Can I run payroll through the platform?',
        a: 'Yes. Once timesheets are approved, the system calculates gross pay, overtime (1.5× over 40 hours), and estimated deductions (federal, Social Security, Medicare). You review the payroll summary and confirm with one click. Payments can be processed via direct deposit or marked as paid manually for check/cash.',
      },
      {
        q: 'Does auto-assign work for crew scheduling?',
        a: 'Yes — when enabled, the system automatically suggests the best crew for each new job based on: skills match (job type vs. employee certifications), availability (no conflicting shifts), proximity, and performance rating. You can accept the suggestion or override manually.',
      },
    ],
  },
  {
    category: 'Inventory & Materials',
    questions: [
      {
        q: 'How does inventory tracking work?',
        a: 'Track every item across locations (warehouse, trucks, job sites). Each item has a reorder point — when stock drops below it, the system auto-creates a purchase order to your preferred vendor. When materials are received, the system checks if any waiting jobs are now fully stocked.',
      },
      {
        q: 'What happens when I receive materials?',
        a: 'Log received items through the receiving dock. Inventory quantities update automatically. The system then checks all scheduled jobs that needed those items — if a job\'s materials are now all in stock, you and your assigned crew get a "materials ready" notification.',
      },
      {
        q: 'Can I track materials per job?',
        a: 'Yes. Link inventory items to specific jobs as "job materials". Track what\'s needed, what\'s reserved, what\'s loaded on the truck, and what\'s actually used. Material costs flow into the job\'s P&L automatically.',
      },
      {
        q: 'How do purchase orders work?',
        a: 'Create POs manually or let the system auto-generate them when inventory hits reorder points. POs are linked to vendors and optionally to specific jobs. Track order status from draft → sent → acknowledged → received.',
      },
    ],
  },
  {
    category: 'Marketplace & Growth',
    questions: [
      {
        q: 'What is the contractor marketplace?',
        a: 'The marketplace is where property managers and homeowners discover and hire contractors. Your profile includes your services, trade specialties, service area, portfolio photos, client reviews, and a direct contact form. Getting listed is free with your subscription — no per-lead fees.',
      },
      {
        q: 'Do I get my own branded profile page?',
        a: 'Yes. Every contractor gets a custom subdomain (yourname.contractorflowhq.com) with your logo, cover photo, portfolio gallery, service area map, reviews, "Why Choose Me" cards, and an about section. It\'s your own professional online presence.',
      },
      {
        q: 'How does the ranking system work?',
        a: 'Your position in marketplace search results is based on merit — a composite score out of 100 points: Average Rating (25pts), Review Volume (15pts), Completed Jobs (15pts), Response Rate (15pts), Profile Completeness (10pts), Verification (10pts), On-Time Rate (5pts), and Recent Activity (5pts). Money cannot buy organic rank.',
      },
      {
        q: 'Can I pay to rank higher?',
        a: 'No. Organic rank is always merit-based. What you can purchase is a Visibility Boost — impression credits ($2.99–$9.99) that rotate your card into clearly labeled "Sponsored" slots. The rotation changes daily for fair exposure. This increases how many people see you, but doesn\'t change your position in organic results.',
      },
      {
        q: 'Do new contractors get any help getting noticed?',
        a: 'Yes. Every new contractor gets a free 30-day visibility boost when they create their profile. This gives you time to complete your profile, get your first reviews, and build job history before competing purely on merit.',
      },
    ],
  },
  {
    category: 'Security & Support',
    questions: [
      {
        q: 'Is my data secure?',
        a: 'Yes. Bank-level 256-bit SSL encryption on all data. Payments processed through Stripe (PCI-DSS Level 1 certified). We never store credit card numbers on our servers. All data is backed up with redundancy. SOC 2 compliance in progress.',
      },
      {
        q: 'How do I contact support?',
        a: 'Email us via the Contact page or from your dashboard. Priority support is included for all subscribers — we typically respond within a few hours. Enterprise API users also have access to a dedicated Slack channel.',
      },
      {
        q: 'Do you offer an API?',
        a: 'Yes. The Contractor API gives programmatic access to your jobs, invoices, customers, and more. Set up webhooks to receive real-time notifications for job status changes, invoice payments, reviews, and other events. API keys are created from Settings → API & Webhooks. Full docs at /docs/api/contractor.',
      },
    ],
  },
];

const platformFeatures = [
  { icon: ClipboardList, label: 'Job Management & Dispatch', desc: 'Create jobs, assign crew, track from estimate to payment — the full lifecycle in one system.' },
  { icon: DollarSign, label: 'Invoicing & Payments', desc: 'Auto-generate invoices from completed jobs. Customers pay online. Funds in your bank in 1-2 days.' },
  { icon: Users, label: 'Team Scheduling & Payroll', desc: 'GPS time clock, timesheet approvals, and one-click payroll. No more paper timesheets.' },
  { icon: Wrench, label: 'Inventory & Equipment', desc: 'Track materials per job. Auto-reorder when low. Know what\'s on which truck.' },
  { icon: FileText, label: 'Contracts & E-Sign', desc: 'Trade-specific, state-compliant contracts with legally-binding e-signatures. 12+ trades supported.' },
  { icon: BarChart3, label: 'Analytics & Profitability', desc: 'Real-time P&L by job, revenue trends, expense tracking, and QuickBooks sync.' },
];

function FAQItem({ question, answer, highlight }: { question: string; answer: string; highlight?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-orange-400/30 text-orange-200 rounded px-0.5">{part}</mark>
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

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 pt-14 pb-10 max-w-5xl relative">

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-orange-400/10 border border-orange-400/30 rounded-full px-4 py-1.5">
              <Hammer className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-xs font-bold text-orange-300 tracking-wide uppercase">Built for Contractors</span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
              The operating system<br />
              <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
                for your contracting business.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              Contractor Flow HQ automates the entire lifecycle of your contracting business — from leads and estimates to jobs, invoicing, team management, and getting paid — so you can take on more work without working more hours.
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { label: '$99/mo flat', sub: 'Everything unlimited' },
              { label: 'No per-lead fees', sub: 'Unlike Angi & Thumbtack' },
              { label: '14-day free trial', sub: 'No credit card required' },
              { label: 'Cancel anytime', sub: 'No contracts or lock-ins' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center">
                <div className="text-white font-bold text-sm">{s.label}</div>
                <div className="text-white/50 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Platform features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {platformFeatures.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="bg-white/8 backdrop-blur-sm border border-white/15 rounded-xl p-5 flex flex-col gap-3 hover:bg-white/12 hover:border-orange-400/40 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-400/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4.5 w-4.5 text-orange-400" style={{ width: '1.1rem', height: '1.1rem' }} />
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
              <Star className="h-4 w-4 text-white/50" />
              <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">How we compare</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/50 font-medium pb-3 pr-4 text-xs">Feature</th>
                    <th className="text-center pb-3 px-3">
                      <span className="text-orange-400 font-bold text-xs">Contractor Flow HQ</span>
                    </th>
                    <th className="text-center pb-3 px-3">
                      <span className="text-white/40 font-medium text-xs">Jobber</span>
                    </th>
                    <th className="text-center pb-3 px-3">
                      <span className="text-white/40 font-medium text-xs">Angi Leads</span>
                    </th>
                    <th className="text-center pb-3 px-3">
                      <span className="text-white/40 font-medium text-xs">Thumbtack</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  {[
                    ['Monthly price', '$99 flat', '$129+', '$300+', 'Per lead'],
                    ['Per-lead / per-job fee', '$0', '$0', '$15–80+', '$15–50+'],
                    ['Jobs & invoicing', '✅', '✅', '❌', '❌'],
                    ['Team scheduling', '✅', '✅ (extra)', '❌', '❌'],
                    ['GPS time tracking', '✅', '✅ (extra)', '❌', '❌'],
                    ['Inventory management', '✅', '❌', '❌', '❌'],
                    ['Payroll processing', '✅', '❌', '❌', '❌'],
                    ['E-sign contracts', '✅', '⚠️ limited', '❌', '❌'],
                    ['Branded profile + marketplace', '✅', '❌', '❌', '❌'],
                    ['No credit card trial', '✅', '❌', '❌', '❌'],
                  ].map(([feature, ...vals]) => (
                    <tr key={feature} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-4 text-white/60 text-xs">{feature}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={cn('py-2.5 px-3 text-center text-xs', i === 0 ? 'text-orange-300 font-medium' : 'text-white/50')}>
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

        {/* FAQ Header + Search */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs font-bold text-orange-300 uppercase tracking-wide">Search anything</span>
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
              placeholder="Ask anything… e.g. 'how does GPS tracking work' or 'vs jobber'"
              className="w-full bg-white/10 backdrop-blur border border-white/25 rounded-xl pl-12 pr-12 py-4 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-orange-400/60 focus:bg-white/15 transition-all"
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
              <button onClick={() => setSearchQuery('')} className="mt-3 text-orange-400 text-sm hover:underline">
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
                  {(category.category.includes('What is')) && (
                    <Zap className="h-4 w-4 text-orange-400 flex-shrink-0" />
                  )}
                  {(category.category.includes('Switch')) && (
                    <Star className="h-4 w-4 text-orange-400 flex-shrink-0" />
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
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white px-7 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-orange-500/20"
            >
              Contact Support
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/sign-up?role=contractor"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-7 py-3 rounded-xl font-semibold text-sm transition-all"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
