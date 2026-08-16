'use client';

import { useState } from 'react';
import {
  Users, ClipboardList, CreditCard, Wrench, TrendingUp,
  Clock, CheckCircle2, Globe, Building2, ChevronRight,
  Plus, ExternalLink,
} from 'lucide-react';
import ContractorDirectory from './contractor-directory';
import WorkOrdersTab from './work-orders-tab';
import ContractorPaymentsTab from './contractor-payments-tab';
import Link from 'next/link';

type Tab = 'in-house' | 'marketplace' | 'work-orders' | 'payments';

export default function ContractorWorkPage() {
  const [activeTab, setActiveTab] = useState<Tab>('in-house');

  const tabs: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'in-house', label: 'In-House Contractors', icon: Users, description: 'Your private contractor directory' },
    { id: 'marketplace', label: 'Marketplace', icon: Globe, description: 'Open bids & public contractors' },
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, description: 'All jobs & assignments' },
    { id: 'payments', label: 'Payments', icon: CreditCard, description: 'Payment history & spending' },
  ];

  return (
    <main className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>
            Contractor Work
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage your contractors, work orders, and marketplace bids
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Link
            href='/contractor-marketplace'
            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all'
          >
            <Globe className='h-3.5 w-3.5' />
            Browse Marketplace
            <ExternalLink className='h-3 w-3' />
          </Link>
        </div>
      </div>

      {/* Explanation Cards — In-House vs Marketplace */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <button
          onClick={() => setActiveTab('in-house')}
          className={`relative rounded-xl border p-4 text-left transition-all overflow-hidden group ${
            activeTab === 'in-house'
              ? 'border-cyan-300 bg-white shadow-md ring-1 ring-cyan-200'
              : 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300'
          }`}
        >
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-cyan-400 to-transparent opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity' />
          <div className='flex items-start gap-3'>
            <div className='h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shrink-0'>
              <Building2 className='h-5 w-5' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>In-House Contractors</h3>
              <p className='text-[11px] text-gray-500 mt-0.5'>
                Your private directory of trusted contractors you&apos;ve hired or added manually. 
                Assign them directly to work orders with agreed pricing.
              </p>
            </div>
          </div>
          {activeTab === 'in-house' && (
            <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500' />
          )}
        </button>

        <button
          onClick={() => setActiveTab('marketplace')}
          className={`relative rounded-xl border p-4 text-left transition-all overflow-hidden group ${
            activeTab === 'marketplace'
              ? 'border-violet-300 bg-white shadow-md ring-1 ring-violet-200'
              : 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300'
          }`}
        >
          <div className='absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-violet-400 to-transparent opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity' />
          <div className='flex items-start gap-3'>
            <div className='h-10 w-10 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white shrink-0'>
              <Globe className='h-5 w-5' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-gray-800'>Contractor Marketplace</h3>
              <p className='text-[11px] text-gray-500 mt-0.5'>
                Post jobs for open bidding on the public marketplace. Verified contractors 
                compete for your work with transparent pricing.
              </p>
            </div>
          </div>
          {activeTab === 'marketplace' && (
            <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400 to-purple-500' />
          )}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className='flex items-center gap-1 overflow-x-auto pb-1'>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className='h-3.5 w-3.5' />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'in-house' && (
          <div className='space-y-4'>
            <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
              <div className='flex items-center justify-between mb-3'>
                <div>
                  <h3 className='text-sm font-bold text-gray-800'>Your Contractor Directory</h3>
                  <p className='text-[11px] text-gray-500'>
                    Contractors you&apos;ve added to your team. Assign them directly to work orders.
                  </p>
                </div>
              </div>
            </div>
            <ContractorDirectory />
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className='space-y-4'>
            {/* Marketplace Info */}
            <div className='rounded-xl border border-gray-200 bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 p-4 shadow-sm'>
              <div className='flex items-start gap-3'>
                <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white shrink-0'>
                  <Globe className='h-4 w-4' />
                </div>
                <div className='flex-1'>
                  <h3 className='text-sm font-bold text-gray-800'>How the Marketplace Works</h3>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3'>
                    <div className='flex items-start gap-2'>
                      <div className='h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-[10px] font-bold shrink-0'>1</div>
                      <div>
                        <p className='text-[11px] font-semibold text-gray-700'>Post a Job</p>
                        <p className='text-[10px] text-gray-500'>Create a work order and open it for bids with your budget range</p>
                      </div>
                    </div>
                    <div className='flex items-start gap-2'>
                      <div className='h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-[10px] font-bold shrink-0'>2</div>
                      <div>
                        <p className='text-[11px] font-semibold text-gray-700'>Receive Bids</p>
                        <p className='text-[10px] text-gray-500'>Verified contractors submit competitive bids with timelines</p>
                      </div>
                    </div>
                    <div className='flex items-start gap-2'>
                      <div className='h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-[10px] font-bold shrink-0'>3</div>
                      <div>
                        <p className='text-[11px] font-semibold text-gray-700'>Choose & Assign</p>
                        <p className='text-[10px] text-gray-500'>Review bids, pick the best contractor, and track the work</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <Link
                href='/contractor-marketplace'
                className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all group flex items-center gap-3'
              >
                <div className='h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform'>
                  <Users className='h-5 w-5' />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-gray-800'>Browse Contractors</p>
                  <p className='text-[11px] text-gray-500'>Find verified contractors by specialty and location</p>
                </div>
                <ChevronRight className='h-4 w-4 text-gray-400 group-hover:text-gray-600' />
              </Link>

              <Link
                href='/contractors?view=jobs'
                className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all group flex items-center gap-3'
              >
                <div className='h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform'>
                  <ClipboardList className='h-5 w-5' />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-gray-800'>View Open Jobs</p>
                  <p className='text-[11px] text-gray-500'>See all jobs currently open for bidding</p>
                </div>
                <ChevronRight className='h-4 w-4 text-gray-400 group-hover:text-gray-600' />
              </Link>
            </div>

            {/* Marketplace tip: switch to Work Orders to post */}
            <div className='rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-4 text-center'>
              <p className='text-xs text-violet-700'>
                To post a job for marketplace bidding, go to{' '}
                <button onClick={() => setActiveTab('work-orders')} className='font-semibold underline hover:text-violet-900'>
                  Work Orders
                </button>{' '}
                and create a new work order with &quot;Post for Bids&quot; enabled.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'work-orders' && <WorkOrdersTab />}
        {activeTab === 'payments' && <ContractorPaymentsTab />}
      </div>
    </main>
  );
}
