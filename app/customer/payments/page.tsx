import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { CustomerPaymentsList } from '@/components/customer/customer-payments-list';
import { DollarSign, CreditCard, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Payments & Invoices',
};

export default async function CustomerPaymentsPage() {
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

  // Fetch all invoices with payments
  const invoices = await prisma.contractorInvoice.findMany({
    where: { customerId: { in: customerIds } },
    include: {
      contractor: {
        select: {
          id: true,
          businessName: true,
          displayName: true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const outstandingInvoices = invoices.filter((inv) =>
    ['sent', 'viewed', 'partial'].includes(inv.status)
  );
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + Number(inv.amountDue),
    0
  );

  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  const totalPaid = paidInvoices.reduce(
    (sum, inv) => sum + Number(inv.total),
    0
  );

  const overdueInvoices = outstandingInvoices.filter(
    (inv) => new Date(inv.dueDate) < new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Payments & Invoices</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage your payments and view invoice history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-100">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-700 font-medium">Outstanding</p>
              <p className="text-3xl font-bold text-red-600">
                ${totalOutstanding.toFixed(0)}
              </p>
            </div>
          </div>
          <p className="text-xs text-red-600 mt-2">
            {outstandingInvoices.length} invoice{outstandingInvoices.length !== 1 ? 's' : ''} pending
            {overdueInvoices.length > 0 && ` (${overdueInvoices.length} overdue)`}
          </p>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Paid</p>
              <p className="text-3xl font-bold text-emerald-600">
                ${totalPaid.toFixed(0)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {paidInvoices.length} invoice{paidInvoices.length !== 1 ? 's' : ''} paid
          </p>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">All time</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Invoices</h3>
        </div>
        <div className="p-5">
          <CustomerPaymentsList invoices={invoices} />
        </div>
      </div>
    </div>
  );
}
