'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp, HelpCircle, ArrowRight } from 'lucide-react';

const pmFaqs = [
  {
    question: 'How much does Property Flow HQ cost?',
    answer: 'Plans start at $39/month and every plan includes a 14-day free trial. Your card is collected at checkout but the first charge happens on day 15 — cancel during the trial and you aren\'t billed at all. We have three tiers — Starter ($39/mo, up to 24 units), Pro ($99/mo, up to 150 units), and Enterprise ($199/mo, unlimited units). Cancel anytime, no contracts. Rent collection is included with no additional per-payment fees.',
  },
  {
    question: 'How does rent collection work?',
    answer: 'Tenants pay rent through our secure Stripe-powered payment system. They can use credit cards, debit cards, or bank transfers (ACH). Funds are deposited directly to your bank account with no additional per-payment fees from us.'
  },
  {
    question: 'Can tenants pay rent in cash?',
    answer: 'Yes! Landlords can record cash payments received directly from tenants through the tenant management dashboard. The payment is tracked and reflected in the tenant\'s payment history.',
  },
  {
    question: 'How do digital leases and e-signatures work?',
    answer: 'Upload your lease template or use our state-specific templates. Send leases to tenants for electronic signature — no printing, scanning, or mailing required. All signed documents are stored securely and accessible anytime.',
  },
  {
    question: 'What is the branded tenant portal?',
    answer: 'Every landlord gets a custom subdomain (yourname.propertyflowhq.com) where tenants can view available units, submit applications, pay rent, request maintenance, and access their lease documents. It\'s your own professional property management website.',
  },
  {
    question: 'How do maintenance requests work?',
    answer: 'Tenants submit maintenance requests through their portal with photos and descriptions. You receive instant notifications, can assign priority levels, track progress, and communicate with tenants — all in one place.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use bank-level 256-bit encryption for all sensitive data. Payments are processed through Stripe, a PCI-DSS Level 1 certified payment processor. We never store credit card numbers on our servers.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes, you can change your plan anytime. Upgrades take effect immediately, and downgrades take effect at the end of your billing cycle. If you downgrade below your current unit count, you\'ll need to remove units first.',
  },
  {
    question: 'Do you offer tenant screening?',
    answer: 'Yes! Our Growth and Professional plans include integrated tenant screening with background checks, credit reports, and eviction history. You can run screenings directly from the application review page.',
  },
  {
    question: 'How do I get started?',
    answer: 'Sign up in under 2 minutes — no setup fees, no contracts. Add your properties, invite your tenants, and start collecting rent online. Every plan includes a 14-day free trial: card is collected at checkout but you aren\'t charged until day 15. Cancel anytime during the trial.',
  },
];

const contractorFaqs = [
  {
    question: 'How much does Property Flow HQ cost for contractors?',
    answer: 'Plans start at $39/month and every plan includes a 14-day free trial. Your card is collected at checkout but the first charge happens on day 15 — cancel during the trial and you aren\'t billed at all. All plans include unlimited invoicing, job management, and your own branded contractor profile. No per-job fees, ever.',
  },
  {
    question: 'How does invoicing and getting paid work?',
    answer: 'Create and send professional invoices in seconds. Clients can pay online via credit card, debit card, or bank transfer (ACH) through our secure Stripe-powered system. Funds go directly to your bank account.',
  },
  {
    question: 'What is the contractor marketplace?',
    answer: 'The marketplace is where property managers discover and hire contractors. Your profile includes your services, service area, portfolio, and client reviews — helping you get found and hired without cold calling.',
  },
  {
    question: 'Do I get my own branded profile page?',
    answer: 'Yes! Every contractor gets a custom subdomain (yourname.propertyflowhq.com) with your logo, portfolio gallery, service area map, reviews, and contact info. It\'s your own professional online presence.',
  },
  {
    question: 'How does team scheduling and time tracking work?',
    answer: 'Assign crew members to jobs, set schedules, and track hours with GPS-verified clock-in/out. Approve timesheets and run payroll — all from one dashboard. No more paper timesheets or guesswork.',
  },
  {
    question: 'Can I manage inventory and equipment?',
    answer: 'Yes. Track materials, tools, and equipment across job sites. Set low-stock alerts so you never show up to a job without the right supplies. Log equipment maintenance and assignments.',
  },
  {
    question: 'How do estimates and contracts work?',
    answer: 'Build professional estimates with line items, photos, and terms. When approved, convert them to jobs with one click. Send contracts for e-signature — no printing or scanning needed.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use bank-level 256-bit encryption for all sensitive data. Payments are processed through Stripe, a PCI-DSS Level 1 certified payment processor. We never store credit card numbers on our servers.',
  },
  {
    question: 'Can I track revenue and job profitability?',
    answer: 'Yes. The finance dashboard gives you real-time profit & loss, job costing breakdowns, and revenue trends. Know exactly which jobs are profitable and where your money is going.',
  },
  {
    question: 'How do I get started?',
    answer: 'Sign up in under 2 minutes — no setup fees, no contracts. Add your first job, send an invoice, and set up your contractor profile. Every plan includes a 14-day free trial: card is collected at checkout but you aren\'t charged until day 15. Cancel anytime during the trial.',
  },
];

