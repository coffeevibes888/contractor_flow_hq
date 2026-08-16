import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { WalletClient } from '@/components/wallet/wallet-client';
import { ContractorEarningsSections } from '@/components/wallet/contractor-earnings-sections';

export const metadata: Metadata = {
  title: 'Wallet | Property Flow HQ',
  description:
    'Your Property Flow Wallet — Treasury balance, cash out, and earnings history.',
};

/**
 * Consolidated Wallet page for contractors.
 *
 * Sections (top to bottom):
 *   1. Treasury balance + Cash Out / Send / Card / Add Funds + account numbers
 *      (rendered by <WalletClient mode='contractor' />)
 *   2. Earnings KPIs + Stripe Connect setup banner + payment history
 *      (rendered by <ContractorEarningsSections />)
 *
 * Contractor owner-only — employees of a contractor org never see money UI.
 */
export default async function ContractorWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  // Contractor role guard — same as the old /payouts page.
  if (session.user.role !== 'contractor') {
    return redirect('/contractor-dashboard');
  }

  const params = await searchParams;
  const showOnboardingSuccess = params.onboarding === 'complete';

  // Resolve contractor profile + completed work orders for KPI math.
  const contractors = await prisma.contractorProfile.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      businessName: true,
    },
  });

  const contractorIds = contractors.map((c) => c.id);

  const completedOrders = await prisma.workOrder.findMany({
    where: {
      contractorId: { in: contractorIds },
      status: { in: ['completed', 'paid'] },
    },
    include: {
      landlord: { select: { name: true, companyName: true } },
      property: { select: { name: true } },
    },
    orderBy: { completedAt: 'desc' },
  });

  const totalEarnings = completedOrders.reduce(
    (sum, o) => sum + Number(o.actualCost || o.agreedPrice || 0),
    0
  );
  const paidOrders = completedOrders.filter((o) => o.status === 'paid');
  const pendingOrders = completedOrders.filter((o) => o.status === 'completed');
  const totalPaid = paidOrders.reduce(
    (sum, o) => sum + Number(o.actualCost || o.agreedPrice || 0),
    0
  );
  const pendingPayout = pendingOrders.reduce(
    (sum, o) => sum + Number(o.actualCost || o.agreedPrice || 0),
    0
  );

  // Cardholder + shipping (same fetcher the landlord wallet uses).
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, shippingAddress: true },
  });
  const shipping = user?.shippingAddress as
    | {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
      }
    | null;

  return (
    <WalletClient
      mode='contractor'
      cardholderName={user?.name || contractors[0]?.businessName || 'Property Flow User'}
      defaultAddress={shipping}
      extraSections={
        <ContractorEarningsSections
          showOnboardingSuccess={showOnboardingSuccess}
          totalEarnings={totalEarnings}
          pendingPayout={pendingPayout}
          totalPaid={totalPaid}
          payments={completedOrders.map((order) => ({
            id: order.id,
            title: order.title,
            amount: Number(order.actualCost || order.agreedPrice || 0),
            status: order.status,
            completedAt: order.completedAt?.toISOString() || null,
            propertyName: order.property?.name || 'Property',
            landlordName:
              order.landlord?.companyName || order.landlord?.name || 'Landlord',
          }))}
        />
      }
    />
  );
}
