'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  contractor: {
    businessName: string;
    email: string;
    phone?: string;
    logoUrl?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    type: string;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  depositPaid: number;
  status: string;
  dueDate: string;
  createdAt: string;
  notes?: string;
  terms?: string;
}

export default function InvoicePaymentPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [token]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/pay/invoice/${token}`);
      if (!response.ok) {
        throw new Error('Invoice not found');
      }
      const data = await response.json();
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaying(true);
    try {
      const response = await fetch(`/api/pay/invoice/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: invoice?.amountDue }),
      });

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      const data = await response.json();
      
      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || 'Invoice not found'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                {invoice.contractor.logoUrl && (
                  <img 
                    src={invoice.contractor.logoUrl} 
                    alt="Logo" 
                    className="h-16 mb-4"
                  />
                )}
                <CardTitle className="text-2xl">{invoice.contractor.businessName}</CardTitle>
                <CardDescription>
                  {invoice.contractor.email}
                  {invoice.contractor.phone && ` • ${invoice.contractor.phone}`}
                </CardDescription>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold">INVOICE</h1>
                <p className="text-sm text-gray-600">{invoice.invoiceNumber}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  isPaid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.status.toUpperCase()}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Invoice Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Invoice Date</p>
                <p className="font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Due Date</p>
                <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 capitalize">{item.type}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({invoice.taxRate}%):</span>
                  <span className="font-medium">${invoice.taxAmount.toFixed(2)}</span>
                </div>
              )}
              {invoice.depositPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Deposit Paid:</span>
                  <span className="font-medium">-${invoice.depositPaid.toFixed(2)}</span>
                </div>
              )}
              {invoice.amountPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium">-${invoice.amountPaid.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Amount Due:</span>
                <span>${invoice.amountDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}

            {/* Terms */}
            {invoice.terms && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Terms & Conditions</h3>
                <p className="text-sm text-gray-700">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Button */}
        {!isPaid && invoice.amountDue > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handlePayment} 
                disabled={paying}
                className="w-full"
                size="lg"
              >
                {paying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${invoice.amountDue.toFixed(2)} Now`
                )}
              </Button>
              <p className="text-xs text-center text-gray-500 mt-4">
                Secure payment powered by Stripe
              </p>
            </CardContent>
          </Card>
        )}

        {isPaid && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Invoice Paid</h3>
                <p className="text-gray-600">This invoice has been paid in full.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
