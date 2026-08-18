'use client';

import { useState } from 'react';
import PublicContractWizard from './public-contract-wizard';
import Link from 'next/link';
import {
  FileText, DollarSign, Users, ClipboardList, BarChart3,
  PenLine, Wrench, Truck, Infinity,
} from 'lucide-react';

const PLATFORM_FEATURES = [
  {
    icon: <ClipboardList className="h-4 w-4 text-orange-500" />,
    title: 'Job & Work Order Management',
    desc: 'Create jobs, assign crew, track progress from estimate to invoice — all in one place.',
  },
  {
    icon: <PenLine className="h-4 w-4 text-orange-500" />,
    title: 'E-Sign Contracts',
    desc: 'Send contracts for legally-binding e-signature. Customers sign from any device.',
  },
  {
    icon: <DollarSign className="h-4 w-4 text-orange-500" />,
    title: 'Invoicing & Payments',
    desc: 'Professional invoices with online payment via Stripe. Auto-reminders for overdue invoices.',
  },
  {
    icon: <Users className="h-4 w-4 text-orange-500" />,
    title: 'Team Scheduling',
    desc: 'Assign crew to jobs, GPS time tracking, timesheet approvals, and payroll processing.',
  },
  {
    icon: <Wrench className="h-4 w-4 text-orange-500" />,
    title: 'Inventory & Equipment',
    desc: 'Track materials, tools, and equipment per job. Low-stock alerts and purchase orders.',
  },
  {
    icon: <BarChart3 className="h-4 w-4 text-orange-500" />,
    title: 'Reporting & Analytics',
    desc: 'Job profitability, revenue trends, expense tracking, and QuickBooks sync.',
  },
  {
    icon: <Truck className="h-4 w-4 text-orange-500" />,
    title: 'Lead Management',
    desc: 'CRM pipeline, marketplace listing, branded profile, and automated follow-ups.',
  },
  {
    icon: <Infinity className="h-4 w-4 text-orange-500" />,
    title: 'Unlimited Everything',
    desc: 'One plan, $99/mo. Unlimited jobs, team, invoices, contracts — no caps.',
  },
];

export default function ContractBuilderSection() {
  const [contractReady, setContractReady] = useState(false);

  return (
    <section className={contractReady ? 'w-full px-4 py-6' : 'max-w-7xl mx-auto px-4 py-10'}>
      <div className={contractReady ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-8'}>
        <div className={contractReady ? '' : 'lg:col-span-2 order-2 lg:order-1'}>
          <PublicContractWizard onContractGenerated={() => setContractReady(true)} />

          {/* CTA — mobile only */}
          {!contractReady && (
            <div className="lg:hidden mt-5 space-y-5">
              <div className="bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl p-5 text-white">
                <FileText className="h-8 w-8 mb-3 opacity-90" />
                <h3 className="font-bold text-base mb-1">Run your whole business here</h3>
                <p className="text-sm text-orange-100 mb-4">
                  E-sign contracts, manage jobs, send invoices, track crew, and get paid — all free for 14 days.
                </p>
                <Link
                  href="/sign-up?role=contractor&utm_source=free_contract&utm_medium=sidebar"
                  className="block text-center bg-white text-orange-600 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-orange-50 transition-colors"
                >
                  Start Free Trial →
                </Link>
                <p className="mt-2 text-center text-xs text-orange-200">14-day trial · No credit card</p>
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {!contractReady && (
          <aside className="hidden lg:flex lg:flex-col lg:order-2 lg:sticky lg:top-6 lg:self-start gap-3">
            {/* Platform overview */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-0.5">PropertyFlow HQ</p>
              <h2 className="text-sm font-bold text-gray-900 mb-3">All-in-one contractor platform</h2>
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
            <div className="bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl p-4 text-white">
              <FileText className="h-7 w-7 mb-2 opacity-90" />
              <h3 className="font-bold text-sm mb-1">Run your whole business here</h3>
              <p className="text-xs text-orange-100 mb-3">
                E-sign contracts, manage jobs, send invoices, track crew, and get paid — all free for 14 days.
              </p>
              <Link
                href="/sign-up?role=contractor&utm_source=free_contract&utm_medium=sidebar"
                className="block text-center bg-white text-orange-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-orange-50 transition-colors"
              >
                Start Free Trial →
              </Link>
              <p className="mt-1.5 text-center text-xs text-orange-200">14-day trial · No credit card</p>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
