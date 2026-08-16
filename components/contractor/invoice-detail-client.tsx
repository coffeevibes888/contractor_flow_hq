'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Send,
  DollarSign,
  Download,
  Edit,
  Trash2,
  Calendar,
  Mail,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { PaymentRecordModal } from './payment-record-modal';

type InvoiceDetailClientProps = {
  invoice: any;
};

export function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sending, setSending] = useState(false);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-violet-100 text-violet-700',
    partial: 'bg-amber-100 text-amber-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };

  const isOverdue =
    (invoice.status === 'sent' ||
      invoice.status === 'viewed' ||
      invoice.status === 'partial') &&
    new Date(invoice.dueDate) < new Date();

  const displayStatus = isOverdue ? 'overdue' : invoice.status;

  const handleSend = async () => {
    setSending(true);
    try {
      const response = await fetch(`/api/contractor/invoices/${invoice.id}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
    } finally {
      setSending(false);
    }
  };

  const handlePaymentSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/contractor-dashboard/invoices"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-blue-600">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <Badge className={statusColors[displayStatus]}>
              {displayStatus}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Created {new Date(invoice.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <>
              <Link href={`/contractor-dashboard/invoices/${invoice.id}/edit`}>
                <Button variant="outline" className="border-2 border-gray-200">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-2 border-black shadow-lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send Invoice'}
              </Button>
            </>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button
              onClick={() => setShowPaymentModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-2 border-black shadow-lg"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
          <Button variant="outline" className="border-2 border-gray-200">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Line Items */}
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {invoice.lineItems.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.quantity} × {formatCurrency(item.unitPrice)} ({item.type})
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 pt-6 border-t-2 border-gray-200">
                <div className="max-w-md ml-auto space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(Number(invoice.subtotal))}
                    </span>
                  </div>
                  {invoice.taxRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Tax ({Number(invoice.taxRate)}%):
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(Number(invoice.taxAmount))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-200">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-blue-600">
                      {formatCurrency(Number(invoice.total))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Payment History
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {invoice.payments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 border border-emerald-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(Number(payment.amount))}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payment.method} •{' '}
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                          {payment.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Status */}
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Payment Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(Number(invoice.total))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid:</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(Number(invoice.amountPaid))}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-200">
                <span className="text-gray-900">Due:</span>
                <span className={Number(invoice.amountDue) > 0 ? 'text-red-600' : 'text-emerald-600'}>
                  {formatCurrency(Number(invoice.amountDue))}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {invoice.sentAt && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Send className="h-4 w-4" />
                  <div>
                    <p className="text-xs text-gray-500">Sent</p>
                    <p className="font-medium text-gray-900">
                      {new Date(invoice.sentAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  <div>
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="font-medium text-gray-900">
                      {new Date(invoice.paidAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs text-gray-500">Payment Terms</p>
                  <p className="font-medium text-gray-900">{invoice.terms}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentRecordModal
        invoice={invoice}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
