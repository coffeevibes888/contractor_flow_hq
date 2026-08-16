import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { CustomerQuotesList } from '@/components/customer/customer-quotes-list';

export const metadata: Metadata = {
  title: 'My Quotes',
};

export default async function CustomerQuotesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Get user's customer records
  const customerRecords = await prisma.contractorCustomer.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (customerRecords.length === 0) {
    redirect('/customer/dashboard');
  }

  const customerIds = customerRecords.map((c) => c.id);

  // Fetch all quotes
  const quotes = await prisma.contractorQuote.findMany({
    where: { customerId: { in: customerIds } },
    include: {
      contractor: {
        select: {
          id: true,
          businessName: true,
          displayName: true,
          avgRating: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const pendingQuotes = quotes.filter((q) => q.status === 'pending').length;
  const acceptedQuotes = quotes.filter((q) => q.status === 'accepted').length;
  const totalQuoteValue = quotes
    .filter((q) => q.status === 'pending')
    .reduce((sum, q) => sum + Number(q.totalPrice), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">My Quotes</h1>
        <p className="text-sm text-gray-600 mt-1">
          Review and respond to contractor quotes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-700 mb-1 font-medium">Awaiting Response</p>
          <p className="text-3xl font-bold text-amber-600">{pendingQuotes}</p>
        </div>
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Accepted</p>
          <p className="text-3xl font-bold text-emerald-600">{acceptedQuotes}</p>
        </div>
        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Pending Value</p>
          <p className="text-3xl font-bold text-gray-900">
            ${totalQuoteValue.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Quotes List */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Quotes</h3>
        </div>
        <div className="p-5">
          <CustomerQuotesList quotes={quotes} />
        </div>
      </div>
    </div>
  );
}
