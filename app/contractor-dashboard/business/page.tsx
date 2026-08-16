import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { MyBusinessTabs } from '@/components/contractor/my-business-tabs';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function MyBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    stripeConnectAccountId: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  const params = await searchParams;
  const activeTab = params.tab || 'portfolio';

  const [portfolioItems, disputes] = await Promise.all([
    prisma.contractorPortfolioItem.findMany({
      where: { contractorId: contractorProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.dispute.findMany({
      where: {
        OR: [
          { filedById: session.user.id },
          { contractorId: contractorProfile.id },
        ],
      },
      include: {
        filedBy: { select: { name: true, email: true } },
        landlord: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const workOrders = await prisma.workOrder.findMany({
    where: { contractorId: contractorProfile.id },
    select: { landlord: { select: { id: true, name: true } } },
    distinct: ['landlordId'],
  });

  const landlords = await Promise.all(
    workOrders.map(async (wo) => {
      const count = await prisma.workOrder.count({
        where: { contractorId: contractorProfile.id, landlordId: wo.landlord.id },
      });
      return { ...wo.landlord, email: '', _count: { workOrders: count } };
    })
  );

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>My Business</h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
          Manage your portfolio, relationships, and business operations
        </p>
      </div>

      <MyBusinessTabs
        activeTab={activeTab}
        portfolioItems={portfolioItems}
        landlords={landlords}
        disputes={disputes}
        payouts={[]}
        contractorId={contractorProfile.id}
        hasStripeAccount={!!contractorProfile.stripeConnectAccountId}
      />
    </div>
  );
}
