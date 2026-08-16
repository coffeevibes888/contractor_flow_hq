import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import Link from 'next/link';
import MainNav from './main-nav';
import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import MobileMenu from '@/components/mobile/mobile-menu';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import { SubscriptionProvider } from '@/components/subscription/subscription-provider';
import { AdminSidebarWrapper } from '@/components/admin/admin-sidebar-wrapper';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { TeamChatWidgetWrapper } from '@/components/team/team-chat-widget-wrapper';
import { PayoutSetupReminder } from '@/components/admin/payout-setup-reminder';
import { TrialBanner } from '@/components/admin/trial-banner';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { syncLandlordSubscriptionFromStripe } from '@/lib/actions/subscription-sync';
import { ensureRoleForContext } from '@/lib/actions/role-assignment';
import AnalyticsProvider from '@/components/analytics-provider';
import { Suspense } from 'react';

export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params?: unknown;
}>) {
  // Backstop role check: if a user reached /admin/* with role='user' (e.g.,
  // their original sign-up flow's hidden role input was lost), promote them
  // here before SubscriptionGate runs. Idempotent — does nothing for users
  // already correctly set up. This prevents the dashboard redirect-loop
  // regardless of which signup path got them here.
  await ensureRoleForContext('landlord');

  // If arriving from a successful Stripe checkout, sync the subscription into
  // the DB *before* SubscriptionGate runs. We call the shared server action
  // directly (not a self-fetch) so this always runs with the landlord's own
  // session and isn't blocked by SERVER_URL / cookie quirks in dev.
  const headersList = await headers();
  const referer = headersList.get('referer') || '';

  // Sync subscription from Stripe when the user is returning from checkout.
  // This is a DB-write optimization only — it is NOT used to grant access.
  // SubscriptionGate below makes its own DB-backed decision independently.
  if (referer.includes('checkout.stripe.com')) {
    try {
      const session = await auth();
      if (session?.user?.id) {
        const landlord = await prisma.landlord.findFirst({
          where: { ownerUserId: session.user.id },
          select: { id: true },
        });
        if (landlord) {
          await syncLandlordSubscriptionFromStripe(landlord.id);
        }
      }
    } catch {
      // Non-fatal — the page-level sync will still run as a fallback
    }
  }

  // Ensure user has active trial or subscription before accessing admin dashboard.
  // Expired trial redirects to /admin/billing (the card wall lives there now).
  await SubscriptionGate({ role: 'landlord', redirectTo: '/admin/billing?reason=trial_ended' });

  return (
    <SessionProviderWrapper>
      <Suspense fallback={null}>
        <AnalyticsProvider />
      </Suspense>
      <SubscriptionProvider>
        <div className='flex min-h-screen flex-col bg-white'>
          <Header />
          <div className='flex flex-1 text-black'>
            {/* Collapsible Sidebar */}
            <AdminSidebarWrapper>
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
                  <span className='text-sm text-black'>Properties, tenants & rent</span>
                </div>
              </div>
              <MainNav className='flex-1' />
            </AdminSidebarWrapper>

            {/* Content - Mobile Responsive */}
            <div className='flex-1 flex flex-col min-w-0'>
              {/* Trial countdown banner — hidden once Stripe subscription is active */}
              <TrialBanner />
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
        <PayoutSetupReminder />
      </SubscriptionProvider>
    </SessionProviderWrapper>
  );
}
