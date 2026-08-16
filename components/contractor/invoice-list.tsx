'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Eye,
  Send,
  Download,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  subtotal: any;
  taxRate: any;
  taxAmount: any;
  total: any;
  depositPaid: any;
  amountPaid: any;
  amountDue: any;
  status: string;
  sentAt: Date | null;
  viewedAt: Date | null;
  paidAt: Date | null;
  dueDate: Date;
  notes: string | null;
  terms: string | null;
  createdAt: Date;
};

export function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = invoices.filter((invoice) => {
    // Filter by status
    if (filter === 'draft' && invoice.status !== 'draft') return false;
    if (filter === 'sent' && invoice.status !== 'sent' && invoice.status !== 'viewed') return false;
    if (filter === 'paid' && invoice.status !== 'paid') return false;
    if (filter === 'overdue') {
      const isOverdue = (invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'partial') && 
        new Date(invoice.dueDate) < new Date();
      if (!isOverdue) return false;
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return invoice.invoiceNumber.toLowerCase().includes(search);
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

  const getInvoiceStatus = (invoice: Invoice) => {
    if (invoice.status === 'paid') return 'paid';
    if (invoice.status === 'draft') return 'draft';
    if (invoice.status === 'cancelled') return 'cancelled';
    
    const isOverdue = new Date(invoice.dueDate) < new Date();
    if (isOverdue) return 'overdue';
    
    return invoice.status;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by invoice number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

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
          All ({invoices.length})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'draft'
              ? 'bg-gray-100 text-gray-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Draft ({invoices.filter((i) => i.status === 'draft').length})
        </button>
        <button
          onClick={() => setFilter('sent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'sent'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Sent ({invoices.filter((i) => i.status === 'sent' || i.status === 'viewed').length})
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
                (i.status === 'sent' || i.status === 'viewed' || i.status === 'partial') &&
                new Date(i.dueDate) < new Date()
            ).length
          }
          )
        </button>
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 mb-4">No invoices found</p>
          <Link href="/contractor-dashboard/invoices/new">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              Create Your First Invoice
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => {
            const displayStatus = getInvoiceStatus(invoice);
            const isOverdue = displayStatus === 'overdue';

            return (
              <div
                key={invoice.id}
                className={`rounded-lg border-2 ${
                  isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                } hover:border-blue-300 hover:shadow-md transition-all p-4`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Invoice Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 rounded-lg bg-blue-100 flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          Invoice #{invoice.invoiceNumber}
                        </h4>
                        <Badge className={statusColors[displayStatus]}>
                          {displayStatus}
                        </Badge>
                        {isOverdue && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        {invoice.sentAt && (
                          <div className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            <span>Sent: {new Date(invoice.sentAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        {invoice.paidAt && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>Paid: {new Date(invoice.paidAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(Number(invoice.total))}
                    </p>
                    {Number(invoice.amountDue) > 0 && invoice.status !== 'paid' && (
                      <p className="text-sm text-red-600 font-medium mt-1">
                        Due: {formatCurrency(Number(invoice.amountDue))}
                      </p>
                    )}
                    {Number(invoice.amountPaid) > 0 && (
                      <p className="text-sm text-emerald-600 font-medium mt-1">
                        Paid: {formatCurrency(Number(invoice.amountPaid))}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t-2 border-gray-100">
                  <Link href={`/contractor-dashboard/invoices/${invoice.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-2 border-gray-200"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </Link>
                  {invoice.status === 'draft' && (
                    <Link href={`/contractor-dashboard/invoices/${invoice.id}/edit`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-gray-200"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-200"
                  >
                    <Download className="h-3 w-3 mr-1" />
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
