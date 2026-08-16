'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Calendar,
  Eye,
  Download,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: any;
  amountDue: any;
  dueDate: Date;
  createdAt: Date;
  contractor: {
    id: string;
    businessName: string | null;
    displayName: string | null;
  };
  payments: Array<{
    id: string;
    amount: any;
    createdAt: Date;
    method: string | null;
  }>;
};

export function CustomerPaymentsList({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'paid' | 'overdue'>('all');
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'outstanding') {
      return ['sent', 'viewed', 'partial'].includes(invoice.status);
    }
    if (filter === 'paid') {
      return invoice.status === 'paid';
    }
    if (filter === 'overdue') {
      return (
        ['sent', 'viewed', 'partial'].includes(invoice.status) &&
        new Date(invoice.dueDate) < new Date()
      );
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-violet-100 text-violet-700',
    partial: 'bg-amber-100 text-amber-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };

  const isOverdue = (invoice: Invoice) => {
    return (
      ['sent', 'viewed', 'partial'].includes(invoice.status) &&
      new Date(invoice.dueDate) < new Date()
    );
  };

  const handlePayNow = async (invoiceId: string) => {
    setPayingInvoice(invoiceId);
    // Redirect to payment page
    router.push(`/customer/payments/${invoiceId}/pay`);
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setFilter('outstanding')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'outstanding'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Outstanding (
          {invoices.filter((i) => ['sent', 'viewed', 'partial'].includes(i.status)).length}
          )
        </button>
        <button
          onClick={() => setFilter('paid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'paid'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Paid ({invoices.filter((i) => i.status === 'paid').length})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'overdue'
              ? 'bg-red-100 text-red-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Overdue (
          {
            invoices.filter(
              (i) =>
                ['sent', 'viewed', 'partial'].includes(i.status) &&
                new Date(i.dueDate) < new Date()
            ).length
          }
          )
        </button>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No invoices found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => {
            const overdue = isOverdue(invoice);
            const displayStatus = overdue ? 'overdue' : invoice.status;
            const isPending = ['sent', 'viewed', 'partial'].includes(invoice.status);

            return (
              <div
                key={invoice.id}
                className={`rounded-lg border-2 ${
                  overdue
                    ? 'border-red-200 bg-red-50'
                    : isPending
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-200 bg-white'
                } hover:shadow-md transition-all p-5`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Invoice #{invoice.invoiceNumber}
                      </h4>
                      <Badge className={statusColors[displayStatus]}>
                        {displayStatus}
                      </Badge>
                      {overdue && (
                        <Badge className="bg-red-100 text-red-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {invoice.contractor.businessName || invoice.contractor.displayName}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Issued {new Date(invoice.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span className={overdue ? 'text-red-600 font-medium' : ''}>
                          Due {new Date(invoice.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      {invoice.payments.length > 0 && (
                        <span className="text-emerald-600 font-medium">
                          {invoice.payments.length} payment{invoice.payments.length !== 1 ? 's' : ''} made
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isPending ? (
                      <>
                        <p className="text-xs text-gray-500 mb-1">Amount Due</p>
                        <p className="text-3xl font-bold text-red-600">
                          {formatCurrency(Number(invoice.amountDue))}
                        </p>
                        {invoice.status === 'partial' && (
                          <p className="text-xs text-gray-500 mt-1">
                            of {formatCurrency(Number(invoice.total))}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {formatCurrency(Number(invoice.total))}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                  <Link href={`/customer/payments/${invoice.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-2 border-gray-200"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                  {isPending && (
                    <Button
                      onClick={() => handlePayNow(invoice.id)}
                      disabled={payingInvoice === invoice.id}
                      size="sm"
                      className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {payingInvoice === invoice.id ? 'Processing...' : 'Pay Now'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
