import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import MetaViewContent from '@/components/analytics/meta-view-content';
import {
  CheckCircle2,
  Shield,
  FileSignature,
  Building2,
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
  DollarSign,
  AlertTriangle,
  Smartphone,
  CreditCard,
  Receipt,
  FolderOpen,
  Wrench,
  Quote,
  UserPlus,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Property Management Software — Run Your Whole Portfolio From $39/mo — Property Flow HQ',
  description:
    'Stop paying Buildium $55+/mo plus per-unit fees and ACH charges. Pro plans at $99/mo include unlimited leases, e-signatures, maintenance tickets, white-label tenant portal, and free contractor network. Solo plans from $39. No setup fees. Cancel anytime.',
  alternates: { canonical: 'https://www.propertyflowhq.com/start' },
  openGraph: {
    title: 'Property Management That Doesn\'t Charge You to Collect Rent — Pro $99/mo, Solo from $39',
    description:
      'Unlimited leases, e-signatures, maintenance tickets, automated rent collection, and a white-label tenant portal. No setup fees. Cancel anytime.',
    url: 'https://www.propertyflowhq.com/start',
  },
  robots: { index: false, follow: true },
};

// ── Comparison data (Pro tier vs competitors — honest like-for-like) ──
const COMPARISON_ROWS: { feature: string; vals: [string, string, string, string] }[] = [
  { feature: 'Monthly price (full-feature)', vals: ['$99', '$55+', '$1.40/unit', '$20+'] },
  { feature: 'Per-unit fees', vals: ['$0', '$1.50+', '$1.40/unit', '$0'] },
  { feature: 'ACH rent collection fee', vals: ['$0', '$0.95+', '$2.49', '$2.49'] },
  { feature: 'Unlimited leases + e-sign', vals: ['yes', '$2/sign', 'yes', 'Pro+'] },
  { feature: 'Unlimited applications', vals: ['yes', 'yes', 'yes', '$55'] },
  { feature: 'Maintenance ticket system', vals: ['yes', 'yes', 'yes', 'Pro+'] },
  { feature: 'White-label tenant portal', vals: ['yes', 'Premium', 'yes', 'no'] },
  { feature: 'Free contractor network', vals: ['yes', 'no', 'no', 'no'] },
  { feature: 'Automated late fees', vals: ['yes', 'yes', 'yes', 'Pro+'] },
  { feature: 'Setup time', vals: ['5 min', 'days', 'weeks', '15 min'] },
];
const COMPARISON_COLS = ['Property Flow HQ', 'Buildium', 'AppFolio', 'TurboTenant'];

// ── Pain points → solutions (top of funnel hook) ──────────────────
const PAIN_POINTS = [
  {
    icon: Receipt,
    pain: 'Chasing rent on the 5th every month',
    solution: 'Auto-reminders. Tenants pay direct. Late fees apply themselves.',
  },
  {
    icon: DollarSign,
    pain: 'Buildium charging $2.49 every time rent comes in',
    solution: 'Tenants pay straight to your bank. 0% ACH fees. Forever.',
  },
  {
    icon: Wrench,
    pain: 'Maintenance requests buried in your texts',
    solution: 'One ticket inbox. Photos, status, contractor assignment in one place.',
  },
  {
    icon: FolderOpen,
    pain: 'Lease renewals slipping past expiration',
    solution: 'Auto-reminders 60 days out. Renew + e-sign in two clicks.',
  },
  {
    icon: FileSignature,
    pain: 'Tenants ghosting after they tour',
    solution: 'Online applications + screening before they walk through the door.',
  },
  {
    icon: TrendingUp,
    pain: 'No idea which units actually make money',
    solution: 'Live P&L per property. Know your real cash flow at a glance.',
  },
];

