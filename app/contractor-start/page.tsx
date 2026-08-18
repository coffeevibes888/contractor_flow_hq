import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import MetaViewContent from '@/components/analytics/meta-view-content';
import {
  CheckCircle2,
  Shield,
  FileSignature,
  Hammer,
  Globe,
  Banknote,
  CalendarClock,
  ArrowRight,
  Star,
  ClipboardList,
  Users,
  X,
  Check,
  TrendingUp,
  Clock,
  Zap,
  MapPin,
  DollarSign,
  AlertTriangle,
  Smartphone,
  CreditCard,
  Receipt,
  FolderOpen,
  Wrench,
  Quote,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Run Your Whole Contracting Business — $99/mo Unlimited — Property Flow HQ',
  description:
    'Stop paying Angi $300+/mo or Jobber $129+/mo. $99/mo gets you everything unlimited — estimates, invoices, scheduling, GPS crew tracking, inventory and your own branded marketplace profile. 14-day free trial, no credit card. Cancel anytime.',
  alternates: { canonical: 'https://www.propertyflowhq.com/contractor-start' },
  openGraph: {
    title: 'Run Your Whole Contracting Business — $99/mo Unlimited',
    description:
      'Estimates, invoices, scheduling, GPS crew tracking, inventory, branded marketplace profile. 14-day free trial, no credit card. Cancel anytime.',
    url: 'https://www.propertyflowhq.com/contractor-start',
  },
  robots: { index: false, follow: true },
};

// ── Comparison data (Pro tier vs competitors — honest like-for-like) ──
const COMPARISON_ROWS: { feature: string; vals: [string, string, string, string] }[] = [
  { feature: 'Monthly price', vals: ['$99', '$300+', 'Per lead', '$129+'] },
  { feature: 'Cost per job/lead', vals: ['$0', '$15-80+', '$15-50+', '$0'] },
  { feature: 'Jobs & work orders', vals: ['yes', 'no', 'no', 'yes'] },
  { feature: 'Invoicing & estimates', vals: ['yes', 'no', 'no', 'yes'] },
  { feature: 'CRM & customer portal', vals: ['yes', 'no', 'no', 'extra'] },
  { feature: 'Inventory tracking', vals: ['yes', 'no', 'no', 'extra'] },
  { feature: 'Team scheduling', vals: ['yes', 'no', 'no', 'Pro+'] },
  { feature: 'GPS time tracking', vals: ['yes', 'no', 'no', 'extra'] },
  { feature: 'Branded profile page', vals: ['yes', 'no', 'no', 'no'] },
  { feature: 'PM/Landlord marketplace', vals: ['yes', 'no', 'no', 'no'] },
  { feature: 'QuickBooks sync', vals: ['yes', 'no', 'no', 'extra'] },
];
const COMPARISON_COLS = ['Property Flow HQ', 'Angi Leads', 'Thumbtack', 'Jobber'];

// ── Pain points → solutions (top of funnel hook) ──────────────────
const PAIN_POINTS = [
  {
    icon: Receipt,
    pain: 'Chasing invoices over text',
    solution: 'Auto-reminders. Pay-by-link. Done.',
  },
  {
    icon: Clock,
    pain: 'No idea where your crew is',
    solution: 'GPS clock-in by job site. Real-time.',
  },
  {
    icon: DollarSign,
    pain: 'Bleeding $300+/mo to Angi for leads',
    solution: 'Get found by PMs free in our marketplace. $99/mo flat.',
  },
  {
    icon: FolderOpen,
    pain: 'Job photos scattered across phones',
    solution: 'Before / during / after, attached to the job.',
  },
  {
    icon: FileSignature,
    pain: 'Verbal deals that fall apart',
    solution: 'E-sign contracts before you roll the truck.',
  },
  {
    icon: TrendingUp,
    pain: 'Guessing if last month was profitable',
    solution: 'Live P&L by job. Know your real margin.',
  },
];

