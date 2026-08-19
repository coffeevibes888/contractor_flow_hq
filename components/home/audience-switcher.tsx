'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, DollarSign, Clock, FileText, MessageSquare, Users, Briefcase, TrendingUp, CheckCircle, Zap, MapPin, Package, Building2 } from 'lucide-react';
import CustomerReviews from '@/components/home/customer-reviews';

type Audience = 'pm' | 'contractor';

const ROTATING_PAIN_LINES = [
  '1 unit or 500 — one platform.',
  'Enterprise accounting. Starter pricing.',
  'Owner statements. P&L. Bank rec.',
];

const PM_GRADIENT = {
  headlineTop: 'bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent',
  headlineBottom: 'bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent',
  accent: 'bg-gradient-to-r from-cyan-500 to-blue-500',
} as const;

const PM_YOUTUBE_CHANNEL = 'https://www.youtube.com/@property_flow_hq';

const PM_QUICK_WINS = [
  'Full GL accounting',
  'Owner statements',
  'Scales to 500+ units',
] as const;

function useRotatingText(texts: string[], intervalMs = 3200) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % texts.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [texts.length, intervalMs]);

  return texts[index];
}

const fadeSlide = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

// ─────────────────────────────────────────────
// PM HERO — Yardi-inspired split layout
// ─────────────────────────────────────────────
function PMHeroWithCarousel() {
  const rotatingPainLine = useRotatingText(ROTATING_PAIN_LINES);

  return (
    <motion.section
      {...fadeSlide}
      className="w-full pt-14 pb-12 md:pt-24 md:pb-20 px-4 relative overflow-hidden bg-white"
    >
      <div className="absolute insest-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 right-0 w-[90%] h-[90%] bg-gradient-to-bl from-sky-50/60 via-cyan-50/30 to-transparent rounded-bl-[120px]" />
        <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-sky-100/25 rounded-full blur-[100px]" />
        <div className="absolute top-40 right-40 w-80 h-80 bg-cyan-100/20 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="relative z-20 mx-auto max-w-lg lg:max-w-lg xl:max-w-xl mb-8 md:mb-0 md:absolute md:left-0 md:top-8 lg:top-12">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl sm:text-6xl md:text-4xl lg:text-5xl xl:text-5xl font-bold tracking-tight leading-[1.25] pb-2">
              <span className="block text-black">We Do Things</span>
              <span className="block text-black">Differntly Here</span>
              <span className={`block ${PM_GRADIENT.headlineTop}`}>At Property Flow HQ</span>
            </h1>
            <p className="text-base md:text-sm lg:text-base font-medium max-w-sm leading-relaxed mx-auto text-gray-600">
              We Automate the entire tenant and property lifecycle from creating and listing your properites to automatic lease's generations with E-Signatures to evictions and unit checklists
            </p>
            {/* <p className="text-base md:text-sm lg:text-base font-medium max-w-sm leading-relaxed mx-auto text-gray-600">
              From your 1st to your 500th Unit — one platform for rent collection, full accounting, maintenance, Unlimited Leases with E-Signatures, and Finally A Seamless Application Process.Unlike traditional platforms, Property Flow HQ was designed from the ground up to eliminate the busy-work — so you can own rental properties without it consuming your life.
            </p> */}
            <div className="flex flex-col items-center gap-2 pt-1">
              <Link
                href="/sign-up?role=landlord"
                className={`group inline-flex items-center justify-center rounded-full ${PM_GRADIENT.accent} text-white px-7 py-3.5 text-base md:text-sm font-bold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-105 transition-all duration-200`}
              >
                Start Free Trial — No Card Required
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>

            </div>
          </div>
        </div>

        <div className="relative md:ml-[28%] lg:ml-[30%]">
          <div className="absolute -inset-8 md:-inset-12 z-0 pointer-events-none">
            <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-sky-200/20 rounded-full blur-[80px]" />
            <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-cyan-200/20 rounded-full blur-[60px]" />
            <div className="absolute bottom-1/4 right-1/5 w-[350px] h-[350px] bg-blue-200/15 rounded-full blur-[70px]" />
          </div>

          <div className="hidden md:block absolute -left-24 top-0 bottom-0 w-48 z-10 bg-gradient-to-r from-white via-white/90 to-transparent pointer-events-none" />
          <div className="absolute -top-6 left-0 right-0 h-16 z-10 bg-gradient-to-b from-white via-white/70 to-transparent pointer-events-none" />
          <div className="absolute -bottom-2 left-0 right-0 h-24 z-10 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none" />

          <div className="relative z-[5] rounded-xl md:rounded-2xl border border-gray-300/80 md:border-r-cyan-300/50 shadow-lg md:shadow-[0_25px_80px_-12px_rgba(6,182,212,0.25),0_10px_30px_-5px_rgba(0,0,0,0.12)] overflow-hidden bg-white md:ring-1 md:ring-cyan-200/30">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200/80">
              <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              <div className="flex-1 mx-3">
                <div className="h-5 rounded-md bg-white border border-gray-200 flex items-center px-2.5">
                  <svg className="h-3 w-3 text-gray-400 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[10px] text-gray-500">contractorflowhq.com/admin/overview</span>
                </div>
              </div>
            </div>

            <Image
              src="/images/dashboard-preview.png"
              alt="Property Flow HQ dashboard — rent collection, maintenance tickets, applications, and leases in one place"
              width={1200}
              height={750}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 700px"
              className="w-full h-auto block"
              priority
            />
          </div>

          <div className="absolute -bottom-10 left-8 right-8 h-20 bg-gradient-to-t from-transparent via-cyan-300/15 to-sky-200/10 blur-2xl z-0 pointer-events-none" />
          <div className="absolute -bottom-6 left-16 right-16 h-12 bg-cyan-400/10 blur-xl rounded-full z-0 pointer-events-none" />
        </div>
      </div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────
// PM FEATURES (pain points grid)
// ─────────────────────────────────────────────
function PMFeatures() {
  const points = [
    { icon: Clock, color: 'bg-red-500/20 border-red-500/30', iconColor: 'text-red-400', title: 'Late Rent Every Month', desc: 'Chasing tenants for payments, sending reminders, tracking who paid what...', solution: 'Automated online payments with Stripe' },
    { icon: MessageSquare, color: 'bg-amber-500/20 border-amber-500/30', iconColor: 'text-amber-400', title: 'Maintenance Request Chaos', desc: 'Texts, calls, emails scattered everywhere. No way to track what\'s urgent.', solution: 'Centralized ticket system with priority tracking' },
    { icon: FileText, color: 'bg-blue-500/20 border-blue-500/30', iconColor: 'text-blue-400', title: 'Spreadsheet Nightmare', desc: 'Properties, tenants, leases, payments—all in different files that never sync.', solution: 'Everything in one organized dashboard' },
    { icon: Users, color: 'bg-purple-500/20 border-purple-500/30', iconColor: 'text-purple-400', title: 'Application Management Chaos', desc: 'Paper applications, lost emails, no way to compare applicants side-by-side.', solution: 'Digital applications with organized approval workflow' },
    { icon: FileText, color: 'bg-cyan-500/20 border-cyan-500/30', iconColor: 'text-cyan-400', title: 'Lease Management Mess', desc: 'Printing, signing, scanning, storing leases. Renewals slip through the cracks.', solution: 'Digital leases with e-signatures & auto-renewal reminders' },
    { icon: DollarSign, color: 'bg-pink-500/20 border-pink-500/30', iconColor: 'text-pink-400', title: 'Accounting That Actually Scales', desc: 'Buildium charges $200+/mo for GL, owner statements & P&L. AppFolio charges per unit.', solution: 'Full GL, owner statements, bank rec & Schedule E — from $39/mo flat.' },
  ];

  return (
    <section className="w-full py-10 md:py-20 px-4 md:px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2 animate-in fade-in duration-700">
          <h2 className="text-2xl md:text-4xl font-bold text-black">Enterprise Features. Accessible Pricing.</h2>
          <p className="text-sm md:text-lg text-black font-semibold max-w-2xl mx-auto">
            From your first unit to a 500-unit portfolio — everything scales with you on one flat monthly price.
          </p>
        </div>
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {points.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="group rounded-xl md:rounded-2xl border border-red-500/20 bg-gradient-to-r from-indigo-700 to-sky-600 p-6 space-y-4 transition-all duration-300 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg bg-red-500/20 p-2 border border-red-500/30`}>
                    <Icon className={`h-5 w-5 ${p.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                    <p className="text-xs text-black font-semibold mb-3">{p.desc}</p>
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                      <ArrowRight className="h-3 w-3" />
                      <span>Solution: {p.solution}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// CONTRACTOR FEATURES (pain points grid)
// ─────────────────────────────────────────────
function ContractorFeatures() {
  const points = [
    { icon: Briefcase, iconColor: 'text-rose-400', title: 'Jobs Scattered Everywhere', desc: 'Phone notes, text threads, paper quotes — no single source of truth for your jobs.', solution: 'Centralized job management with status tracking' },
    { icon: FileText, iconColor: 'text-amber-400', title: 'Invoice Chasing', desc: 'Sending invoices over email, following up manually, losing track of who owes what.', solution: 'Unlimited invoicing with automated payment reminders' },
    { icon: Users, iconColor: 'text-violet-400', title: 'Team Chaos', desc: 'No way to schedule your crew, track hours, or know who\'s on what job site.', solution: 'Team scheduling, GPS time tracking & timesheet approvals' },
    { icon: MapPin, iconColor: 'text-blue-400', title: 'No Online Presence', desc: 'Relying on word-of-mouth while competitors dominate Google and Yelp.', solution: 'Your own branded subdomain + marketplace listing' },
    { icon: Package, iconColor: 'text-emerald-400', title: 'Inventory Blindspots', desc: 'Showing up to jobs without the right materials because tracking is manual.', solution: 'Inventory & equipment management with low-stock alerts' },
    { icon: TrendingUp, iconColor: 'text-pink-400', title: 'No Visibility Into Revenue', desc: 'Not knowing if last month was actually profitable until it\'s too late.', solution: 'Finance dashboard with real-time P&L and job costing' },
  ];

  return (
    <section className="w-full md:py-10 px-4 md:px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2 animate-in fade-in duration-700">
          <h2 className="text-2xl md:text-4xl font-bold text-black">Run Your Entire Business From One Place</h2>
          <p className="text-sm md:text-lg text-slate-900 font-semibold max-w-2xl mx-auto">
            Stop duct-taping five apps together. Contractor Flow HQ is built for contractors who want to grow.
          </p>
        </div>
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {points.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="group rounded-xl md:rounded-2xl border border-rose-200/70 bg-gradient-to-br from-white via-rose-50 to-orange-50 p-6 space-y-4 transition-all duration-300 shadow-md hover:shadow-xl hover:border-rose-300">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 p-2 shadow-md shadow-rose-500/20">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-2">{p.title}</h3>
                    <p className="text-sm text-slate-600 mb-3 font-medium">{p.desc}</p>
                    <div className="flex items-center gap-2 text-rose-600 text-xs font-bold">
                      <ArrowRight className="h-3 w-3" />
                      <span>Solution: {p.solution}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// CONTRACTOR FEATURE SHOWCASE (replaces lease builder / portal cards)
// ─────────────────────────────────────────────
function ContractorShowcase() {
  return (
    <section className="w-full py-6 md:py-12 px-4 md:px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-4 md:gap-6 md:grid-cols-2">

          {/* Marketplace Card */}
          <div className="group relative rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50" />
            <div className="absolute inset-0 border border-rose-200/70 rounded-2xl md:rounded-3xl" />
            <div className="absolute top-4 right-4 md:top-6 md:right-6">
              <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-rose-600 text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full border border-rose-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                YOUR STOREFRONT
              </span>
            </div>
            <div className="relative p-8 md:p-10 space-y-5 md:space-y-7">
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <MapPin className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">Your Own Contractor Profile</h3>
                <p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium">
                  Get discovered by property managers in your area. Your branded subdomain, portfolio, reviews, and service area — all in one public profile.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['yourname.contractorflowhq.com', 'Client Reviews', 'Portfolio Gallery', 'Service Area Map'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 bg-white text-slate-800 text-[11px] md:text-xs font-semibold px-3 py-1.5 rounded-full border border-rose-200 shadow-sm">
                    <CheckCircle className="h-3 w-3 text-rose-500" />
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-slate-600 text-xs md:text-sm font-medium">Get found. Get hired. Get paid. No cold calling.</p>
            </div>
          </div>

          {/* Business OS Card */}
          <div className="group relative rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50" />
            <div className="absolute inset-0 border border-amber-200/70 rounded-2xl md:rounded-3xl" />
            <div className="absolute top-4 right-4 md:top-6 md:right-6">
              <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-amber-700 text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                FULL BUSINESS OS
              </span>
            </div>
            <div className="relative p-8 md:p-10 space-y-5 md:space-y-7">
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Zap className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Everything A-to-Z</h3>
                <p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium">
                  Leads, jobs, invoices, inventory, payroll, team scheduling, time tracking, marketing — one subscription runs your whole operation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Jobs & Work Orders', 'Invoicing & Estimates', 'Team + Time Tracking', 'Inventory & Equipment', 'Marketing Tools', 'QuickBooks Sync'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 bg-white text-slate-800 text-[11px] md:text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                    <CheckCircle className="h-3 w-3 text-amber-500" />
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-slate-600 text-xs md:text-sm font-medium">$99/mo flat. Everything included. No per-job fees. Ever.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// MAIN SWITCHER COMPONENT
// ─────────────────────────────────────────────


export default function AudienceSwitcher({
  pmPricingSection,
  contractorPricingSection,
  pmLifecycleSection,
  pmLeasePortalSection,
  contractorLifecycleSection,
  pmComparisonSection,
  contractorComparisonSection,
  forceAudience,
}: {
  pmPricingSection: React.ReactNode;
  contractorPricingSection: React.ReactNode;
  pmLifecycleSection: React.ReactNode;
  pmLeasePortalSection: React.ReactNode;
  contractorLifecycleSection?: React.ReactNode;
  pmComparisonSection?: React.ReactNode;
  contractorComparisonSection?: React.ReactNode;
  /** When set, overrides the search-param detection and locks the view */
  forceAudience?: 'pm' | 'contractor';
}) {
  const searchParams = useSearchParams();
  const [audience, setAudience] = useState<Audience>(forceAudience ?? 'pm');

  useEffect(() => {
    // If a forced audience is provided, always use it — ignore search params
    if (forceAudience) {
      setAudience(forceAudience);
      return;
    }
    const param = searchParams.get('for');
    setAudience(param === 'contractor' ? 'contractor' : 'pm');
  }, [searchParams, forceAudience]);

  const isPM = audience === 'pm';

  return (
    <>
      {/* ── Hero Section ── */}
      <AnimatePresence mode="wait">
        {isPM ? (
          <PMHeroWithCarousel key="pm-hero" />
        ) : (
          <motion.section
            key="contractor-hero"
            {...fadeSlide}
            className="w-full pt-14 pb-12 md:pt-24 md:pb-20 px-4 relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 right-0 w-[90%] h-[90%] bg-gradient-to-bl from-rose-50/60 via-orange-50/30 to-transparent rounded-bl-[120px]" />
              <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-rose-100/25 rounded-full blur-[100px]" />
              <div className="absolute top-40 right-40 w-80 h-80 bg-orange-100/20 rounded-full blur-[80px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
              {/* Text — centered on mobile, left on desktop */}
              <div className="relative z-20 mx-auto md:mx-0 max-w-lg lg:max-w-sm xl:max-w-md mb-8 md:mb-0 md:absolute md:left-0 md:top-8 lg:top-12">
                <div className="space-y-4 text-center md:text-left">
                  <h1 className="text-5xl sm:text-6xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.08]">
                    <span className="block bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text text-transparent">Run Your</span>
                    <span className="block bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent">Entire Business.</span>
                    <span className="block bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent whitespace-nowrap">One Platform.</span>
                  </h1>
                  <p className="text-base md:text-sm lg:text-base font-medium max-w-sm leading-relaxed mx-auto md:mx-0 text-gray-600">
                    Get found by property managers and home owners, win the job, and run everything — invoices, crew, scheduling, inventory — from one place. <span className="font-bold text-slate-900">$99/mo flat. No per-lead fees, ever.</span>
                  </p>
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <Link
                      href="/sign-up?role=contractor"
                      className="group inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white px-7 py-3.5 text-base md:text-sm font-bold shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 hover:scale-105 transition-all duration-200"
                    >
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Link>
                    <p className="text-xs font-medium text-gray-500">14-day free trial · No credit card · Cancel anytime</p>

                  </div>
                </div>
              </div>

              {/* Dashboard screenshot — BIG, prominent, emerging from the right */}
              <div className="relative md:ml-[28%] lg:ml-[30%]">
                {/* Warm glow radiating from behind the image */}
                <div className="absolute -inset-8 md:-inset-12 z-0 pointer-events-none">
                  <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-rose-200/25 rounded-full blur-[80px]" />
                  <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-orange-200/20 rounded-full blur-[60px]" />
                  <div className="absolute bottom-1/4 right-1/5 w-[350px] h-[350px] bg-amber-200/30 rounded-full blur-[70px]" />
                </div>

                {/* Left cloud fade — makes the image emerge from the text area */}
                <div className="hidden md:block absolute -left-24 top-0 bottom-0 w-48 z-10 bg-gradient-to-r from-white via-white/90 to-transparent pointer-events-none" />
                {/* Top cloud fade — emerging from the nav */}
                <div className="absolute -top-6 left-0 right-0 h-16 z-10 bg-gradient-to-b from-white via-white/70 to-transparent pointer-events-none" />
                {/* Bottom fade */}
                <div className="absolute -bottom-2 left-0 right-0 h-24 z-10 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none" />

                {/* Browser frame + screenshot */}
                <div className="relative z-[5] rounded-xl md:rounded-2xl border border-gray-300/80 md:border-r-rose-300/60 shadow-lg md:shadow-[0_25px_80px_-12px_rgba(244,63,94,0.35),0_10px_30px_-5px_rgba(0,0,0,0.12)] overflow-hidden bg-white md:ring-1 md:ring-rose-200/30">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200/80">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                    <div className="flex-1 mx-3">
                      <div className="h-5 rounded-md bg-white border border-gray-200 flex items-center px-2.5">
                        <svg className="h-3 w-3 text-gray-400 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-[10px] text-gray-500">contractorflowhq.com/contractor-dashboard</span>
                      </div>
                    </div>
                  </div>

                  {/* The actual contractor dashboard screenshot */}
                  <Image
                    src="/images/dashboard-preview2.png"
                    alt="Contractor Flow HQ Contractor Dashboard — manage jobs, invoices, leads, team, and inventory from one place"
                    width={1200}
                    height={750}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 70vw, 800px"
                    className="w-full h-auto block"
                    priority
                  />
                </div>

                {/* Rose cloud shadow underneath */}
                <div className="absolute -bottom-10 left-8 right-8 h-20 bg-gradient-to-t from-transparent via-rose-300/20 to-rose-200/10 blur-2xl z-0 pointer-events-none" />
                <div className="absolute -bottom-6 left-16 right-16 h-12 bg-rose-400/15 blur-xl rounded-full z-0 pointer-events-none" />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Social proof — directly under hero ── */}
      <CustomerReviews />

      {/* ── Audience-specific middle content ── */}
      <AnimatePresence mode="wait">
        {isPM ? (
          <motion.div key="pm-content" {...fadeSlide} className="space-y-16 md:space-y-24">
            {pmComparisonSection}
            {pmPricingSection}
            {pmLifecycleSection}
            <PMFeatures />
            {pmLeasePortalSection}
          </motion.div>
        ) : (
          <motion.div key="contractor-content" {...fadeSlide}>
            {contractorLifecycleSection}
            {contractorComparisonSection}
            {contractorPricingSection}
            <ContractorFeatures />
            <ContractorShowcase />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Made with Bob