// ── Features (what they actually get) ─────────────────────────────
// tier marks where each feature unlocks — keeps the page honest.
const FEATURES = [
  { icon: Banknote, tier: 'Starter', title: 'Rent Collection, 0% Fees', desc: 'Tenants pay straight to your bank. Auto-receipts. Auto-reminders. Auto late fees on the 6th.' },
  { icon: FileSignature, tier: 'Starter', title: 'Unlimited Leases + E-Sign', desc: 'Free lease builder, your terms, your branding. E-sign included on every doc — no per-document fees.' },
  { icon: UserPlus, tier: 'Starter', title: 'Unlimited Applications', desc: 'Tenants apply online. Background + credit + eviction screening. Approve in one click.' },
  { icon: Wrench, tier: 'Starter', title: 'Maintenance Tickets', desc: 'Tenants submit from the portal with photos. Assign to your contractor, track to closed.' },
  { icon: Globe, tier: 'Starter', title: 'White-Label Tenant Portal', desc: 'yourname.propertyflowhq.com — your logo, your colors, your listings, your rent payments.' },
  { icon: Building2, tier: 'Pro', title: 'Multi-Property Dashboard', desc: 'Up to 50 properties on Pro. Per-property P&L, vacancy tracking, portfolio-wide reports.' },
  { icon: CalendarClock, tier: 'Pro', title: 'Showings + Open Houses', desc: 'Self-scheduled tours, open-house RSVPs, auto-reminders. Fill vacancies in days, not weeks.' },
  { icon: ClipboardList, tier: 'Pro', title: 'Contractor Network', desc: 'Browse vetted contractors right from a maintenance ticket. They quote, you approve, work begins.' },
  { icon: Smartphone, tier: 'All plans', title: 'Mobile-First', desc: 'Works on any phone — yours and your tenants\'. No app to install, no learning curve.' },
];

const STEPS = [
  { n: '01', title: 'Sign up free', desc: 'Email + password. No card. 60 seconds to your dashboard.' },
  { n: '02', title: 'Add properties + tenants', desc: 'Import an existing rent roll or add units one by one. Invite tenants by email.' },
  { n: '03', title: 'Go on autopilot', desc: 'Rent collects itself, late fees apply themselves, maintenance routes itself.' },
];

const TESTIMONIALS = [
  {
    quote: "I switched from Buildium and immediately stopped paying $130/mo in per-unit charges and ACH fees. Same features, half the price.",
    name: 'Sarah M.',
    role: 'Independent Landlord, 12 units',
    location: 'Austin, TX',
    metric: '$130/mo saved',
  },
  {
    quote: "Auto late-fees alone pay for the subscription. I used to forget to charge them. Now they apply themselves on the 6th.",
    name: 'Robert P.',
    role: 'Self-Managing Landlord',
    location: 'Columbus, OH',
    metric: 'Late fees on autopilot',
  },
  {
    quote: "Tenant portal looks like my own brand. Tenants don't know it's a third-party tool — they just see professional. Renewal rate jumped.",
    name: 'Maya K.',
    role: 'Property Manager, 28 units',
    location: 'Charlotte, NC',
    metric: 'Renewal rate up 18%',
  },
];