// ── Features (what they actually get) ─────────────────────────────
// tier marks where each feature unlocks — keeps the page honest.
const FEATURES = [
  { icon: ClipboardList, tier: 'All', title: 'Estimates → Invoices', desc: 'Send a quote, customer accepts, it auto-converts to a job and invoice. Zero re-typing.' },
  { icon: FileSignature, tier: 'All', title: 'E-Sign Contracts', desc: 'Lock in scope and price legally before you start. Built into every estimate.' },
  { icon: Globe, tier: 'All', title: 'Branded Subdomain', desc: 'yourname.propertyflowhq.com — your logo, portfolio, reviews, lead form.' },
  { icon: Banknote, tier: 'All', title: 'Get Paid Faster', desc: 'ACH, card, or bank transfer. Built on Stripe. Money hits in 1-2 days.' },
  { icon: Wrench, tier: 'All', title: 'Inventory & Equipment', desc: 'Track materials and tools per job. Low-stock alerts. No more empty trucks.' },
  { icon: CalendarClock, tier: 'All', title: 'Scheduling + Dispatch', desc: 'Drag-and-drop calendar. Auto-text reminders. No more double-bookings.' },
  { icon: Users, tier: 'All', title: 'Crew + Subs', desc: 'Unlimited team members. Assign jobs, approve hours, run payroll-ready reports.' },
  { icon: MapPin, tier: 'All', title: 'GPS Time Tracking', desc: 'Crew clocks in by job site. Geofenced. Timesheets auto-build for payroll.' },
  { icon: Smartphone, tier: 'All', title: 'Mobile-First', desc: 'Built for the truck cab. Quote on-site. Sign on a phone. Photos from the field.' },
];

const STEPS = [
  { n: '01', title: 'Sign up free', desc: 'Email + password. No credit card. 60 seconds to your dashboard.' },
  { n: '02', title: 'Add services + crew', desc: 'Set your pricing, invite your team, connect your bank for payments.' },
  { n: '03', title: 'Send your first job', desc: 'Estimate → e-sign → schedule → invoice → paid. All in one flow.' },
];

const TESTIMONIALS = [
  {
    quote: "I dropped Jobber and Angi the same week. Saved $300/mo and I'm booking more PM jobs from the marketplace than Angi ever sent me.",
    name: 'Marcus T.',
    role: 'General Contractor',
    location: 'Denver, CO',
    metric: '$300/mo saved',
  },
  {
    quote: "GPS time tracking alone paid for it. I caught 4 hours of phantom labor my first week. The whole platform is $99 — no-brainer.",
    name: 'Diana R.',
    role: 'HVAC Owner-Operator',
    location: 'Phoenix, AZ',
    metric: '4 hrs caught wk 1',
  },
  {
    quote: "I send the e-sign estimate from the truck before I leave the driveway. Customers feel pro, I lock in jobs faster.",
    name: 'James K.',
    role: 'Roofer',
    location: 'Tampa, FL',
    metric: 'Closes on-site',
  },
];

const FAQS = [
  {
    q: 'What do I get for $99/month?',
    a: 'Everything. Unlimited jobs, team members, invoices, customers, inventory, equipment, leads, scheduling, GPS time tracking, payroll, subcontractor management, QuickBooks sync, e-sign contracts, custom branding, API access, and priority support. One plan, no tiers, no limits.',
  },
  {
    q: 'Is there really no per-job or per-lead fee?',
    a: 'Correct. Flat $99/month — no per-job, per-lead, or per-invoice fees. Angi and Thumbtack charge $15-80+ for every lead whether you win it or not. We don\'t. We make money on the subscription, not by taxing your jobs.',
  },
  {
    q: 'How is this different from Jobber or Housecall Pro?',
    a: 'Same core tools (jobs, invoices, scheduling, GPS, time tracking) at a lower price — $99/mo vs Jobber\'s $129+ Connect (and Jobber charges extra for time tracking and inventory). Plus we include a public marketplace where property managers and landlords actively hire contractors. Jobber doesn\'t send you any leads. We do.',
  },
  {
    q: 'Do I need a credit card to start the trial?',
    a: 'No. Sign up with just your email — no credit card required for the 14-day trial. You get full access to every feature. After 14 days, add a payment method to continue at $99/month.',
  },
  {
    q: 'Can my crew use it on their phones?',
    a: 'Yes. The whole app is mobile-first. Crew clocks in by GPS, uploads job photos, and sees their schedule from any phone. Works in the browser — no app store install needed.',
  },
  {
    q: 'How does cancellation work?',
    a: 'You can cancel any time from your dashboard. We don\'t do auto-renew traps — you control your subscription, and your account simply pauses if you cancel. No long-term contract, no early-termination fees.',
  },
  {
    q: 'Do I need to pay to get into the marketplace?',
    a: 'No. Every subscriber gets a free profile in our marketplace and a branded subdomain (yourname.propertyflowhq.com). PMs and landlords on our platform browse and hire directly — no per-lead charges.',
  },
];

