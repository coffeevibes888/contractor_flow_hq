import { Suspense } from 'react';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOrderSummary } from '@/lib/actions/order-actions';
import { getAnalyticsOverview } from '@/lib/actions/analytics.actions';
import { getSuperAdminInsights, listUsersForSuperAdmin, listLandlordsForSuperAdmin } from '@/lib/actions/super-admin.actions';
import { convertToPlainObject } from '@/lib/utils';
import SuperAdminDashboard from './super-admin-dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Super Admin',
};

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ recentLimit?: string }>;
}) {
  const session = await auth();

  if (!session) {
    return redirect('/sign-in');
  }

  // Check if user is superAdmin before loading data
  if (session.user?.role !== 'superAdmin') {
    return redirect('/unauthorized');
  }

  const params = await searchParams;
  const recentLimit = Math.min(Math.max(parseInt(params.recentLimit || '50', 10) || 50, 25), 250);

  try {
    const [summary, analytics, insights, users, landlords] = await Promise.all([
      getOrderSummary(),
      getAnalyticsOverview(recentLimit),
      getSuperAdminInsights(),
      listUsersForSuperAdmin(),
      listLandlordsForSuperAdmin(),
    ]);

    const serializedSummary = convertToPlainObject(summary);
    const serializedAnalytics = convertToPlainObject(analytics);
    const serializedInsights = convertToPlainObject(insights);
    const serializedUsers = convertToPlainObject(users);
    const serializedLandlords = convertToPlainObject(landlords);

    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-white">Loading...</div></div>}>
        <SuperAdminDashboard
          userEmail={session.user.email || ''}
          summary={serializedSummary}
          analytics={serializedAnalytics}
          insights={serializedInsights as any}
          users={serializedUsers as any}
          landlords={serializedLandlords as any}
          currentUser={session.user}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Super Admin page error:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Error Loading Dashboard</h1>
          <p className="text-white/70">There was an error loading the super admin dashboard.</p>
          <p className="text-sm text-white/50">Check the server logs for more details.</p>
        </div>
      </div>
    );
  }
}
