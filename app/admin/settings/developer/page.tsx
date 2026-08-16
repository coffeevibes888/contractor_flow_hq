import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { DeveloperSettings } from '@/components/admin/settings/developer-settings';
import { getCurrentLandlordSubscription } from '@/lib/actions/subscription.actions';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Developer Settings - API Keys & Webhooks',
};

export default async function DeveloperSettingsPage() {
  await requireAdmin();

  // Check if user has Enterprise subscription
  const subscriptionData = await getCurrentLandlordSubscription();
  
  if (!subscriptionData.success || subscriptionData.currentTier !== 'enterprise') {
    redirect('/admin/settings/subscription?upgrade=enterprise');
  }

  return (
    <main className="w-full px-4 py-10 md:px-0">
      <div className="max-w-6xl mx-auto">
        <DeveloperSettings />
      </div>
    </main>
  );
}
