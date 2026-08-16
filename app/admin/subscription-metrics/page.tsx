import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SubscriptionMetricsDashboard } from './subscription-metrics-dashboard';

export const metadata: Metadata = {
  title: 'Subscription Metrics | Admin Dashboard',
  description: 'Monitor subscription performance and analytics',
};

export default async function SubscriptionMetricsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  // Check if user is admin
  // TODO: Add proper admin role check
  // if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
  //   redirect('/unauthorized');
  // }

  return <SubscriptionMetricsDashboard />;
}
