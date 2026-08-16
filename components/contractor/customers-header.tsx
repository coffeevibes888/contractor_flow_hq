'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UpgradeModal } from '@/components/contractor/subscription/UpgradeModal';

interface CustomersHeaderProps {
  limitInfo: {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    tier: string;
  };
}

export function CustomersHeader({ limitInfo }: CustomersHeaderProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleAddCustomer = (e: React.MouseEvent) => {
    if (!limitInfo.allowed) {
      e.preventDefault();
      setShowUpgradeModal(true);
    }
  };

  const getRequiredTier = () => {
    if (limitInfo.tier === 'starter') return 'pro';
    return 'enterprise';
  };

  const getRequiredLimit = () => {
    if (limitInfo.tier === 'starter') return 500;
    return -1; // unlimited
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-600 mt-1">Manage your customer relationships</p>
          {limitInfo.limit !== -1 && (
            <p className="text-sm text-slate-500 mt-1">
              Using {limitInfo.current} of {limitInfo.limit} customers
              {limitInfo.remaining > 0 && ` (${limitInfo.remaining} remaining)`}
            </p>
          )}
        </div>
        <Link href="/contractor-dashboard/customers/new" onClick={handleAddCustomer}>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-gray-900"
            disabled={!limitInfo.allowed}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="customers"
        currentTier={limitInfo.tier}
        requiredTier={getRequiredTier()}
        currentLimit={limitInfo.limit}
        requiredLimit={getRequiredLimit()}
        benefits={
          limitInfo.tier === 'starter'
            ? [
                '500 customers in database',
                'Team management for up to 6 members',
                'CRM features with customer portal',
                'Lead management (100 active leads)',
                'Basic inventory tracking (200 items)',
                'Advanced scheduling and reporting',
              ]
            : [
                'Unlimited customers',
                'Unlimited team members',
                'Advanced CRM with automation',
                'Unlimited lead management',
                'Full inventory management',
                'Advanced analytics and API access',
              ]
        }
      />
    </>
  );
}
