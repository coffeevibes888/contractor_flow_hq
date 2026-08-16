'use client';

import { useState } from 'react';
import PublicLeaseWizard from './public-lease-wizard';
import Link from 'next/link';
import {
  FileText, CreditCard, Users, Wrench, BarChart3,
  PenLine, Bell, Building2, Infinity,
} from 'lucide-react';

const PLATFORM_FEATURES = [
  {
    icon: <CreditCard className="h-4 w-4 text-sky-500" />,
    title: 'Online Rent Collection',
    desc: 'ACH & card payments, automatic reminders, late fee tracking — all on autopilot.',
  },
  {
    icon: <PenLine className="h-4 w-4 text-sky-500" />,
    title: 'E-Signatures',
    desc: 'Send leases to tenants for legally-binding e-signatures from any device.',
  },
  {
    icon: <Users className="h-4 w-4 text-sky-500" />,
    title: 'Tenant Portal',
    desc: 'Tenants pay rent, submit maintenance requests, and view documents in one place.',
  },
  {
    icon: <Wrench className="h-4 w-4 text-sky-500" />,
    title: 'Maintenance Tracking',
    desc: 'Work orders, photo uploads, contractor assignment, and status updates.',
  },
  {
    icon: <BarChart3 className="h-4 w-4 text-sky-500" />,
    title: 'Rental Accounting',
    desc: 'P&L reports, rent roll, expense tracking, and tax-ready exports.',
  },
  {
    icon: <Bell className="h-4 w-4 text-sky-500" />,
    title: 'Automated Reminders',
    desc: 'Rent due alerts, lease renewals, and inspection notices sent automatically.',
  },
  {
    icon: <Building2 className="h-4 w-4 text-sky-500" />,
    title: 'Multi-Property Dashboard',
    desc: 'Manage every unit, tenant, and payment from a single clean dashboard.',
  },
  {
    icon: <Infinity className="h-4 w-4 text-sky-500" />,
    title: 'Unlimited Leases',
    desc: 'Generate state-specific leases for every property and unit — no caps.',
  },
];

export default function LeaseBuilderSection() {
  const [leaseReady, setLeaseReady] = useState(false);

  return (
    <>
      {/* ── Main content ─────────────────────────────────────────────────── */}
      {/* When the lease is ready we go full-width; wizard/builder stays max-7xl */}
      <section className={leaseReady ? 'w-full px-4 py-6' : 'max-w-7xl mx-auto px-4 py-10'}>
        {/* Single wizard instance — only the surrounding layout changes */}
        <div className={leaseReady ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-8'}>
          <div className={leaseReady ? '' : 'lg:col-span-2 order-2 lg:order-1'}>
            <PublicLeaseWizard onLeaseGenerated={() => setLeaseReady(true)} />

            {/* CTA + disclaimer — mobile only, sits below the wizard */}
            {!leaseReady && (
              <div className="lg:hidden mt-5 space-y-5">
                <div className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-5 text-white">
                  <FileText className="h-8 w-8 mb-3 opacity-90" />
                  <h3 className="font-bold text-base mb-1">Manage everything in one place</h3>
                  <p className="text-sm text-sky-100 mb-4">
                    E-sign leases, collect rent, track maintenance, and run accounting — all free for 14 days.
                  </p>
                  <Link
                    href="/sign-up?utm_source=free_lease&utm_medium=sidebar"
                    className="block text-center bg-white text-sky-600 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-sky-50 transition-colors"
                  >
                    Start Free Trial →
                  </Link>
                  <p className="mt-2 text-center text-xs text-sky-200">14-day trial · No credit card</p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop sidebar — hidden on mobile entirely */}
          {!leaseReady && (
          <aside className="hidden lg:flex lg:flex-col lg:order-2 lg:sticky lg:top-6 lg:self-start gap-3">
              {/* Platform overview */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-0.5">PropertyFlow HQ</p>
                <h2 className="text-sm font-bold text-gray-900 mb-3">All-in-one property management</h2>
                <ul className="space-y-2">
                  {PLATFORM_FEATURES.map((f) => (
                    <li key={f.title} className="flex gap-2.5">
                      <div className="flex-shrink-0 mt-0.5">{f.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{f.title}</p>
                        <p className="text-[11px] text-gray-500 leading-snug">{f.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Upsell CTA */}
              <div className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-4 text-white">
                <FileText className="h-7 w-7 mb-2 opacity-90" />
                <h3 className="font-bold text-sm mb-1">Manage everything in one place</h3>
                <p className="text-xs text-sky-100 mb-3">
                  E-sign leases, collect rent, track maintenance, and run accounting — all free for 14 days.
                </p>
                <Link
                  href="/sign-up?utm_source=free_lease&utm_medium=sidebar"
                  className="block text-center bg-white text-sky-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-sky-50 transition-colors"
                >
                  Start Free Trial →
                </Link>
                <p className="mt-1.5 text-center text-xs text-sky-200">14-day trial · No credit card</p>
              </div>

          </aside>
          )}
        </div>
      </section>
    </>
  );
}
