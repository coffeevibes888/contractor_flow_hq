import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Shield, Users, Mail } from 'lucide-react';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'About Property Flow HQ — Built by a Property Manager, For Property Managers',
  description:
    'Property Flow HQ was built by someone who spent years chasing rent in cash and sorting paperwork at midnight. Every feature comes from real-world experience, not theory.',
  alternates: { canonical: 'https://www.propertyflowhq.com/about' },
  openGraph: {
    title: 'About Property Flow HQ — Built by a Property Manager',
    description:
      'The story behind the platform. Built by someone who lived the chaos of manual property management — and decided to fix it.',
    url: 'https://www.propertyflowhq.com/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Property Flow HQ — Built by a Property Manager',
    description:
      'The story behind the platform. Built by someone who lived the chaos of manual property management — and decided to fix it.',
  },
};

const pillars = [
  {
    icon: Zap,
    title: 'Automation First',
    desc: 'Every feature eliminates a task you currently do manually — rent reminders, late fees, lease renewals, move-out notices.',
  },
  {
    icon: Shield,
    title: 'No Per-Unit Fees',
    desc: 'Flat monthly pricing from $39. Manage 1 unit or 150 — you pay the same rate. No surprises as you grow.',
  },
  {
    icon: Users,
    title: 'Built From Experience',
    desc: 'Every screen was designed by someone who ran properties the hard way first. No guesswork, no theory — just what actually works.',
  },
];

const AboutPage = () => {
  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-sky-50 via-white to-cyan-50">

      {/* ── Hero — compact, above-fold ──────────────────────────── */}
      <section className="w-full px-4 pt-10 pb-8 md:pt-14 md:pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-700 text-xs font-bold px-3 py-1 rounded-full border border-sky-200 tracking-wide uppercase">
                Our Story
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-slate-900">
                Built by a Property Manager.{' '}
                <span className="bg-gradient-to-r from-sky-500 to-cyan-500 bg-clip-text text-transparent">
                  For Property Managers.
                </span>
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                This platform wasn&apos;t invented in a boardroom. It was built out of frustration — by someone
                who spent years doing this job the hard way.
              </p>
            </div>
            {/* Quick stats strip */}
            <div className="flex gap-6 md:gap-8 shrink-0">
              {[
                { num: '$39', label: 'Flat/mo pricing' },
                { num: '50+', label: 'States supported' },
                { num: '1', label: 'Founder who answers' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-extrabold text-sky-600">{s.num}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div className="w-full border-t border-sky-100" />

      {/* ── Story + Photos ───────────────────────────────────────── */}
      <section className="w-full px-4 py-10 md:py-14">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">

            {/* Story card */}
            <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/60 p-6 md:p-9 shadow-xl">
              <p className="text-[10px] font-bold tracking-[0.25em] text-sky-400 uppercase mb-5">The Story</p>
              <div className="space-y-4 text-[14.5px] text-gray-300 leading-relaxed">
                <p className="text-gray-100 font-semibold text-base">
                  Before Property Flow HQ was software, it was real life.
                </p>
                <p>
                  For years, I worked as a property manager doing things the old-school way — collecting rent in
                  cash, tracking payments on green sheets, and spending long nights manually uploading reports
                  into QuickBooks. No automation. No dashboards. Just paperwork, spreadsheets, and constant
                  follow-ups.
                </p>
                <p>
                  I knew the job inside and out because I lived it. The late rent reminders. The missing
                  payments. The stress of keeping everything organized while managing people, properties, and
                  time — all at once.
                </p>
                <p>
                  Eventually, I saw the problem clearly: property managers were being forced to work harder than
                  necessary with outdated tools that weren&apos;t built for how we actually operate.
                </p>
                <p className="text-white font-semibold">So I did something about it.</p>
                <p>
                  I became a web developer and started building the system I always wished I had — one rooted in
                  real experience, not investor decks or product surveys.
                </p>
                <p>
                  Property Flow HQ is practical, affordable, and built to help landlords and property managers
                  save time, reduce stress, and stay organized — without needing a tech background.
                </p>
                <p className="text-sky-300 font-semibold">
                  If you&apos;ve ever chased rent or sorted paperwork late at night — this was built for you.
                  Welcome to Property Flow HQ. 🏠
                </p>
              </div>

              {/* Founder signature */}
              <div className="mt-7 pt-5 border-t border-white/10 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-sky-400/40 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/allenPic2.jpg" alt="Allen Young — Founder" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Allen Young</p>
                  <p className="text-xs text-sky-300">Founder &amp; Developer · Property Flow HQ</p>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Former Property Manager
                </div>
              </div>
            </div>

            {/* Professional portrait column */}
            <div className="space-y-4">
              {/* Primary portrait */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
                <div className="aspect-[4/5] w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/allenPic2.jpg"
                    alt="Allen Young — Founder of Property Flow HQ"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="px-4 py-3 bg-white border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-900">Allen Young</p>
                  <p className="text-xs text-slate-500">Founder &amp; Developer</p>
                </div>
              </div>

              {/* Secondary portrait */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/me2.PNG"
                    alt="Allen Young — Property Flow HQ"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="px-4 py-3 bg-white border-t border-slate-100">
                  <p className="text-xs text-slate-500">Property Flow HQ · Est. 2024</p>
                </div>
              </div>

              {/* Credentials pill row */}
              <div className="flex flex-wrap gap-2">
                {['Property Manager', 'Web Developer', 'Landlord'].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pillars ──────────────────────────────────────────────── */}
      <section className="w-full px-4 py-10 md:py-12 bg-white/60 border-y border-sky-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">What We Stand For</h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Three principles that drive every feature decision we make.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-sky-300 transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center mb-4 shadow shadow-sky-200">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1.5">{p.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Founder CTA strip ────────────────────────────────────── */}
      <section className="w-full px-4 py-10 md:py-14">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-sky-500 to-cyan-500 shadow-lg">
            <div className="px-7 py-9 md:py-12 md:px-12 flex flex-col md:flex-row items-center justify-between gap-7">
              <div className="space-y-3 text-center md:text-left max-w-xl">
                <p className="text-xs font-bold tracking-[0.2em] text-sky-100 uppercase">A Note From the Founder</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">
                  When you email support, you&apos;re emailing<br className="hidden md:block" /> the person who built it.
                </h2>
                <p className="text-sm md:text-base text-sky-100 leading-relaxed">
                  No ticket queues. No outsourced support team. Just a founder who cares whether this works for
                  you — because your problems used to be my problems.
                </p>
                <a
                  href="mailto:support@propertyflowhq.com"
                  className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  support@propertyflowhq.com
                </a>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-2">
                <Link
                  href="/sign-up?role=landlord"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-sky-600 px-7 py-3.5 text-sm font-bold shadow hover:bg-sky-50 hover:scale-105 transition-all duration-200"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-center text-[11px] text-sky-100 font-medium">14 days free · No credit card</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
};

export default AboutPage;