const FAQS = [
  {
    q: 'What\'s the difference between Starter, Pro, and Enterprise?',
    a: 'Starter ($39/mo) is for solo landlords with up to 10 units — unlimited leases, applications, e-signatures, maintenance tickets, and your branded tenant portal. Pro ($99/mo) adds up to 50 properties, multi-property dashboard, showings + open houses, and the contractor network — most landlords with multiple buildings start here. Enterprise ($199/mo) is for property management companies with unlimited units, team members, white-label, and API access.',
  },
  {
    q: 'Are there really no per-unit fees?',
    a: 'Correct. Flat monthly subscription — no per-unit, per-lease, per-application, or per-document fees. Buildium charges $1.50+/unit on top of their base. AppFolio bills $1.40/unit with a $280/month minimum. We charge one flat price. Period.',
  },
  {
    q: 'How is this different from Buildium or AppFolio?',
    a: 'Same core features (rent collection, leases, maintenance, accounting, tenant portal) at a fraction of the price — Pro is $99/mo flat vs Buildium\'s $55+/mo plus per-unit fees plus per-ACH-transaction fees. Buildium and AppFolio also charge tenants ACH fees on rent payments — we don\'t. Tenants pay rent direct to your bank with zero ACH cost.',
  },
  {
    q: 'Do tenants pay fees to use the portal?',
    a: 'No ACH fees on rent. Card payments still carry the standard processor charge (which tenants can choose to absorb), but ACH/bank-pay is free for them and free for you. Buildium and AppFolio both charge $0.95-$2.49 per ACH transaction — that\'s the fee we eliminated.',
  },
  {
    q: 'Can I import my existing tenants and leases?',
    a: 'Yes. Bulk-import via CSV during onboarding, or add tenants one by one and we\'ll email them an invite to set up their portal. Existing leases can be uploaded as PDFs or rebuilt with our free lease builder for full e-sign compatibility.',
  },
  {
    q: 'How does cancellation work?',
    a: 'You can cancel any time from your dashboard. We don\'t do auto-renew traps — you control your subscription, and your account simply pauses if you cancel. No long-term contract, no early-termination fees.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes, anytime. Start on Starter, upgrade to Pro when you cross 10 units, drop back down if you sell properties. Prorated automatically.',
  },
];

