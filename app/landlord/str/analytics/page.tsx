import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { TrendingUp, DollarSign, Percent, Calendar, PieChart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Analytics | Short-Term Rentals',
};

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
  });

  if (!landlord) {
    redirect('/onboarding/landlord');
  }

  // Placeholder data - will be real once schema is migrated
  const analytics = {
    revenue: {
      totalRevenue: 0,
      totalExpenses: 0,
      netRevenue: 0,
      totalBookings: 0,
      averageBookingValue: 0,
    },
    occupancy: {
      occupancyRate: 0,
      adr: 0,
      revpar: 0,
      totalDays: 30,
      occupiedNights: 0,
    },
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600 mb-1">Analytics</h1>
        <p className="text-sm text-gray-600">
          Performance insights and revenue analytics
        </p>
      </div>

      {/* Revenue Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black font-medium">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-black" />
            </div>
            <div className="text-2xl font-bold text-black">
              {formatCurrency(analytics.revenue.totalRevenue)}
            </div>
            <div className="text-xs text-black/70">This month</div>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black font-medium">Total Expenses</span>
              <TrendingUp className="h-4 w-4 text-black" />
            </div>
            <div className="text-2xl font-bold text-black">
              {formatCurrency(analytics.revenue.totalExpenses)}
            </div>
            <div className="text-xs text-black/70">This month</div>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black font-medium">Net Revenue</span>
              <DollarSign className="h-4 w-4 text-black" />
            </div>
            <div className="text-2xl font-bold text-black">
              {formatCurrency(analytics.revenue.netRevenue)}
            </div>
            <div className="text-xs text-black/70">Profit this month</div>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black font-medium">Avg Booking Value</span>
              <Calendar className="h-4 w-4 text-black" />
            </div>
            <div className="text-2xl font-bold text-black">
              {formatCurrency(analytics.revenue.averageBookingValue)}
            </div>
            <div className="text-xs text-black/70">{analytics.revenue.totalBookings} bookings</div>
          </div>
        </div>
      </div>

      {/* Occupancy Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black font-medium">Occupancy Rate</span>
              <Percent className="h-4 w-4 text-black" />
            </div>
            <div className="text-2xl font-bold text-black">
              {analytics.occupancy.occupancyRate.toFixed(1)}%
            </div>
            <div className="text-xs text-black/70">
              {analytics.occupancy.occupiedNights} of {analytics.occupancy.totalDays} nights
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black font-medium">ADR</span>
              <DollarSign className="h-4 w-4 text-black" />
            </div>
            <div className="text-2xl font-bold text-black">
              {formatCurrency(analytics.occupancy.adr)}
            </div>
            <div className="text-xs text-black/70">Average Daily Rate</div>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black font-medium">RevPAR</span>
              <TrendingUp className="h-4 w-4 text-black" />
            </div>
            <div className="text-2xl font-bold text-black">
              {formatCurrency(analytics.occupancy.revpar)}
            </div>
            <div className="text-xs text-black/70">Revenue Per Available Room</div>
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-black bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
            Revenue Trend
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <PieChart className="h-16 w-16 mx-auto mb-2" />
              <p className="text-sm">Chart will display once data is available</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-black bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5 text-blue-600" />
            Occupancy Trend
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <PieChart className="h-16 w-16 mx-auto mb-2" />
              <p className="text-sm">Chart will display once data is available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
