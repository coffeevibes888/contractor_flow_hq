import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { formatEstimatedArrival } from '@/lib/config/stripe-constants';
import { WalletClient } from '@/components/wallet/wallet-client';
import { RentCollectionSections } from '@/components/wallet/rent-collection-sections';

export const metadata: Metadata = {
  title: 'Wallet | Property Flow HQ',
  description:
    'Your Property Flow Wallet — an isolated bank account powered by Stripe Treasury, plus rent collection history.',
};

/**
 * Consolidated Wallet page for landlords / PMs.
 *
 * Sections (top to bottom):
 *   1. Treasury balance + actions + Issuing card + account numbers
 *      (rendered by <WalletClient />)
 *   2. Rent collection KPIs + Stripe Connect onboarding (or direct-deposit
 *      summary) + recent rent payments table
 *      (rendered by <RentCollectionSections />)
 *
 * Owner-only: employees see redirect to /admin/overview.
 */
export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    redirect('/onboarding');
  }
  const landlord = landlordResult.landlord;

  // Owner-only — employees cannot view or move money.
  if (landlord.ownerUserId && landlord.ownerUserId !== session.user.id) {
    redirect('/admin/overview');
  }

  // Cardholder + shipping address for the Issuing card flow.
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

  // ── Rent collection data (lifted from the old /admin/payouts page) ─────
  // Permission gate: same role check the old page used. If the user can't
  // view rent collection, we render the wallet without those sections.
  const userRole = await getCurrentUserTeamRole(landlord.id);
  const permissions = (userRole.permissions as string[]) || [];
  const canViewRentCollection =
    userRole.isOwner ||
    permissions.includes('manage_finances') ||
    permissions.includes('view_financials');

  let rentSections: React.ReactNode = null;
  if (canViewRentCollection) {
    // Recent rent payments
    const recentPayments = await prisma.rentPayment.findMany({
      where: {
        status: { in: ['paid', 'processing', 'pending'] },
        lease: { unit: { property: { landlordId: landlord.id } } },
      },
      include: {
        tenant: { select: { name: true } },
        lease: {
          include: {
            unit: { include: { property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 20,
    });

    // KPI rollups
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allPaid = await prisma.rentPayment.findMany({
      where: {
        status: 'paid',
        lease: { unit: { property: { landlordId: landlord.id } } },
      },
      select: { amount: true, paidAt: true },
    });
    const totalReceived = allPaid.reduce((sum, p) => sum + Number(p.amount), 0);
    const thisMonthAmount = allPaid
      .filter((p) => p.paidAt && p.paidAt >= startOfMonth)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const inTransit = await prisma.rentPayment.findMany({
      where: {
        status: 'processing',
        lease: { unit: { property: { landlordId: landlord.id } } },
      },
      select: { amount: true },
    });
    const pendingAmount = inTransit.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    rentSections = (
      <RentCollectionSections
        totalReceived={totalReceived}
        pendingAmount={pendingAmount}
        thisMonthAmount={thisMonthAmount}
        recentPayments={recentPayments.map((p) => {
          const meta = p.metadata as Record<string, unknown> | null;
          const paymentMethod = (meta?.paymentMethod as string) || 'card';
          return {
            id: p.id,
            amount: Number(p.amount),
            status: p.status,
            paidAt: p.paidAt?.toISOString() || null,
            paymentMethod,
            tenantName: p.tenant?.name || 'Unknown Tenant',
            propertyName: p.lease?.unit?.property?.name || 'Unknown Property',
            unitNumber: p.lease?.unit?.name || '',
            estimatedArrival:
              p.status === 'processing'
                ? formatEstimatedArrival(paymentMethod)
                : null,
            metadata: p.metadata as Record<string, unknown> | null,
            dueDate: p.dueDate?.toISOString() || null,
          };
        })}
      />
    );
  }

  return (
    <WalletClient
      mode='landlord'
      cardholderName={user?.name || 'Property Flow User'}
      defaultAddress={shipping}
      extraSections={rentSections}
    />
  );
}
