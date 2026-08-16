import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Stripe from 'stripe';
import BillingSettingsClient from './billing-settings-client';
import { requireContractorPage } from '@/lib/contractor-page-guard';

export const metadata: Metadata = {
  title: 'Billing | Contractor Dashboard',
  description: 'Manage your payment method, billing address, and invoice history',
};

export default async function BillingSettingsPage() {
  // Billing details (cards, invoices) are owner-only.
  const { userId } = await requireContractorPage({ ownerOnly: true });

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, billingAddress: true },
    }),
    prisma.contractorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        stripeCustomerId: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
      },
    }),
  ]);

  if (!user || !profile) redirect('/onboarding/contractor');

  let paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null = null;
  let invoices: { id: string; date: number; amount: number; status: string; pdfUrl: string | null }[] = [];

  if (profile.stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const customer = await stripe.customers.retrieve(profile.stripeCustomerId) as Stripe.Customer;

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

      const stripeInvoices = await stripe.invoices.list({
        customer: profile.stripeCustomerId,
        limit: 12,
      });

      invoices = stripeInvoices.data
        .filter((inv): inv is Stripe.Invoice & { id: string } => Boolean(inv.id))
        .map((inv) => ({
          id: inv.id,
          date: inv.created,
          amount: inv.amount_paid / 100,
          status: inv.status || 'unknown',
          // Stripe types `invoice_pdf` as `string | null | undefined`; the
          // client's prop expects `string | null`, so collapse undefined → null.
          pdfUrl: inv.invoice_pdf ?? null,
        }));
    } catch {
      // Non-fatal
    }
  }

  return (
    <BillingSettingsClient
      stripeCustomerId={profile.stripeCustomerId}
      paymentMethod={paymentMethod}
      invoices={invoices}
      billingAddress={(user.billingAddress as Record<string, string>) || null}
      subscriptionTier={profile.subscriptionTier || 'starter'}
      subscriptionStatus={profile.subscriptionStatus || 'trialing'}
      currentPeriodEnd={profile.currentPeriodEnd}
    />
  );
}
