import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { syncLandlordSubscriptionFromStripe } from '@/lib/actions/subscription-sync';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { randomBytes } from 'crypto';
import DashboardClient from './dashboard-client';
import type { SetupWizardStep } from '@/components/admin/setup-wizard-strip';

export const metadata: Metadata = {
  title: 'Property Dashboard',
};

// Cache dashboard stats for 60 seconds to reduce DB load
const getCachedDashboardStats = unstable_cache(
  async (landlordId: string, startOfMonth: Date, startOfYear: Date) => {
    const prismaAny = prisma as any;

    const [
      propertiesCount,
      applicationsCount,
      tenantsCount,
      ticketsCount,
      totalUnits,
      occupiedUnits,
      urgentTickets,
      openTickets,
      rentPaidThisMonth,
      rentPaidYtd,
      scheduledRent,
      unpaidRent,
      recentLeases,
      recentApplications,
      recentTickets,
      leasesExpiringSoon,
      expiringLeaseDetails,
    ] = await Promise.all([
      prisma.property.count({ where: { landlordId } }),
      prisma.rentalApplication.count({
        where: { unit: { property: { landlordId } } },
      }),
      prisma.user.count({
        where: {
          role: 'tenant',
          leasesAsTenant: { some: { unit: { property: { landlordId } } } },
        },
      }),
      prisma.maintenanceTicket.count({
        where: { unit: { property: { landlordId } } },
      }),
      prisma.unit.count({ where: { property: { landlordId } } }),
      prisma.lease.count({
        where: { status: 'active', unit: { property: { landlordId } } },
      }),
      prisma.maintenanceTicket.count({
        where: {
          status: { in: ['open', 'in_progress'] },
          priority: 'urgent',
          unit: { property: { landlordId } },
        },
      }),
      prisma.maintenanceTicket.count({
        where: {
          status: { in: ['open', 'in_progress'] },
          unit: { property: { landlordId } },
        },
      }),
      prisma.rentPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          paidAt: { gte: startOfMonth },
          lease: { unit: { property: { landlordId } } },
        },
      }),
      prisma.rentPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          paidAt: { gte: startOfYear },
          lease: { unit: { property: { landlordId } } },
        },
      }),
      prisma.lease.aggregate({
        _sum: { rentAmount: true },
        where: { status: 'active', unit: { property: { landlordId } } },
      }),
      prisma.rentPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          payoutId: null,
          lease: { unit: { property: { landlordId } } },
        },
      }),
      // Recent leases for activity feed
      prisma.lease.findMany({
        where: { unit: { property: { landlordId } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          rentAmount: true,
          startDate: true,
          createdAt: true,
          tenant: { select: { name: true } },
          unit: { select: { name: true, property: { select: { name: true } } } },
        },
      }),
      // Recent applications
      prisma.rentalApplication.findMany({
        where: { unit: { property: { landlordId } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          status: true,
          createdAt: true,
          unit: { select: { name: true, property: { select: { name: true } } } },
        },
      }),
      // Recent maintenance tickets
      prisma.maintenanceTicket.findMany({
        where: { unit: { property: { landlordId } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          tenant: { select: { name: true } },
        },
      }),
      // Leases expiring in next 60 days
      prisma.lease.count({
        where: {
          status: 'active',
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
          unit: { property: { landlordId } },
        },
      }),
      // Detailed expiring leases for dashboard
      prisma.lease.findMany({
        where: {
          status: 'active',
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
          unit: { property: { landlordId } },
        },
        orderBy: { endDate: 'asc' },
        take: 5,
        select: {
          id: true,
          endDate: true,
          rentAmount: true,
          tenant: { select: { name: true } },
          unit: { select: { name: true, property: { select: { name: true } } } },
        },
      }),
    ]);

    return {
      propertiesCount,
      applicationsCount,
      tenantsCount,
      ticketsCount,
      totalUnits,
      occupiedUnits,
      urgentTickets,
      openTickets,
      rentPaidThisMonth,
      rentPaidYtd,
      scheduledRent,
      unpaidRent,
      recentLeases,
      recentApplications,
      recentTickets,
      leasesExpiringSoon,
      expiringLeaseDetails,
    };
  },
  ['admin-dashboard-stats-v2'],
  { revalidate: 60 }
);

