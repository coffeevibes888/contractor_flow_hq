import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import { ContractorSidebarWrapper } from '@/components/contractor/contractor-sidebar-wrapper';
import ContractorMainNav from './main-nav';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { TeamChatWidgetWrapper } from '@/components/team/team-chat-widget-wrapper';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { syncContractorSubscriptionFromStripe } from '@/lib/actions/contractor-subscription-sync';
import { ensureRoleForContext } from '@/lib/actions/role-assignment';
import AnalyticsProvider from '@/components/analytics-provider';
import { Suspense } from 'react';

export default async function ContractorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Backstop role check: if a user reached /contractor-dashboard/* with
  // role='user' (e.g., signup hidden role input was lost), promote them
  // here before SubscriptionGate runs. Idempotent — does nothing for users
  // already correctly set up. Safety: it only promotes from 'user'/null,
  // so a real tenant or contractor_employee here is handled by the gate
  // below as before.
  await ensureRoleForContext('contractor');

  // If arriving from a successful Stripe checkout, sync the contractor's
  // subscription into the DB *before* SubscriptionGate runs. We call the
  // shared server action directly (not a self-fetch) so this always runs
  // with the user's own session and is independent of webhook delivery.
  const headersList = await headers();
  const referer = headersList.get('referer') || '';
  const isFromStripeCheckout = referer.includes('checkout.stripe.com');

  if (isFromStripeCheckout) {
    try {
      const session = await auth();
      if (session?.user?.id) {
        let contractorId: string | null = null;
        if (session.user.role === 'contractor_employee') {
          const employee = await prisma.contractorEmployee.findFirst({
            where: { userId: session.user.id, status: 'active' },
            select: { contractorId: true },
          });
          contractorId = employee?.contractorId ?? null;
        } else {
          const profile = await prisma.contractorProfile.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
          });
          contractorId = profile?.id ?? null;
        }
        if (contractorId) {
          await syncContractorSubscriptionFromStripe(contractorId);
        }
      }
    } catch {
      // Non-fatal — page-level handling will still kick in if needed.
    }
  }

  // Ensure user has active subscription before accessing contractor dashboard
  await SubscriptionGate({ role: 'contractor', redirectTo: '/onboarding/contractor/subscription' });
  return (
    <SessionProviderWrapper>
      <Suspense fallback={null}>
        <AnalyticsProvider />
      </Suspense>
      <div className='flex min-h-screen flex-col bg-white'>
        <Header />
        <div className='flex flex-1'>
          {/* Collapsible Sidebar */}
          <ContractorSidebarWrapper>
            <div className='flex items-center gap-3 px-2 p-2'>
              <div className='relative h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center bg-white/10'>
                <Image
                  src='/images/logo.svg'
                  height={40}
                  width={40}
                  alt={APP_NAME}
                  className='object-contain filter brightness-0 invert'
                />
              </div>
              <div className='flex flex-col sidebar-expanded-only'>
                <span className='text-sm text-black'>Contractor Portal</span>
              </div>
            </div>
            <ContractorMainNav className='flex-1' />
          </ContractorSidebarWrapper>

          {/* Content - Mobile Responsive */}
          <div className='flex-1 flex flex-col min-w-0'>
            <main className='flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 md:py-6 bg-gray-50/50'>
              <div className='mx-auto max-w-7xl w-full'>
                {children}
              </div>
            </main>
          </div>
        </div>
        <Footer />
      </div>
      <TeamChatWidgetWrapper />
    </SessionProviderWrapper>
  );
}
