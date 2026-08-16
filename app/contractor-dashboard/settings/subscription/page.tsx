import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SubscriptionSettingsClient } from './subscription-settings-client';
import { prisma } from '@/db/prisma';
import Stripe from 'stripe';
import { requireContractorPage } from '@/lib/contractor-page-guard';

export const metadata: Metadata = {
  title: 'Subscription Settings | Contractor Dashboard',
  description: 'Manage your subscription, view usage, and billing information',
};

export default async function SubscriptionPage() {
  // Subscription management is owner-only. Employees never see plan controls.
  const { userId } = await requireContractorPage({ ownerOnly: true });

  // Get contractor profile with subscription info
  const contractor = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionEndsAt: true,
      usageTracking: {
        select: {
          activeJobsCount: true,
          invoicesThisMonth: true,
          totalCustomers: true,
          teamMembersCount: true,
          inventoryCount: true,
          equipmentCount: true,
          activeLeadsCount: true,
          lastResetDate: true,
        },
      },
    },
  });

  if (!contractor) {
    redirect('/onboarding/contractor');
  }

  // Fetch saved payment method from Stripe
  let paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null = null;

  if (contractor.stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const customer = await stripe.customers.retrieve(contractor.stripeCustomerId) as Stripe.Customer;

      if (!customer.deleted && customer.invoice_settings?.default_payment_method) {
        const pm = await stripe.paymentMethods.retrieve(
          customer.invoice_settings.default_payment_method as string
        );
        if (pm.type === 'card' && pm.card) {
          paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          };
        }
      }
    } catch {
      // Non-fatal — billing section will show fallback
    }
  }

  return (
    <SubscriptionSettingsClient
      currentTier={contractor.subscriptionTier || 'starter'}
      subscriptionStatus={contractor.subscriptionStatus || 'active'}
      currentPeriodStart={contractor.currentPeriodStart}
      currentPeriodEnd={contractor.currentPeriodEnd}
      stripeCustomerId={contractor.stripeCustomerId}
      stripeSubscriptionId={contractor.stripeSubscriptionId}
      subscriptionEndsAt={contractor.subscriptionEndsAt}
      paymentMethod={paymentMethod}
      usage={contractor.usageTracking || {
        activeJobsCount: 0,
        invoicesThisMonth: 0,
        totalCustomers: 0,
        teamMembersCount: 0,
        inventoryCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      }}
    />
  );
}