const AdminOverviewPage = async (props: {
  searchParams?: Promise<{ subscription?: string; tier?: string }>;
}) => {
  const session = await requireAdmin();

  const resolvedSearchParams = (await props.searchParams) || {};
  const isSubscriptionSuccess = resolvedSearchParams.subscription === 'success';

  // Need the landlord for downstream queries and (if we just came from Stripe)
  // to run the subscription sync before the dashboard renders its tier-gated UI.
  const landlordResult = await getOrCreateCurrentLandlord();

  if (!landlordResult.success || !landlordResult.landlord) {
    throw new Error(landlordResult.message || 'Unable to determine landlord');
  }

  if (isSubscriptionSuccess) {
    // The layout already ran a sync when it detected the Stripe referer.
    // Run it again here as a fallback (e.g. page refresh after checkout)
    // using the shared server action so we don't depend on self-fetch.
    try {
      await syncLandlordSubscriptionFromStripe(landlordResult.landlord.id);
    } catch {
      // ignore — subscription was already synced in the layout
    }

    redirect('/admin/overview');
  }

  const landlordId = landlordResult.landlord.id;
  const landlordSubdomain = landlordResult.landlord.subdomain;
  const landlordName = landlordResult.landlord.companyName || landlordResult.landlord.name;

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'propertyflowhq.com';
  const isLocalhost = rootDomain.includes('localhost');
  const protocol = isLocalhost ? 'http' : 'https';
  const listingUrl = landlordSubdomain ? `${protocol}://${rootDomain}/${landlordSubdomain}` : '';
  const contractorUrl = `${protocol}://${rootDomain}/sign-up?callbackUrl=${encodeURIComponent('/onboarding/contractor')}`;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const userId = session?.user?.id as string | undefined;
  const role = session?.user?.role;
  const isPlatformAdmin = role === 'superAdmin';

  const prismaAny = prisma as any;

  const cachedStats = await getCachedDashboardStats(landlordId, startOfMonth, startOfYear);

  const {
    propertiesCount,
    applicationsCount,
    tenantsCount,
    ticketsCount,
    totalUnits,
    occupiedUnits,
    urgentTickets,
    openTickets,
    rentPaidThisMonth,
    rentPaidYtd,
    scheduledRent,
    unpaidRent,
    recentLeases,
    recentApplications,
    recentTickets,
    leasesExpiringSoon,
    expiringLeaseDetails,
  } = cachedStats;

  // Fresh user-specific data
  const [openSupportThreads, threadParticipants] = await Promise.all([
    isPlatformAdmin
      ? prismaAny.thread.count({
          where: { type: { in: ['contact', 'support'] }, status: 'open' },
        })
      : Promise.resolve(0),
    userId
      ? prismaAny.threadParticipant.findMany({
          where: { userId },
          include: {
            thread: {
              include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  // No longer hard-block: show the dashboard with the setup wizard strip above it.
  // The onboarding page still exists for users who navigate to it directly.

  const totalUnitsSafe = Number(totalUnits || 0);
  const occupiedUnitsSafe = Number(occupiedUnits || 0);
  const vacantUnits = Math.max(totalUnitsSafe - occupiedUnitsSafe, 0);
  const occupancyRate = totalUnitsSafe > 0 ? Math.round((occupiedUnitsSafe / totalUnitsSafe) * 100) : 0;

  const rentCollectedThisMonth = Number(rentPaidThisMonth?._sum?.amount || 0);
  const rentCollectedYtd = Number(rentPaidYtd?._sum?.amount || 0);
  const scheduledRentMonthly = Number(scheduledRent?._sum?.rentAmount || 0);
  const collectionRate = scheduledRentMonthly > 0 ? Math.round((rentCollectedThisMonth / scheduledRentMonthly) * 100) : 0;
  const availableBalance = Number(unpaidRent?._sum?.amount || 0);

  type ThreadParticipantWithThread = {
    lastReadAt: Date | null;
    thread: { messages: { createdAt: Date }[] };
  };

  const unreadThreads = Array.isArray(threadParticipants)
    ? (threadParticipants as ThreadParticipantWithThread[]).filter((p) => {
        const lastMessage = p.thread?.messages?.[0];
        if (!lastMessage) return false;
        if (!p.lastReadAt) return true;
        return new Date(lastMessage.createdAt) > new Date(p.lastReadAt);
      }).length
    : 0;

  const messagesCount = isPlatformAdmin ? Number(openSupportThreads || 0) : unreadThreads;

  // Serialize dates for client component
  const serializedLeases = (recentLeases as any[]).map((l: any) => ({
    ...l,
    startDate: l.startDate instanceof Date ? l.startDate.toISOString() : String(l.startDate || ''),
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt || ''),
    rentAmount: Number(l.rentAmount || 0),
  }));

  const serializedApplications = (recentApplications as any[]).map((a: any) => ({
    ...a,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt || ''),
  }));

  const serializedTickets = (recentTickets as any[]).map((t: any) => ({
    ...t,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt || ''),
  }));

  const serializedExpiringLeases = (expiringLeaseDetails as any[]).map((l: any) => ({
    id: l.id,
    endDate: l.endDate instanceof Date ? l.endDate.toISOString() : String(l.endDate || ''),
    rentAmount: Number(l.rentAmount || 0),
    tenant: l.tenant,
    unit: l.unit,
  }));

  // Build monthly rent collection data for chart (last 6 months)
  const monthlyRentData: { month: string; collected: number; scheduled: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });

    const [collected, scheduled] = await Promise.all([
      prisma.rentPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          paidAt: { gte: d, lt: monthEnd },
          lease: { unit: { property: { landlordId } } },
        },
      }),
      // Use current scheduled rent as proxy for each month
      Promise.resolve(scheduledRentMonthly),
    ]);

    monthlyRentData.push({
      month: label,
      collected: Number(collected._sum?.amount || 0),
      scheduled: scheduledRentMonthly,
    });
  }

  // ── Setup wizard completion state ────────────────────────────────────────
  const landlordFull = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: {
      stripeConnectAccountId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      trialEndDate: true,
    },
  });

  const hasBank = Boolean(landlordFull?.stripeConnectAccountId);
  const hasPaid =
    !!landlordFull?.stripeSubscriptionId ||
    landlordFull?.subscriptionStatus === 'active';
  const trialDaysLeft = landlordFull?.trialEndDate
    ? Math.max(0, Math.ceil((landlordFull.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const wizardSteps: SetupWizardStep[] = [
    { id: 'property', done: propertiesCount > 0 },
    { id: 'tenant',   done: tenantsCount > 0 },
    { id: 'bank',     done: hasBank },
  ];

  // ── Tenant invite info (for the invite dialog) ───────────────────────────
  let tenantInviteInfo: { inviteCode: string; tenantStartUrl: string; landlordEmail: string } | null = null;
  try {
    let codeRecord = await prisma.landlordInviteCode.findFirst({
      where: {
        landlordId,
        propertyId: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { code: true },
    });

    if (!codeRecord) {
      const newCode = randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
      codeRecord = await prisma.landlordInviteCode.create({
        data: { landlordId, code: newCode, isActive: true },
        select: { code: true },
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'https://www.propertyflowhq.com';

    tenantInviteInfo = {
      inviteCode: codeRecord.code,
      tenantStartUrl: `${baseUrl}/tenant-start`,
      landlordEmail: session?.user?.email || '',
    };
  } catch {
    // Non-fatal — wizard will fall back to linking to /admin/tenants/add
  }

  return (
    <DashboardClient
      stats={{
        totalUnits: totalUnitsSafe,
        occupiedUnits: occupiedUnitsSafe,
        vacantUnits,
        occupancyRate,
        propertiesCount,
        tenantsCount,
        applicationsCount,
        ticketsCount,
        urgentTickets,
        openTickets,
        messagesCount,
        rentCollectedThisMonth,
        rentCollectedYtd,
        scheduledRentMonthly,
        collectionRate,
        availableBalance,
        leasesExpiringSoon,
      }}
      recentLeases={serializedLeases}
      recentApplications={serializedApplications}
      recentTickets={serializedTickets}
      expiringLeases={serializedExpiringLeases}
      monthlyRentData={monthlyRentData}
      listingUrl={listingUrl}
      contractorUrl={contractorUrl}
      landlordName={landlordName}
      isAdmin={isPlatformAdmin}
      wizardSteps={wizardSteps}
      trialDaysLeft={trialDaysLeft}
      isTrialing={!hasPaid}
      tenantInviteInfo={tenantInviteInfo}
    />
  );
};

export default AdminOverviewPage;
