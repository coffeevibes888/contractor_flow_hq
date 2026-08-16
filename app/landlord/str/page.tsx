import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import {
  Home,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  Sparkles,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Short-Term Rentals | Property Management',
  description: 'Manage your Airbnb, VRBO, and short-term rental properties',
};

export default async function ShortTermRentalDashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Get landlord profile
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
  });

  if (!landlord) {
    redirect('/onboarding/landlord');
  }

  // Date ranges
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Fetch STR stats (placeholder - will be real data once schema is migrated)
  const stats = {
    totalProperties: 0,
    activeBookings: 0,
    upcomingCheckIns: 0,
    revenueThisMonth: 0,
    revenueThisYear: 0,
    occupancyRate: 0,
    avgDailyRate: 0,
    totalGuests: 0,
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 mb-1">
            Short-Term Rentals
          </h1>
          <p className="text-sm text-gray-600">
            Manage your Airbnb, VRBO, and vacation rental properties
          </p>
        </div>
        <Link
          href="/landlord/str/properties/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="relative rounded-2xl border border-black shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-400 to-blue-500" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Dashboard Overview</h3>
            <span className="text-xs text-white/80">
              {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Properties */}
            <Link
              href="/landlord/str/properties"
              className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 space-y-1 shadow-2xl border border-slate-100 hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-black font-medium">Total Properties</div>
                <Home className="h-4 w-4 text-black" />
              </div>
              <div className="text-3xl font-bold text-black">{stats.totalProperties}</div>
              <div className="text-xs text-black">Active listings</div>
            </Link>

            {/* Active Bookings */}
            <Link
              href="/landlord/str/bookings"
              className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 space-y-1 shadow-2xl border border-slate-100 hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-black font-medium">Active Bookings</div>
                <Calendar className="h-4 w-4 text-black" />
              </div>
              <div className="text-3xl font-bold text-black">{stats.activeBookings}</div>
              <div className="text-xs text-black">{stats.upcomingCheckIns} checking in soon</div>
            </Link>

            {/* Revenue This Month */}
            <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 space-y-1 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-black font-medium">Revenue (Month)</div>
                <DollarSign className="h-4 w-4 text-black" />
              </div>
              <div className="text-3xl font-bold text-black">
                {formatCurrency(stats.revenueThisMonth)}
              </div>
              <div className="text-xs text-black">
                {formatCurrency(stats.revenueThisYear)} YTD
              </div>
            </div>

            {/* Occupancy Rate */}
            <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 space-y-1 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-black font-medium">Occupancy Rate</div>
                <Percent className="h-4 w-4 text-black" />
              </div>
              <div className="text-3xl font-bold text-black">{stats.occupancyRate}%</div>
              <div className="text-xs text-black">This month</div>
            </div>

            {/* Average Daily Rate */}
            <div className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 space-y-1 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-black font-medium">Avg Daily Rate</div>
                <TrendingUp className="h-4 w-4 text-black" />
              </div>
              <div className="text-3xl font-bold text-black">
                {formatCurrency(stats.avgDailyRate)}
              </div>
              <div className="text-xs text-black">Per night</div>
            </div>

            {/* Total Guests */}
            <Link
              href="/landlord/str/guests"
              className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 space-y-1 shadow-2xl border border-slate-100 hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-black font-medium">Total Guests</div>
                <Users className="h-4 w-4 text-black" />
              </div>
              <div className="text-3xl font-bold text-black">{stats.totalGuests}</div>
              <div className="text-xs text-black">All time</div>
            </Link>

            {/* Quick Actions */}
            <Link
              href="/landlord/str/calendar"
              className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 space-y-1 shadow-2xl border border-slate-100 hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-black font-medium">Calendar</div>
                <Calendar className="h-4 w-4 text-black" />
              </div>
              <div className="text-lg font-bold text-black">View Calendar</div>
              <div className="text-xs text-black">Manage availability</div>
            </Link>

            {/* Analytics */}
            <Link
              href="/landlord/str/analytics"
              className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 p-4 space-y-1 shadow-2xl border border-slate-100 hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-black font-medium">Analytics</div>
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <div className="text-lg font-bold text-black">View Reports</div>
              <div className="text-xs text-black">Performance insights</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/landlord/str/properties"
          className="group rounded-xl border border-black bg-white p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Home className="h-8 w-8 text-violet-600" />
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Properties</h3>
          <p className="text-sm text-gray-600">
            Manage your short-term rental listings, photos, and descriptions
          </p>
        </Link>

        <Link
          href="/landlord/str/bookings"
          className="group rounded-xl border border-black bg-white p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Bookings</h3>
          <p className="text-sm text-gray-600">
            View and manage reservations from all platforms
          </p>
        </Link>

        <Link
          href="/landlord/str/calendar"
          className="group rounded-xl border border-black bg-white p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Calendar className="h-8 w-8 text-emerald-600" />
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Calendar</h3>
          <p className="text-sm text-gray-600">
            Manage availability and block dates across all properties
          </p>
        </Link>

        <Link
          href="/landlord/str/guests"
          className="group rounded-xl border border-black bg-white p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="h-8 w-8 text-amber-600" />
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Guests</h3>
          <p className="text-sm text-gray-600">
            View guest profiles, history, and communication
          </p>
        </Link>

        <Link
          href="/landlord/str/expenses"
          className="group rounded-xl border border-black bg-white p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="h-8 w-8 text-rose-600" />
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Expenses</h3>
          <p className="text-sm text-gray-600">
            Track cleaning, maintenance, and operating expenses
          </p>
        </Link>

        <Link
          href="/landlord/str/cleaning"
          className="group rounded-xl border border-black bg-white p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Sparkles className="h-8 w-8 text-cyan-600" />
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Cleaning</h3>
          <p className="text-sm text-gray-600">
            Schedule and manage cleaning between guest stays
          </p>
        </Link>
      </div>

      {/* Getting Started */}
      {stats.totalProperties === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Get Started with Short-Term Rentals
          </h3>
          <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
            Add your first property to start managing bookings, tracking revenue, and
            automating your short-term rental business.
          </p>
          <Link
            href="/landlord/str/properties/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Add Your First Property
          </Link>
        </div>
      )}
    </div>
  );
}