export default async function PMLandingPage() {
  const session = await auth();

  // If already signed in, skip the sign-up form and go to plan selection.
  // Otherwise, sign-up with role + plan + skipOnboarding pre-set so the form
  // forwards directly to /onboarding/landlord/subscription on success.
  const ctaUrl = session?.user
    ? '/onboarding/landlord/subscription?plan=starter&skipOnboarding=true'
    : '/sign-up?role=landlord&plan=starter&interval=monthly&skipOnboarding=true';

  return (
    <main className='min-h-screen bg-white text-slate-900 antialiased'>
      <MetaViewContent
        contentName='pm_landing_start'
        contentCategory='landlord'
        value={39}
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
            className='inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white text-sm font-bold px-4 py-2 shadow-lg shadow-violet-500/20 transition-all'
          >
            Get Started <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </header>

      {/* ────────── HERO ────────── */}
      <section className='relative overflow-hidden bg-white'>
        {/* cool glow background */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute -top-20 right-0 w-[90%] h-[90%] bg-gradient-to-bl from-violet-50/60 via-cyan-50/40 to-transparent rounded-bl-[120px]' />
          <div className='absolute top-10 right-10 w-[500px] h-[500px] bg-violet-100/30 rounded-full blur-[100px]' />
          <div className='absolute top-40 right-40 w-80 h-80 bg-cyan-100/25 rounded-full blur-[80px]' />
        </div>

        <div className='relative max-w-6xl mx-auto px-6 pt-12 pb-16 md:pt-20 md:pb-24'>
          <div className='grid md:grid-cols-2 gap-10 items-center'>
            {/* Left — copy */}
            <div className='space-y-6 text-center md:text-left'>
              <span className='inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 uppercase tracking-wider'>
                <Sparkles className='h-3.5 w-3.5' /> Built for Small Landlords
              </span>

              <h1 className='text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]'>
                <span className='block bg-gradient-to-r from-violet-700 to-violet-500 bg-clip-text text-transparent'>Run Your</span>
                <span className='block bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent'>Whole Portfolio.</span>
                <span className='block bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent'>From $39/Mo.</span>
              </h1>

              <p className='text-base md:text-lg text-slate-600 leading-relaxed max-w-lg mx-auto md:mx-0'>
                Unlimited leases, e-signatures, automated rent collection, maintenance tickets, and your own white-label tenant portal. Solo plans start at <span className='font-semibold text-slate-900'>$39/mo</span>, full multi-property tools on <span className='font-semibold text-slate-900'>Pro at $99/mo</span> — still less than Buildium.
              </p>

              <div className='flex flex-col sm:flex-row gap-3 justify-center md:justify-start items-center pt-1'>
                <Link
                  href={ctaUrl}
                  className='group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold text-base px-7 py-4 shadow-xl shadow-violet-500/25 transition-all hover:scale-[1.02] w-full sm:w-auto'
                >
                  Start 14-day free trial
                  <ArrowRight className='h-5 w-5 group-hover:translate-x-0.5 transition-transform' />
                </Link>
              </div>

              <p className='text-xs text-slate-500 flex items-center justify-center md:justify-start gap-2'>
                <Shield className='h-3.5 w-3.5 text-emerald-500' />
                No charge until day 15 · Setup in 5 minutes · Cancel anytime
              </p>

              {/* Star strip — hidden until we have real public ratings.
                  Restore once we have a meaningful review count to back it. */}
              {/* <div className='flex items-center gap-3 justify-center md:justify-start pt-2'>
                <div className='flex items-center gap-0.5'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className='h-4 w-4 fill-amber-400 text-amber-400' />
                  ))}
                </div>
                <span className='text-sm text-slate-600'>Loved by indie landlords nationwide</span>
              </div> */}
            </div>

            {/* Right — dashboard preview */}
            <div className='relative'>
              <div className='absolute -inset-6 z-0 pointer-events-none'>
                <div className='absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-violet-200/30 rounded-full blur-[80px]' />
                <div className='absolute bottom-1/4 right-1/5 w-[300px] h-[300px] bg-cyan-200/30 rounded-full blur-[70px]' />
              </div>
              <div className='relative z-10 rounded-xl md:rounded-2xl border border-slate-300/80 shadow-2xl shadow-violet-500/20 overflow-hidden bg-white ring-1 ring-violet-200/30'>
                <div className='flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200/80'>
                  <div className='h-2.5 w-2.5 rounded-full bg-[#FF5F57]' />
                  <div className='h-2.5 w-2.5 rounded-full bg-[#FFBD2E]' />
                  <div className='h-2.5 w-2.5 rounded-full bg-[#28C840]' />
                  <div className='flex-1 mx-3'>
                    <div className='h-5 rounded-md bg-white border border-gray-200 flex items-center px-2.5'>
                      <span className='text-[10px] text-gray-500'>propertyflowhq.com/admin/overview</span>
                    </div>
                  </div>
                </div>
                <Image
                  src='/images/dashboard-preview.png'
                  alt='Property Flow HQ Landlord Dashboard — manage properties, leases, applications, maintenance, and rent collection'
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
            <span className='inline-block text-xs font-bold tracking-widest text-cyan-600 uppercase'>
              Sound Familiar?
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              You didn&apos;t buy rentals to{' '}
              <span className='bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent'>
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
                  className='group relative rounded-2xl bg-linear-to-r from-violet-500 via-blue-400 to-cyan-400 border border-violet-300 p-6 shadow-xl hover:scale-[1.01] transition-all duration-300'
                >
                  <div className='flex items-start gap-3 mb-3'>
                    <div className='rounded-lg bg-white/40 p-2 border border-white/60 shrink-0 backdrop-blur-sm'>
                      <Icon className='h-5 w-5 text-indigo-900' />
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-1.5 text-indigo-900 text-[10px] font-bold uppercase tracking-wider mb-1'>
                        <X className='h-3 w-3' /> Pain
                      </div>
                      <h3 className='text-base font-bold text-white leading-tight'>{p.pain}</h3>
                    </div>
                  </div>
                  <div className='pl-12'>
                    <div className='flex items-center gap-1.5 text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1'>
                      <Check className='h-3 w-3' /> Fix
                    </div>
                    <p className='text-sm text-white font-medium'>{p.solution}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────── COMPARISON TABLE — the kill shot ────────── */}
      <section className='py-16 md:py-24 px-6 bg-gradient-to-b from-white via-violet-50/40 to-white'>
        <div className='max-w-5xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 uppercase tracking-wider'>
              <AlertTriangle className='h-3 w-3' /> The Real Numbers
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Why pay <span className='text-violet-600'>$130+/month</span> when you can pay{' '}
              <span className='bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent'>$99?</span>
            </h2>
            <p className='text-slate-600'>
              Side-by-side. No marketing fluff. Just the receipts.
            </p>
          </div>

          <div className='rounded-2xl border-2 border-violet-200 bg-white shadow-2xl shadow-violet-500/10 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-gradient-to-r from-violet-50 to-cyan-50 border-b-2 border-violet-200'>
                    <th className='text-left px-4 py-4 font-bold text-slate-700 text-xs uppercase tracking-wider'>Feature</th>
                    {COMPARISON_COLS.map((col, i) => (
                      <th
                        key={col}
                        className={`px-4 py-4 text-center font-bold text-xs uppercase tracking-wider ${i === 0
                            ? 'bg-gradient-to-b from-violet-600 to-cyan-500 text-white'
                            : 'text-slate-600'
                          }`}
                      >
                        {/* "YOU" badge sits inside the cell so the outer
                            overflow-hidden wrapper doesn't clip it. */}
                        {i === 0 && (
                          <div className='flex flex-col items-center gap-1.5'>
                            <span className='inline-block text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black shadow'>
                              YOU
                            </span>
                            <span>{col}</span>
                          </div>
                        )}
                        {i !== 0 && col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-violet-100 ${i % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}`}
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
                                ? 'bg-gradient-to-r from-violet-50 to-cyan-50 font-bold text-slate-900'
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
              className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold px-7 py-3.5 shadow-xl shadow-violet-500/25 transition-all hover:scale-[1.02]'
            >
              Switch &amp; Save $90+/Month <ArrowRight className='h-5 w-5' />
            </Link>
          </div>
        </div>
      </section>

      {/* ────────── FEATURES — what they actually buy ────────── */}
      <section className='py-16 md:py-24 px-6 bg-white'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-14'>
            <span className='inline-block text-xs font-bold tracking-widest text-cyan-600 uppercase'>
              Everything Included
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Your whole portfolio,{' '}
              <span className='bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent'>
                one dashboard.
              </span>
            </h2>
            <p className='text-slate-600'>
              From the listing to the lease renewal — every step tracked, automated, and connected.
            </p>
          </div>

          <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3'>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const tierStyle =
                f.tier === 'Starter' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  f.tier === 'Pro' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                    'bg-slate-50 text-slate-600 border-slate-200';
              return (
                <div
                  key={f.title}
                  className='group relative rounded-2xl bg-gradient-to-br from-white to-violet-50/30 border border-violet-100 p-6 hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all'
                >
                  <span className={`absolute top-4 right-4 inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierStyle}`}>
                    {f.tier}
                  </span>
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20'>
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
      <section className='py-16 md:py-24 px-6 bg-linear-to-r from-violet-600 via-blue-500 to-cyan-400 text-white relative overflow-hidden'>
        <div className='absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-white/20 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-200/30 rounded-full blur-3xl pointer-events-none' />

        <div className='relative max-w-6xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-white/40 backdrop-blur-sm border border-white/60 px-3 py-1 text-xs font-bold text-indigo-900 uppercase tracking-wider'>
              <Zap className='h-3 w-3' /> See It In Action
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-white'>
              Built for the morning coffee —{' '}
              <span className='bg-gradient-to-r from-indigo-100 to-cyan-100 bg-clip-text text-transparent'>
                not the back office.
              </span>
            </h2>
            <p className='text-white/90 font-medium'>
              Open the laptop. Rent collected. Tickets routed. Lease signed. Most days, there&apos;s nothing to do.
            </p>
          </div>

          <div className='relative rounded-2xl overflow-hidden border border-white/60 shadow-2xl shadow-indigo-900/20 bg-white'>
            <div className='flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200/80'>
              <div className='h-2.5 w-2.5 rounded-full bg-[#FF5F57]' />
              <div className='h-2.5 w-2.5 rounded-full bg-[#FFBD2E]' />
              <div className='h-2.5 w-2.5 rounded-full bg-[#28C840]' />
              <div className='flex-1 mx-3'>
                <div className='h-5 rounded-md bg-white border border-gray-200 flex items-center px-2.5'>
                  <span className='text-[10px] text-gray-500'>propertyflowhq.com/admin/overview</span>
                </div>
              </div>
            </div>
            <Image
              src='/images/dashboard-preview.png'
              alt='Property Flow HQ Landlord Dashboard — full feature view'
              width={1600}
              height={1000}
              sizes="(max-width: 768px) 100vw, 1200px"
              className='w-full h-auto block'
            />
          </div>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-10'>
            {[
              { num: '$0', label: 'Per-unit fees' },
              { num: '5 min', label: 'To get set up' },
              { num: 'Cancel', label: 'Anytime' },
              { num: '24/7', label: 'Mobile access' },
            ].map((s) => (
              <div key={s.label} className='text-center rounded-xl bg-white/40 backdrop-blur-sm border border-white/60 p-5'>
                <div className='text-2xl md:text-3xl font-black text-white'>
                  {s.num}
                </div>
                <div className='text-xs text-white/90 font-bold uppercase tracking-wider mt-1'>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── HOW IT WORKS ────────── */}
      <section className='py-16 md:py-24 px-6 bg-white'>
        <div className='max-w-5xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-14'>
            <span className='inline-block text-xs font-bold tracking-widest text-cyan-600 uppercase'>
              How It Works
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Live in 5 minutes.{' '}
              <span className='bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent'>
                Collecting rent today.
              </span>
            </h2>
          </div>

          <div className='grid gap-6 md:grid-cols-3'>
            {STEPS.map((s) => (
              <div
                key={s.n}
                className='relative rounded-2xl bg-gradient-to-br from-white to-violet-50 border border-violet-200 p-7 hover:shadow-xl hover:shadow-violet-500/10 transition-all'
              >
                <div className='text-5xl font-black bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent leading-none mb-3'>
                  {s.n}
                </div>
                <h3 className='text-lg font-bold text-slate-900 mb-2'>{s.title}</h3>
                <p className='text-sm text-slate-600 leading-relaxed'>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── TESTIMONIALS / SOCIAL PROOF ────────── */}
      {/* <section className='py-16 md:py-24 px-6 bg-gradient-to-b from-white via-violet-50/40 to-white'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-block text-xs font-bold tracking-widest text-cyan-600 uppercase'>
              Real Landlords. Real Results.
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Built by people who&apos;ve{' '}
              <span className='bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent'>
                managed their own units.
              </span>
            </h2>
          </div>

          <div className='grid gap-5 md:grid-cols-3'>
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className='rounded-2xl bg-white border border-violet-200 p-6 shadow-lg shadow-violet-500/5 hover:shadow-xl hover:shadow-violet-500/10 transition-all'
              >
                <Quote className='h-7 w-7 text-violet-300 mb-3' />
                <div className='flex items-center gap-0.5 mb-3'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className='h-4 w-4 fill-amber-400 text-amber-400' />
                  ))}
                </div>
                <p className='text-slate-700 text-sm leading-relaxed mb-5'>&ldquo;{t.quote}&rdquo;</p>
                <div className='border-t border-violet-100 pt-4 flex items-center justify-between'>
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

      {/* ────────── PRICING ANCHOR — 3 tiers, honest ────────── */}
      <section
        id='pricing'
        className='py-16 md:py-24 px-6 bg-linear-to-r from-violet-600 via-blue-500 to-cyan-400 text-white relative overflow-hidden'
      >
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-white/20 rounded-full blur-3xl pointer-events-none' />
        <div className='relative max-w-6xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-block text-xs font-bold tracking-widest text-indigo-900 uppercase'>
              Simple Pricing
            </span>
            <h2 className='text-3xl md:text-5xl font-bold text-white'>
              Pick your plan.{' '}
              <span className='bg-gradient-to-r from-indigo-100 to-cyan-100 bg-clip-text text-transparent'>
                No setup fees. Cancel anytime.
              </span>
            </h2>
            <p className='text-white/90 font-medium'>
              No per-unit fees. No contracts. Cancel from your dashboard anytime.
            </p>
          </div>

          <div className='grid gap-5 md:grid-cols-3 max-w-5xl mx-auto'>
            {/* Starter */}
            <div className='rounded-2xl bg-white/70 backdrop-blur-sm border border-white/80 p-7 flex flex-col shadow-xl'>
              <div className='space-y-1 mb-5'>
                <h3 className='text-xl font-bold text-slate-900'>Starter</h3>
                <p className='text-xs text-violet-700 uppercase tracking-wider font-semibold'>Solo landlord</p>
              </div>
              <div className='flex items-baseline gap-1 mb-1'>
                <span className='text-5xl font-black text-slate-900'>$39</span>
                <span className='text-slate-600 text-sm'>/mo</span>
              </div>
              <p className='text-xs text-slate-600 mb-5'>Up to 10 units</p>

              <ul className='space-y-2 text-sm flex-1'>
                {[
                  'Rent collection with 0% ACH fees',
                  'Unlimited leases with e-signatures',
                  'Unlimited rental applications',
                  'Maintenance ticket system',
                  'White-label tenant portal',
                  'Automated late fees + reminders',
                  'Mobile-first — works on any phone',
                ].map((item) => (
                  <li key={item} className='flex items-start gap-2 text-slate-700'>
                    <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={ctaUrl}
                className='mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 text-sm transition-all'
              >
                Get Started <ArrowRight className='h-4 w-4' />
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div className='relative rounded-2xl bg-white border-2 border-violet-500 p-7 flex flex-col shadow-2xl shadow-violet-500/30 md:scale-105'>
              <span className='absolute -top-3 left-1/2 -translate-x-1/2 inline-block bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg'>
                Most Popular
              </span>
              <div className='space-y-1 mb-5'>
                <h3 className='text-xl font-bold text-slate-900'>Pro</h3>
                <p className='text-xs text-violet-700 uppercase tracking-wider font-semibold'>Up to 50 properties</p>
              </div>
              <div className='flex items-baseline gap-1 mb-1'>
                <span className='text-5xl font-black bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent'>$99</span>
                <span className='text-slate-600 text-sm'>/mo</span>
              </div>
              <p className='text-xs text-slate-600 mb-5'>Built for growing portfolios</p>

              <ul className='space-y-2 text-sm flex-1'>
                {[
                  { label: 'Everything in Starter', strong: true },
                  { label: 'Up to 50 properties' },
                  { label: 'Multi-property dashboard' },
                  { label: 'Showings + open houses' },
                  { label: 'Self-scheduled tours' },
                  { label: 'Free contractor network access' },
                  { label: 'Per-property P&L reports' },
                  { label: 'Vacancy + turnover tracking' },
                  { label: 'Priority support' },
                ].map((item) => (
                  <li key={item.label} className={`flex items-start gap-2 ${item.strong ? 'text-violet-700 font-bold' : 'text-slate-700'}`}>
                    <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={session?.user
                  ? '/onboarding/landlord/subscription?plan=pro&skipOnboarding=true'
                  : '/sign-up?role=landlord&plan=pro&interval=monthly&skipOnboarding=true'}
                className='mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold px-5 py-3 text-sm shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02]'
              >
                Start Pro Free <ArrowRight className='h-4 w-4' />
              </Link>
            </div>

            {/* Enterprise */}
            <div className='rounded-2xl bg-white/70 backdrop-blur-sm border border-white/80 p-7 flex flex-col shadow-xl'>
              <div className='space-y-1 mb-5'>
                <h3 className='text-xl font-bold text-slate-900'>Enterprise</h3>
                <p className='text-xs text-violet-700 uppercase tracking-wider font-semibold'>Unlimited units</p>
              </div>
              <div className='flex items-baseline gap-1 mb-1'>
                <span className='text-5xl font-black text-slate-900'>$199</span>
                <span className='text-slate-600 text-sm'>/mo</span>
              </div>
              <p className='text-xs text-slate-600 mb-5'>Property management companies</p>

              <ul className='space-y-2 text-sm flex-1'>
                {[
                  { label: 'Everything in Pro', strong: true },
                  { label: 'Unlimited properties + units' },
                  { label: 'Unlimited team members' },
                  { label: 'Multi-property roles & permissions' },
                  { label: 'White-label landlord branding' },
                  { label: 'API & 3rd-party integrations' },
                  { label: 'Webhooks for accounting sync' },
                  { label: 'Dedicated account manager' },
                  { label: '24/7 priority support' },
                ].map((item) => (
                  <li key={item.label} className={`flex items-start gap-2 ${item.strong ? 'text-violet-700 font-bold' : 'text-slate-700'}`}>
                    <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={session?.user
                  ? '/onboarding/landlord/subscription?plan=enterprise&skipOnboarding=true'
                  : '/sign-up?role=landlord&plan=enterprise&interval=monthly&skipOnboarding=true'}
                className='mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 text-sm transition-all'
              >
                Start Enterprise <ArrowRight className='h-4 w-4' />
              </Link>
            </div>
          </div>

          <p className='text-center text-sm text-white/90 font-medium mt-8 flex items-center justify-center gap-2'>
            <CreditCard className='h-3.5 w-3.5' />
            14-day free trial
          </p>
        </div>
      </section>

      {/* ────────── FAQ ────────── */}
      <section className='py-16 md:py-24 px-6 bg-white'>
        <div className='max-w-3xl mx-auto'>
          <div className='text-center max-w-2xl mx-auto space-y-3 mb-12'>
            <span className='inline-block text-xs font-bold tracking-widest text-cyan-600 uppercase'>
              Got Questions?
            </span>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Frequently asked,{' '}
              <span className='bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent'>
                straight answers.
              </span>
            </h2>
          </div>

          <div className='space-y-3'>
            {FAQS.map((f) => (
              <details
                key={f.q}
                className='group rounded-xl border border-violet-200 bg-gradient-to-br from-white to-violet-50/30 p-5 hover:border-violet-300 transition-all'
              >
                <summary className='cursor-pointer font-bold text-slate-900 flex items-center justify-between gap-4 list-none'>
                  <span>{f.q}</span>
                  <span className='shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white text-lg font-black group-open:rotate-45 transition-transform'>
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
      <section className='py-16 md:py-20 px-6 bg-gradient-to-br from-violet-600 to-cyan-500 text-white relative overflow-hidden'>
        <div className='absolute inset-0 opacity-10 pointer-events-none' style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className='relative max-w-3xl mx-auto text-center space-y-6'>
          <h2 className='text-3xl md:text-4xl font-black'>
            Ready to run your portfolio like a pro?
          </h2>
          <p className='text-white/90 text-lg max-w-xl mx-auto'>
            Join the landlords collecting rent on autopilot and getting paid faster. Plans from $39/mo. Pro at $99 — still less than Buildium.
          </p>
          <Link
            href={ctaUrl}
            className='inline-flex items-center justify-center gap-2 rounded-full bg-white text-violet-700 hover:bg-violet-50 font-black text-lg px-10 py-5 shadow-2xl transition-all hover:scale-[1.02]'
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