export default async function ContractorLandingPage() {
  const session = await auth();

  const ctaUrl = session?.user
    ? '/onboarding/contractor/subscription?plan=pro'
    : '/sign-up?role=contractor&plan=pro&interval=monthly&skipOnboarding=true';

  return (
    <main className='min-h-screen bg-white text-slate-900 antialiased'>
      <MetaViewContent
        contentName='contractor_landing_start'
        contentCategory='contractor'
        value={99}
      />

      {/* ────────── HEADER ────────── */}
      <header className='border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-40'>
        <div className='max-w-6xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-2'>
            <Image src='/images/logo.svg' alt='Property Flow HQ' width={36} height={36} priority />
            <span className='font-bold text-slate-900'>Property Flow HQ</span>
          </Link>
          <Link
            href={ctaUrl}
            className='inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 text-white text-sm font-bold px-4 py-2 shadow-lg shadow-rose-500/20 transition-all'
          >
            Get Started <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </header>

      {/* ────────── HERO ────────── */}
      <section className='relative overflow-hidden bg-white'>
        {/* warm glow background */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute -top-20 right-0 w-[90%] h-[90%] bg-gradient-to-bl from-rose-50/60 via-orange-50/40 to-transparent rounded-bl-[120px]' />
          <div className='absolute top-10 right-10 w-[500px] h-[500px] bg-rose-100/30 rounded-full blur-[100px]' />
          <div className='absolute top-40 right-40 w-80 h-80 bg-orange-100/25 rounded-full blur-[80px]' />
        </div>

        <div className='relative max-w-6xl mx-auto px-6 pt-12 pb-16 md:pt-20 md:pb-24'>
          <div className='grid md:grid-cols-2 gap-10 items-center'>
            {/* Left — copy */}
            <div className='space-y-6 text-center md:text-left'>
              <span className='inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 uppercase tracking-wider'>
                <Hammer className='h-3.5 w-3.5' /> Built for Real Contractors
              </span>

              <h1 className='text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]'>
                <span className='block bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text text-transparent'>Run Your</span>
                <span className='block bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent'>Entire Business.</span>
                <span className='block bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent'>$99/mo. Unlimited.</span>
              </h1>

              <p className='text-base md:text-lg text-slate-600 leading-relaxed max-w-lg mx-auto md:mx-0'>
                Estimates, invoices, scheduling, GPS crew tracking, inventory, and your own branded marketplace profile. One plan, everything unlimited at <span className='font-semibold text-slate-900'>$99/mo</span> — less than Jobber, no per-lead fees. 14-day free trial, no credit card.
              </p>

              <div className='flex flex-col sm:flex-row gap-3 justify-center md:justify-start items-center pt-1'>
                <Link
                  href={ctaUrl}
                  className='group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 text-white font-bold text-base px-7 py-4 shadow-xl shadow-rose-500/25 transition-all hover:scale-[1.02] w-full sm:w-auto'
                >
                  Start 14-day free trial
                  <ArrowRight className='h-5 w-5 group-hover:translate-x-0.5 transition-transform' />
                </Link>
              </div>

              <p className='text-xs text-slate-500 flex items-center justify-center md:justify-start gap-2'>
                <Shield className='h-3.5 w-3.5 text-emerald-500' />
                No charge until day 15 · Setup in 5 minutes · Cancel anytime
              </p>

              {/* Star strip — hidden until we have real public ratings. */}
              {/* <div className='flex items-center gap-3 justify-center md:justify-start pt-2'>
                <div className='flex items-center gap-0.5'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className='h-4 w-4 fill-amber-400 text-amber-400' />
                  ))}
                </div>
                <span className='text-sm text-slate-600'>Loved by solo ops and crews nationwide</span>
              </div> */}
            </div>

            {/* Right — dashboard preview */}
            <div className='relative'>
              <div className='absolute -inset-6 z-0 pointer-events-none'>
                <div className='absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-rose-200/30 rounded-full blur-[80px]' />
                <div className='absolute bottom-1/4 right-1/5 w-[300px] h-[300px] bg-orange-200/30 rounded-full blur-[70px]' />
              </div>
              <div className='relative z-10 rounded-xl md:rounded-2xl border border-slate-300/80 shadow-2xl shadow-rose-500/20 overflow-hidden bg-white ring-1 ring-rose-200/30'>
                <div className='flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200/80'>
                  <div className='h-2.5 w-2.5 rounded-full bg-[#FF5F57]' />
                  <div className='h-2.5 w-2.5 rounded-full bg-[#FFBD2E]' />
                  <div className='h-2.5 w-2.5 rounded-full bg-[#28C840]' />
                  <div className='flex-1 mx-3'>
                    <div className='h-5 rounded-md bg-white border border-gray-200 flex items-center px-2.5'>
                      <span className='text-[10px] text-gray-500'>propertyflowhq.com/contractor-dashboard</span>
                    </div>
                  </div>
                </div>
                <Image
                  src='/images/dashboard-preview2.png'
                  alt='Property Flow HQ Contractor Dashboard — manage jobs, invoices, leads, team, and inventory'
                  width={1200}
                  height={750}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 70vw, 800px"
                  className='w-full h-auto block'
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────── PAIN POINT GRID — the hook ────────── */}
      <section className='py-16 md:py-24 px-6 bg-white'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-block text-xs font-bold tracking-widest text-orange-600 uppercase'>
              Sound Familiar?
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              You didn&apos;t become a contractor to{' '}
              <span className='bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent'>
                push paper.
              </span>
            </h2>
            <p className='text-slate-600'>
              Here&apos;s what&apos;s actually killing your time — and how we fix it in one platform.
            </p>
          </div>

          <div className='grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {PAIN_POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.pain}
                  className='group relative rounded-2xl bg-linear-to-r from-red-400 via-orange-300 to-amber-500 border border-orange-300 p-6 shadow-xl hover:scale-[1.01] transition-all duration-300'
                >
                  <div className='flex items-start gap-3 mb-3'>
                    <div className='rounded-lg bg-white/40 p-2 border border-white/60 shrink-0 backdrop-blur-sm'>
                      <Icon className='h-5 w-5 text-rose-900' />
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-1.5 text-rose-900 text-[10px] font-bold uppercase tracking-wider mb-1'>
                        <X className='h-3 w-3' /> Pain
                      </div>
                      <h3 className='text-base font-bold text-slate-900 leading-tight'>{p.pain}</h3>
                    </div>
                  </div>
                  <div className='pl-12'>
                    <div className='flex items-center gap-1.5 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1'>
                      <Check className='h-3 w-3' /> Fix
                    </div>
                    <p className='text-sm text-slate-800 font-medium'>{p.solution}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────── COMPARISON TABLE — the kill shot ────────── */}
      <section className='py-16 md:py-24 px-6 bg-gradient-to-b from-white via-orange-50/40 to-white'>
        <div className='max-w-5xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 uppercase tracking-wider'>
              <AlertTriangle className='h-3 w-3' /> The Real Numbers
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Why pay <span className='text-rose-600'>$300+/month</span> when you can pay{' '}
              <span className='bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent'>$99?</span>
            </h2>
            <p className='text-slate-600'>
              Side-by-side. No marketing fluff. Just the receipts.
            </p>
          </div>

          <div className='rounded-2xl border-2 border-orange-200 bg-white shadow-2xl shadow-orange-500/10 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-gradient-to-r from-orange-50 to-rose-50 border-b-2 border-orange-200'>
                    <th className='text-left px-4 py-4 font-bold text-slate-700 text-xs uppercase tracking-wider'>Feature</th>
                    {COMPARISON_COLS.map((col, i) => (
                      <th
                        key={col}
                        className={`px-4 py-4 text-center font-bold text-xs uppercase tracking-wider ${i === 0
                            ? 'bg-gradient-to-b from-rose-500 to-orange-400 text-white relative'
                            : 'text-slate-600'
                          }`}
                      >
                        {i === 0 && (
                          <span className='absolute -top-2.5 left-1/2 -translate-x-1/2 inline-block text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black'>
                            YOU
                          </span>
                        )}
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-orange-100 ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}
                    >
                      <td className='px-4 py-3.5 font-semibold text-slate-800 text-sm'>{row.feature}</td>
                      {row.vals.map((val, j) => {
                        const isUs = j === 0;
                        const isYes = val === 'yes';
                        const isNo = val === 'no';
                        return (
                          <td
                            key={j}
                            className={`px-4 py-3.5 text-center text-sm ${isUs
                                ? 'bg-gradient-to-r from-orange-50 to-rose-50 font-bold text-slate-900'
                                : 'text-slate-600'
                              }`}
                          >
                            {isYes ? (
                              <Check className={`h-5 w-5 mx-auto ${isUs ? 'text-emerald-600' : 'text-emerald-500'}`} strokeWidth={3} />
                            ) : isNo ? (
                              <X className='h-5 w-5 mx-auto text-rose-400' strokeWidth={3} />
                            ) : (
                              <span className={isUs ? 'text-emerald-700 font-black' : 'text-slate-500'}>{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='mt-8 text-center'>
            <Link
              href={ctaUrl}
              className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 text-white font-bold px-7 py-3.5 shadow-xl shadow-rose-500/25 transition-all hover:scale-[1.02]'
            >
              Switch & Save $250+/Month <ArrowRight className='h-5 w-5' />
            </Link>
          </div>
        </div>
      </section>

      {/* ────────── FEATURES — what they actually buy ────────── */}
      <section className='py-16 md:py-24 px-6 bg-white'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-14'>
            <span className='inline-block text-xs font-bold tracking-widest text-orange-600 uppercase'>
              Everything Included
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Your whole business,{' '}
              <span className='bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent'>
                one dashboard.
              </span>
            </h2>
            <p className='text-slate-600'>
              From the first lead to the final payment — every step tracked, automated, and connected.
            </p>
          </div>

          <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3'>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const tierStyle =
                f.tier === 'All' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-slate-50 text-slate-600 border-slate-200';
              return (
                <div
                  key={f.title}
                  className='group relative rounded-2xl bg-gradient-to-br from-white to-orange-50/30 border border-orange-100 p-6 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-0.5 transition-all'
                >
                  <span className={`absolute top-4 right-4 inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierStyle}`}>
                    {f.tier}
                  </span>
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20'>
                    <Icon className='h-6 w-6 text-white' />
                  </div>
                  <h3 className='font-bold text-slate-900 text-lg mb-1.5'>{f.title}</h3>
                  <p className='text-sm text-slate-600 leading-relaxed'>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────── DASHBOARD SHOWCASE ────────── */}
      <section className='py-16 md:py-24 px-6 bg-linear-to-r from-red-400 via-orange-300 to-amber-500 text-slate-900 relative overflow-hidden'>
        <div className='absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-white/20 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-amber-200/30 rounded-full blur-3xl pointer-events-none' />

        <div className='relative max-w-6xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-white/40 backdrop-blur-sm border border-white/60 px-3 py-1 text-xs font-bold text-rose-900 uppercase tracking-wider'>
              <Zap className='h-3 w-3' /> See It In Action
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Built for the truck cab —{' '}
              <span className='bg-gradient-to-r from-rose-700 to-orange-700 bg-clip-text text-transparent'>
                not the back office.
              </span>
            </h2>
            <p className='text-slate-800 font-medium'>
              Quote on-site. Sign from a phone. Photos straight from the field. Payment hits before you load up.
            </p>
          </div>

          <div className='relative rounded-2xl overflow-hidden border border-white/60 shadow-2xl shadow-rose-900/20 bg-white'>
            <div className='flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200/80'>
              <div className='h-2.5 w-2.5 rounded-full bg-[#FF5F57]' />
              <div className='h-2.5 w-2.5 rounded-full bg-[#FFBD2E]' />
              <div className='h-2.5 w-2.5 rounded-full bg-[#28C840]' />
              <div className='flex-1 mx-3'>
                <div className='h-5 rounded-md bg-white border border-gray-200 flex items-center px-2.5'>
                  <span className='text-[10px] text-gray-500'>propertyflowhq.com/contractor-dashboard</span>
                </div>
              </div>
            </div>
            <Image
              src='/images/dashboard-preview2.png'
              alt='Property Flow HQ Contractor Dashboard — full feature view'
              width={1600}
              height={1000}
              sizes="(max-width: 768px) 100vw, 1200px"
              className='w-full h-auto block'
            />
          </div>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-10'>
            {[
              { num: '$0', label: 'Per-lead fees' },
              { num: '5 min', label: 'To get set up' },
              { num: 'Cancel', label: 'Anytime' },
              { num: '24/7', label: 'Mobile access' },
            ].map((s) => (
              <div key={s.label} className='text-center rounded-xl bg-white/40 backdrop-blur-sm border border-white/60 p-5'>
                <div className='text-2xl md:text-3xl font-black bg-gradient-to-r from-rose-700 to-orange-700 bg-clip-text text-transparent'>
                  {s.num}
                </div>
                <div className='text-xs text-slate-800 font-bold uppercase tracking-wider mt-1'>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── HOW IT WORKS ────────── */}
      <section className='py-16 md:py-24 px-6 bg-white'>
        <div className='max-w-5xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-14'>
            <span className='inline-block text-xs font-bold tracking-widest text-orange-600 uppercase'>
              How It Works
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Live in 5 minutes.{' '}
              <span className='bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent'>
                On the job today.
              </span>
            </h2>
          </div>

          <div className='grid gap-6 md:grid-cols-3'>
            {STEPS.map((s) => (
              <div
                key={s.n}
                className='relative rounded-2xl bg-gradient-to-br from-white to-orange-50 border border-orange-200 p-7 hover:shadow-xl hover:shadow-orange-500/10 transition-all'
              >
                <div className='text-5xl font-black bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent leading-none mb-3'>
                  {s.n}
                </div>
                <h3 className='text-lg font-bold text-slate-900 mb-2'>{s.title}</h3>
                <p className='text-sm text-slate-600 leading-relaxed'>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── TESTIMONIALS / SOCIAL PROOF ──────────
          Hidden until we have real customer testimonials we're allowed
          to publish. Restore once we have explicit consent + signed
          quotes from active customers. */}
      {/* <section className='py-16 md:py-24 px-6 bg-gradient-to-b from-white via-orange-50/40 to-white'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-block text-xs font-bold tracking-widest text-orange-600 uppercase'>
              Real Contractors. Real Results.
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Built by people who&apos;ve{' '}
              <span className='bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent'>
                been on the truck.
              </span>
            </h2>
          </div>

          <div className='grid gap-5 md:grid-cols-3'>
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className='rounded-2xl bg-white border border-orange-200 p-6 shadow-lg shadow-orange-500/5 hover:shadow-xl hover:shadow-orange-500/10 transition-all'
              >
                <Quote className='h-7 w-7 text-orange-300 mb-3' />
                <div className='flex items-center gap-0.5 mb-3'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className='h-4 w-4 fill-amber-400 text-amber-400' />
                  ))}
                </div>
                <p className='text-slate-700 text-sm leading-relaxed mb-5'>&ldquo;{t.quote}&rdquo;</p>
                <div className='border-t border-orange-100 pt-4 flex items-center justify-between'>
                  <div>
                    <div className='font-bold text-slate-900 text-sm'>{t.name}</div>
                    <div className='text-xs text-slate-500'>{t.role} · {t.location}</div>
                  </div>
                  <div className='inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider'>
                    <TrendingUp className='h-3 w-3' /> {t.metric}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* ────────── PRICING — Single plan value showcase ────────── */}
      <section
        id='pricing'
        className='py-16 md:py-24 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden'
      >
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none' />
        <div className='relative max-w-6xl mx-auto'>
          {/* Header */}
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-14'>
            <span className='inline-block text-xs font-bold tracking-widest text-orange-400 uppercase'>
              Simple Pricing
            </span>
            <h2 className='text-3xl md:text-5xl font-bold text-white'>
              One plan. Everything unlimited.
            </h2>
            <p className='text-slate-400 font-medium'>
              No tiers to compare. No features locked behind upgrades. No credit card to start.
            </p>
          </div>

          {/* Two-column: Price left, Features right */}
          <div className='grid md:grid-cols-5 gap-8 lg:gap-12 items-start max-w-5xl mx-auto'>
            {/* Left — Price card (spans 2 cols) */}
            <div className='md:col-span-2 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 p-8 backdrop-blur-sm'>
              <div className='flex items-center gap-2 mb-6'>
                <div className='rounded-lg bg-orange-500/20 p-2'>
                  <Zap className='h-5 w-5 text-orange-400' />
                </div>
                <span className='text-lg font-bold text-white'>Unlimited Plan</span>
              </div>

              <div className='flex items-baseline gap-1 mb-2'>
                <span className='text-5xl font-black bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent'>$99</span>
                <span className='text-slate-400 text-sm font-medium'>/month</span>
              </div>
              <p className='text-sm text-slate-400 mb-8'>14-day free trial. No credit card required.</p>

              <Link
                href={ctaUrl}
                className='w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-400 hover:to-orange-300 text-white font-bold px-5 py-3.5 text-sm shadow-lg shadow-rose-500/30 transition-all hover:scale-[1.02]'
              >
                Start Free Trial <ArrowRight className='h-4 w-4' />
              </Link>

              <div className='mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-3'>
                {[
                  { icon: '🔒', text: 'Bank-level security' },
                  { icon: '⚡', text: 'Stripe payments' },
                  { icon: '✓', text: 'Cancel anytime' },
                  { icon: '🎯', text: 'No contracts' },
                ].map((badge) => (
                  <div key={badge.text} className='flex items-center gap-2 text-xs text-slate-400'>
                    <span>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Feature categories (spans 3 cols) */}
            <div className='md:col-span-3 grid sm:grid-cols-2 gap-6'>
              {[
                {
                  title: 'Jobs & Invoicing',
                  features: ['Unlimited jobs & work orders', 'Invoicing & estimates', 'E-sign contracts', 'Online payments (Stripe)', 'Auto payment reminders', 'Recurring invoices'],
                },
                {
                  title: 'Team & Scheduling',
                  features: ['Unlimited team members', 'Scheduling & dispatch', 'GPS time tracking', 'Timesheet approvals', 'Payroll & direct deposit', 'Team chat'],
                },
                {
                  title: 'Clients & Growth',
                  features: ['CRM & customer portal', 'Lead pipeline', 'Marketplace listing', 'Branded subdomain', 'Marketing & referrals', 'Review management'],
                },
                {
                  title: 'Operations',
                  features: ['Inventory tracking', 'Equipment management', 'Subcontractor payments', 'QuickBooks sync', 'Reporting & analytics', 'API & integrations'],
                },
              ].map((group) => (
                <div key={group.title} className='space-y-3'>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-orange-400'>{group.title}</h4>
                  <ul className='space-y-2'>
                    {group.features.map((f) => (
                      <li key={f} className='flex items-start gap-2 text-sm text-slate-300'>
                        <CheckCircle2 className='h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5' />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor comparison */}
          <div className='mt-16 max-w-4xl mx-auto'>
            <h3 className='text-center text-xl md:text-2xl font-bold text-white mb-8'>
              Why contractors switch from Angi, Thumbtack & Jobber
            </h3>
            <div className='overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-white/10'>
                    <th className='text-left py-3.5 px-4 text-slate-400 font-medium'>Feature</th>
                    <th className='text-center py-3.5 px-3 text-orange-400 font-bold'>PropertyFlow</th>
                    <th className='text-center py-3.5 px-3 text-slate-500 font-medium'>Angi</th>
                    <th className='text-center py-3.5 px-3 text-slate-500 font-medium'>Thumbtack</th>
                    <th className='text-center py-3.5 px-3 text-slate-500 font-medium'>Jobber</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-white/[0.02]'}>
                      <td className='py-3 px-4 text-slate-300 font-medium'>{row.feature}</td>
                      {row.vals.map((val, j) => (
                        <td key={j} className='py-3 px-3 text-center'>
                          {val === 'yes' ? (
                            <CheckCircle2 className={`h-4 w-4 mx-auto ${j === 0 ? 'text-orange-400' : 'text-emerald-400'}`} />
                          ) : val === 'no' ? (
                            <X className='h-4 w-4 mx-auto text-slate-600' />
                          ) : (
                            <span className={`text-xs font-bold ${j === 0 ? 'text-orange-400' : 'text-slate-400'}`}>{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ────────── FAQ ────────── */}
      <section className='py-16 md:py-24 px-6 bg-white'>
        <div className='max-w-3xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-block text-xs font-bold tracking-widest text-orange-600 uppercase'>
              Got Questions?
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Frequently asked,{' '}
              <span className='bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent'>
                straight answers.
              </span>
            </h2>
          </div>

          <div className='space-y-3'>
            {FAQS.map((f) => (
              <details
                key={f.q}
                className='group rounded-xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/30 p-5 hover:border-orange-300 transition-all'
              >
                <summary className='cursor-pointer font-bold text-slate-900 flex items-center justify-between gap-4 list-none'>
                  <span>{f.q}</span>
                  <span className='shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-white text-lg font-black group-open:rotate-45 transition-transform'>
                    +
                  </span>
                </summary>
                <p className='mt-3 text-sm text-slate-600 leading-relaxed'>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── FINAL CTA ────────── */}
      <section className='py-16 md:py-20 px-6 bg-gradient-to-br from-rose-500 to-orange-400 text-white relative overflow-hidden'>
        <div className='absolute inset-0 opacity-10 pointer-events-none' style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className='relative max-w-3xl mx-auto text-center space-y-6'>
          <h2 className='text-3xl md:text-4xl font-black'>
            Ready to run your business like a pro?
          </h2>
          <p className='text-white/90 text-lg max-w-xl mx-auto'>
            Join the contractors booking more jobs and getting paid faster. $99/mo unlimited. 14-day free trial, no credit card.
          </p>
          <Link
            href={ctaUrl}
            className='inline-flex items-center justify-center gap-2 rounded-full bg-white text-rose-600 hover:bg-orange-50 font-black text-lg px-10 py-5 shadow-2xl transition-all hover:scale-[1.02]'
          >
            Get Started <ArrowRight className='h-5 w-5' />
          </Link>
          <p className='text-sm text-white/80 pt-1'>
            14-day free trial · Cancel anytime
          </p>
          <p className='text-xs text-white/60 pt-2'>
            Questions? Email{' '}
            <a href='mailto:support@propertyflowhq.com' className='underline hover:text-white'>
              support@propertyflowhq.com
            </a>
          </p>
        </div>
      </section>

      {/* ────────── FOOTER ────────── */}
      <footer className='py-8 px-6 border-t border-slate-100 bg-slate-50'>
        <div className='max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500'>
          <div>© {new Date().getFullYear()} Property Flow HQ. All rights reserved.</div>
          <div className='flex items-center gap-5'>
            <Link href='/privacy' className='hover:text-slate-900'>Privacy</Link>
            <Link href='/terms' className='hover:text-slate-900'>Terms</Link>
            <Link href='/' className='hover:text-slate-900'>Home</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
