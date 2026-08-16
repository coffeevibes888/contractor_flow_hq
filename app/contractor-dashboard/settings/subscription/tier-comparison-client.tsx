'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Check,
  X,
  Crown,
  Zap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Users,
  Briefcase,
  Package,
  Target,
  BarChart3,
  Plug,
  HelpCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface UsageData {
  activeJobsCount: number;
  invoicesThisMonth: number;
  totalCustomers: number;
  teamMembersCount: number;
  inventoryCount: number;
  equipmentCount: number;
  activeLeadsCount: number;
}

interface TierComparisonClientProps {
  currentTier: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
  usage: UsageData;
}

const TIER_CONFIG = {
  starter: {
    name: 'Starter',
    price: 39,
    icon: Sparkles,
    color: 'from-blue-600 to-cyan-600',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Everything a solo contractor needs — jobs, invoicing, CRM, inventory',
    popular: false,
    limits: {
      activeJobs: 15,
      invoices: 20,
      customers: 50,
      teamMembers: 0,
      inventory: 200,
      equipment: 20,
      leads: 0,
    },
  },
  pro: {
    name: 'Pro',
    price: 99,
    icon: Crown,
    color: 'from-violet-600 to-purple-600',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    description: 'Everything in Starter plus team management, scheduling & priority support',
    popular: true,
    limits: {
      activeJobs: 50,
      invoices: -1,
      customers: 500,
      teamMembers: 6,
      inventory: 200,
      equipment: 20,
      leads: 100,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    icon: Zap,
    color: 'from-amber-600 to-orange-600',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Unlimited everything with full business operations suite',
    popular: false,
    limits: {
      activeJobs: -1,
      invoices: -1,
      customers: -1,
      teamMembers: -1,
      inventory: -1,
      equipment: -1,
      leads: -1,
    },
  },
};

const FEATURES = [
  {
    category: 'Jobs & Projects',
    icon: Briefcase,
    items: [
      { name: 'Active Jobs/Month', starter: '15', pro: '50', enterprise: 'Unlimited' },
      { name: 'Job Templates', starter: false, pro: true, enterprise: true },
      { name: 'Custom Fields', starter: false, pro: true, enterprise: true },
      { name: 'Work Orders', starter: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Financial',
    icon: TrendingUp,
    items: [
      { name: 'Estimates/Quotes', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Invoices/Month', starter: '20', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Recurring Invoices', starter: true, pro: true, enterprise: true },
      { name: 'Payment Processing', starter: true, pro: true, enterprise: true },
      { name: 'Financial Reports', starter: 'Basic', pro: 'Standard', enterprise: 'Advanced' },
      { name: 'QuickBooks Integration', starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'CRM & Customers',
    icon: Target,
    items: [
      { name: 'Customer Limit', starter: '50', pro: '500', enterprise: 'Unlimited' },
      { name: 'Customer Portal', starter: true, pro: true, enterprise: true },
      { name: 'Customer Tags & History', starter: true, pro: true, enterprise: true },
      { name: 'Active Leads', starter: '0', pro: '100', enterprise: 'Unlimited' },
      { name: 'Lead Scoring', starter: false, pro: true, enterprise: true },
      { name: 'Lead Automation', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Inventory & Equipment',
    icon: Package,
    items: [
      { name: 'Inventory Items', starter: '200', pro: '200', enterprise: 'Unlimited' },
      { name: 'Equipment Items', starter: '20', pro: '20', enterprise: 'Unlimited' },
      { name: 'Stock Alerts', starter: false, pro: true, enterprise: true },
      { name: 'Multi-Location', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Team Management',
    icon: Users,
    items: [
      { name: 'Team Members', starter: '0', pro: '6', enterprise: 'Unlimited' },
      { name: 'Team Chat', starter: false, pro: true, enterprise: true },
      { name: 'Role Permissions', starter: false, pro: true, enterprise: true },
      { name: 'Scheduling', starter: false, pro: true, enterprise: true },
      { name: 'Time Tracking & Timesheets', starter: false, pro: true, enterprise: true },
      { name: 'Payroll Integration', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Analytics & Integrations',
    icon: BarChart3,
    items: [
      { name: 'Basic Reports', starter: true, pro: true, enterprise: true },
      { name: 'Advanced Analytics', starter: false, pro: false, enterprise: true },
      { name: 'Custom Dashboards', starter: false, pro: false, enterprise: true },
      { name: 'API Access', starter: false, pro: false, enterprise: true },
      { name: 'Priority Support', starter: false, pro: true, enterprise: true },
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: 'Can I upgrade or downgrade at any time?',
    answer: 'Yes! You can upgrade your plan at any time and the change takes effect immediately. When downgrading, you\'ll have until the end of your current billing period to adjust your usage to fit within the new limits.',
  },
  {
    question: 'What happens to my data if I downgrade?',
    answer: 'Your data is never deleted. If you exceed the limits of your new plan, you\'ll need to archive or remove some items before the downgrade can complete. We\'ll guide you through this process.',
  },
  {
    question: 'Do you offer annual billing?',
    answer: 'Yes! Annual billing is available with a 20% discount. Contact our sales team to set up annual billing for your account.',
  },
  {
    question: 'Can I add extra team members to the Pro plan?',
    answer: 'Currently, team member limits are fixed per tier. If you need more than 6 team members, we recommend upgrading to Enterprise for unlimited team members.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'No free trial — your card is charged when you sign up so you can use everything immediately. There\'s no long-term contract; cancel anytime from your dashboard.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure payment processor, Stripe.',
  },
];

export function TierComparisonClient({
  currentTier,
  subscriptionStatus,
  currentPeriodEnd,
  usage,
}: TierComparisonClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (targetTier: string) => {
    setUpgrading(targetTier);

    try {
      const response = await fetch('/api/contractor/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTier }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate upgrade');
      }

      const data = await response.json();

      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: 'Upgrade Successful',
          description: `You've been upgraded to ${TIER_CONFIG[targetTier as keyof typeof TIER_CONFIG].name}!`,
        });
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Upgrade Failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(null);
    }
  };

  const renderFeatureValue = (value: string | boolean | number) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-400 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-slate-600 mx-auto" />
      );
    }
    return <span className="text-slate-300 text-sm">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Choose Your Plan</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Select the perfect plan for your business. Upgrade or downgrade at any time.
          </p>
          {currentPeriodEnd && (
            <p className="text-slate-500 text-sm">
              Current billing period ends on {new Date(currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(TIER_CONFIG).map(([key, tier]) => {
            const Icon = tier.icon;
            const isCurrent = key === currentTier;
            const isUpgrade = ['starter', 'pro', 'enterprise'].indexOf(key) > 
                             ['starter', 'pro', 'enterprise'].indexOf(currentTier);

            return (
              <Card
                key={key}
                className={`relative bg-slate-900 border-white/10 overflow-hidden ${
                  isCurrent ? 'ring-2 ring-violet-500' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {/* Tier Header */}
                  <div className="space-y-3">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                        {isCurrent && (
                          <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">{tier.description}</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">${tier.price}</span>
                      <span className="text-slate-400 text-sm">/month</span>
                    </div>
                    <p className="text-slate-500 text-xs">Billed monthly</p>
                  </div>

                  {/* Key Limits */}
                  <div className="space-y-2 py-4 border-t border-b border-white/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Active Jobs</span>
                      <span className="text-white font-semibold">
                        {tier.limits.activeJobs === -1 ? 'Unlimited' : tier.limits.activeJobs}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Team Members</span>
                      <span className="text-white font-semibold">
                        {tier.limits.teamMembers === -1 ? 'Unlimited' : tier.limits.teamMembers}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Customers</span>
                      <span className="text-white font-semibold">
                        {tier.limits.customers === -1 ? 'Unlimited' : tier.limits.customers}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <Button
                      disabled
                      className="w-full bg-slate-800 text-slate-400 cursor-not-allowed"
                    >
                      Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      onClick={() => handleUpgrade(key)}
                      disabled={upgrading !== null}
                      className={`w-full bg-gradient-to-r ${tier.color} hover:opacity-90 text-white shadow-lg`}
                    >
                      {upgrading === key ? 'Processing...' : 'Upgrade Now'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/5"
                      onClick={() => {
                        toast({
                          title: 'Downgrade',
                          description: 'Contact support to downgrade your plan.',
                        });
                      }}
                    >
                      Contact Support
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <Card className="bg-slate-900 border-white/10">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Feature Comparison</h2>
            
            <div className="space-y-6">
              {FEATURES.map((category) => {
                const CategoryIcon = category.icon;
                return (
                  <div key={category.category} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-5 w-5 text-violet-400" />
                      <h3 className="text-lg font-semibold text-white">{category.category}</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Feature</th>
                            <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Starter</th>
                            <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Pro</th>
                            <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Enterprise</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-white/5">
                              <td className="py-3 px-4 text-slate-300 text-sm">{item.name}</td>
                              <td className="py-3 px-4 text-center">{renderFeatureValue(item.starter)}</td>
                              <td className="py-3 px-4 text-center">{renderFeatureValue(item.pro)}</td>
                              <td className="py-3 px-4 text-center">{renderFeatureValue(item.enterprise)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* FAQ Section */}
        <Card className="bg-slate-900 border-white/10">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="h-6 w-6 text-violet-400" />
              <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`item-${idx}`}
                  className="border border-white/10 rounded-lg px-4 bg-slate-800/50"
                >
                  <AccordionTrigger className="text-white hover:text-violet-300 text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-400 text-sm">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Card>

        {/* Support CTA */}
        <Card className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border-violet-500/30">
          <div className="p-6 text-center space-y-3">
            <h3 className="text-xl font-semibold text-white">Need help choosing?</h3>
            <p className="text-slate-300 text-sm">
              Our team is here to help you find the perfect plan for your business.
            </p>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => router.push('/contact')}
            >
              Contact Sales
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