export default function FAQSection() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isContractor =
    searchParams.get('for') === 'contractor' || pathname?.startsWith('/contractor') || pathname === '/';
  const faqs = isContractor ? contractorFaqs : pmFaqs;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className='w-full py-10 md:py-20 px-4 md:px-4 bg-white'>
      <div className='max-w-4xl mx-auto space-y-8 md:space-y-12'>

        {/* Header */}
        <div className='text-center space-y-3'>
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${
            isContractor
              ? 'bg-rose-500/10 border border-rose-500/20'
              : 'bg-cyan-500/10 border border-cyan-500/20'
          }`}>
            <HelpCircle className={`h-3.5 w-3.5 ${isContractor ? 'text-rose-400' : 'text-cyan-400'}`} />
            <span className={`text-xs font-bold ${isContractor ? 'text-rose-600' : 'text-cyan-600'}`}>Got Questions?</span>
          </div>
          <h2 className='text-2xl md:text-4xl font-black text-slate-900'>
            Frequently Asked{' '}
            <span className={`bg-clip-text text-transparent ${
              isContractor
                ? 'bg-gradient-to-r from-rose-400 to-orange-400'
                : 'bg-gradient-to-r from-cyan-400 to-blue-400'
            }`}>Questions</span>
          </h2>
          <p className='text-sm md:text-base text-slate-400 max-w-2xl mx-auto'>
            Everything you need to know about Property Flow HQ{isContractor ? ' for Contractors' : ''}
          </p>
        </div>

        {/* Accordion */}
        <div className='space-y-3'>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                openIndex === index
                  ? isContractor
                    ? 'border-rose-300 bg-rose-50/50'
                    : 'border-cyan-300 bg-cyan-50/50'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className='w-full flex items-center justify-between p-4 md:p-5 text-left transition-colors'
              >
                <span className='text-sm md:text-base font-semibold text-slate-900 pr-4'>
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className={`h-5 w-5 flex-shrink-0 ${isContractor ? 'text-rose-400' : 'text-cyan-400'}`} />
                ) : (
                  <ChevronDown className='h-5 w-5 text-slate-500 flex-shrink-0' />
                )}
              </button>
              {openIndex === index && (
                <div className='px-4 md:px-5 pb-4 md:pb-5 border-t border-white/5'>
                  <p className='text-xs md:text-sm text-slate-600 leading-relaxed pt-4'>
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className='text-center space-y-3 pt-4'>
          <p className='text-slate-500 text-sm'>Still have questions?</p>
          <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
            <Link
              href={isContractor ? '/sign-up?role=contractor' : '/sign-up'}
              className={`inline-flex items-center gap-2 rounded-full text-white px-7 py-3 text-sm font-bold shadow-xl hover:scale-105 transition-transform duration-200 ${
                isContractor
                  ? 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-500/20'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/20'
              }`}
            >
              Get Started
              <ArrowRight className='h-4 w-4' />
            </Link>
            <Link
              href='/contact'
              className='text-sm text-slate-400 hover:text-slate-600 transition-colors font-medium'
            >
              Contact Support &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
