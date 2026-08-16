import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import {
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  MessageSquare,
  Star,
  Clock,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Customer Dashboard',
};

export default async function CustomerDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Get user's customer records
  const customerRecords = await prisma.contractorCustomer.findMany({
    where: { userId: session.user.id },
    select: { id: true, contractorId: true },
  });

  if (customerRecords.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Briefcase className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Active Projects
          </h2>
          <p className="text-gray-600 mb-6">
            You don't have any active projects with contractors yet.
          </p>
          <Link href="/contractor-marketplace">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              Find Contractors
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const customerIds = customerRecords.map((c) => c.id);

  // Fetch dashboard data
  const [activeJobs, pendingQuotes, invoices, upcomingAppointments, recentMessages] =
    await Promise.all([
      // Active jobs
      prisma.contractorJob.findMany({
        where: {
          customerId: { in: customerIds },
          status: { in: ['approved', 'scheduled', 'in_progress'] },
        },
        include: {
          contractor: {
            select: {
              businessName: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Pending quotes
      prisma.contractorQuote.findMany({
        where: {
          customerId: { in: customerIds },
          status: 'pending',
        },
        include: {
          contractor: {
            select: {
              businessName: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Outstanding invoices
      prisma.contractorInvoice.findMany({
        where: {
          customerId: { in: customerIds },
          status: { in: ['sent', 'viewed', 'partial'] },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // Upcoming appointments (placeholder - would need appointment model)
      Promise.resolve([]),

      // Recent messages (placeholder - would need message model)
      Promise.resolve([]),
    ]);

  // Calculate stats
  const totalActiveJobs = activeJobs.length;
  const totalPendingQuotes = pendingQuotes.length;
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + Number(inv.amountDue),
    0
  );

  // Get total spent
  const completedJobs = await prisma.contractorJob.aggregate({
    where: {
      customerId: { in: customerIds },
      status: { in: ['completed', 'paid'] },
    },
    _sum: { actualCost: true },
  });

  const totalSpent = Number(completedJobs._sum.actualCost || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Customer Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage your projects and communicate with contractors
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/customer/jobs">
          <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalActiveJobs}</p>
                <p className="text-sm text-gray-600">Active Jobs</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/customer/quotes">
          <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <FileText className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalPendingQuotes}</p>
                <p className="text-sm text-gray-600">Pending Quotes</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/customer/payments">
          <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalSpent.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600">Total Spent</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/customer/appointments">
          <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {upcomingAppointments.length}
                </p>
                <p className="text-sm text-gray-600">Appointments</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/customer/quotes">
            <Button
              variant="outline"
              className="w-full border-2 border-gray-200 h-auto py-4 flex-col gap-2"
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm">View Quotes</span>
            </Button>
          </Link>
          <Link href="/customer/payments">
            <Button
              variant="outline"
              className="w-full border-2 border-gray-200 h-auto py-4 flex-col gap-2"
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-sm">Make Payment</span>
            </Button>
          </Link>
          <Link href="/customer/messages">
            <Button
              variant="outline"
              className="w-full border-2 border-gray-200 h-auto py-4 flex-col gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm">Messages</span>
            </Button>
          </Link>
          <Link href="/contractor-marketplace">
            <Button
              variant="outline"
              className="w-full border-2 border-gray-200 h-auto py-4 flex-col gap-2"
            >
              <Star className="h-5 w-5" />
              <span className="text-sm">Find Contractors</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Active Jobs</h3>
            <Link
              href="/customer/jobs"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/customer/jobs/${job.id}`}
                  className="block p-4 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {job.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {job.contractor.businessName || job.contractor.displayName}
                      </p>
                    </div>
                    <Badge
                      className={
                        job.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : job.status === 'scheduled'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }
                    >
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Quotes */}
      {pendingQuotes.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 shadow-sm">
          <div className="p-5 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Quotes Awaiting Your Response
              </h3>
            </div>
            <Link
              href="/customer/quotes"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {pendingQuotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/customer/quotes/${quote.id}`}
                  className="block p-4 rounded-lg bg-white hover:bg-gray-50 border-2 border-amber-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {quote.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {quote.contractor.businessName || quote.contractor.displayName}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(Number(quote.totalPrice))}
                      </p>
                      <p className="text-xs text-amber-600 font-medium">
                        Awaiting response
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Outstanding Invoices */}
      {invoices.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 shadow-sm">
          <div className="p-5 border-b border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Outstanding Invoices
              </h3>
            </div>
            <Link
              href="/customer/payments"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/customer/payments/${invoice.id}`}
                  className="block p-4 rounded-lg bg-white hover:bg-gray-50 border-2 border-red-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Invoice #{invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Due {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(Number(invoice.amountDue))}
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                      >
                        Pay Now
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
