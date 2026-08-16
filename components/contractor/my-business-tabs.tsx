'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Building2,
  Scale,
  Wallet,
  Plus,
  ExternalLink,
  FileText,
  Calendar,
  DollarSign,
} from 'lucide-react';

type Tab = 'portfolio' | 'landlords' | 'disputes' | 'payouts';

type Props = {
  activeTab: string;
  portfolioItems: any[];
  landlords: any[];
  disputes: any[];
  payouts: any[];
  contractorId: string;
  hasStripeAccount: boolean;
};

export function MyBusinessTabs({
  activeTab: initialTab,
  portfolioItems,
  landlords,
  disputes,
  payouts,
  contractorId,
  hasStripeAccount,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) || 'portfolio');

  const tabs = [
    { id: 'portfolio' as Tab, label: 'My Work', icon: Camera, count: portfolioItems.length },
    { id: 'landlords' as Tab, label: 'My Landlords', icon: Building2, count: landlords.length },
    { id: 'disputes' as Tab, label: 'Disputes', icon: Scale, count: disputes.length },
    { id: 'payouts' as Tab, label: 'Payouts', icon: Wallet, count: payouts.length },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <Badge variant="secondary" className="ml-1">
                {tab.count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        {activeTab === 'portfolio' && (
          <PortfolioTab items={portfolioItems} contractorId={contractorId} />
        )}
        {activeTab === 'landlords' && (
          <LandlordsTab landlords={landlords} />
        )}
        {activeTab === 'disputes' && (
          <DisputesTab disputes={disputes} />
        )}
        {activeTab === 'payouts' && (
          <PayoutsTab payouts={payouts} hasStripeAccount={hasStripeAccount} />
        )}
      </div>
    </div>
  );
}

function PortfolioTab({ items, contractorId }: { items: any[]; contractorId: string }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Portfolio</h3>
          <p className="text-sm text-gray-600">Showcase your work with photos and videos</p>
        </div>
        <Link href="/contractor-dashboard/portfolio/new">
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Work
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 mb-4">No portfolio items yet</p>
          <Link href="/contractor-dashboard/portfolio/new">
            <Button variant="outline">Add Your First Project</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/contractor-dashboard/portfolio/${item.id}`}
              className="group rounded-lg border-2 border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all"
            >
              {item.imageUrl && (
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function LandlordsTab({ landlords }: { landlords: any[] }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">My Landlords</h3>
        <p className="text-sm text-gray-600">Property managers and landlords you work with</p>
      </div>

      {landlords.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No landlord relationships yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {landlords.map((landlord) => (
            <div
              key={landlord.id}
              className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{landlord.name}</h4>
                  <p className="text-sm text-gray-600">{landlord.email}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary">
                  {landlord._count.workOrders} {landlord._count.workOrders === 1 ? 'job' : 'jobs'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DisputesTab({ disputes }: { disputes: any[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_review':
        return 'bg-blue-100 text-blue-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Disputes</h3>
          <p className="text-sm text-gray-600">Manage disputes and resolutions</p>
        </div>
        <Link href="/dispute-center/new">
          <Button variant="outline" className="border-2 border-gray-200">
            <Plus className="h-4 w-4 mr-2" />
            File Dispute
          </Button>
        </Link>
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-12">
          <Scale className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No disputes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <Link
              key={dispute.id}
              href={`/dispute-center/${dispute.id}`}
              className="block p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{dispute.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{dispute.description}</p>
                </div>
                <Badge className={getStatusColor(dispute.status)}>
                  {dispute.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(dispute.createdAt).toLocaleDateString()}
                </span>
                {dispute.amount && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${Number(dispute.amount).toFixed(2)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutsTab({ payouts, hasStripeAccount }: { payouts: any[]; hasStripeAccount: boolean }) {
  if (!hasStripeAccount) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Stripe Account</h3>
          <p className="text-gray-600 mb-6">
            Connect your Stripe account to receive payouts
          </p>
          <Link href="/contractor-dashboard/wallet">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              Connect Stripe
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payouts</h3>
          <p className="text-sm text-gray-600">Your earnings and payment history</p>
        </div>
        <Link href="/contractor-dashboard/payouts">
          <Button variant="outline" className="border-2 border-gray-200">
            <ExternalLink className="h-4 w-4 mr-2" />
            View All
          </Button>
        </Link>
      </div>

      {payouts.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No payouts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    ${payout.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(payout.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  payout.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : payout.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }
              >
                {payout.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
