'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Save, Send, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UpgradeModal } from '@/components/contractor/subscription/UpgradeModal';
import { Alert, AlertDescription } from '@/components/ui/alert';

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'labor' | 'material' | 'other';
};

type InvoiceFormProps = {
  invoice?: any;
  mode: 'create' | 'edit';
};

export function InvoiceForm({ invoice, mode }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{
    current: number;
    limit: number;
    remaining: number;
    percentage: number;
    tier: string;
  } | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState(invoice?.customerId || '');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [terms, setTerms] = useState(invoice?.terms || 'Net 30');
  const [taxRate, setTaxRate] = useState(invoice?.taxRate ? Number(invoice.taxRate) : 0);
  
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems || [
      { id: '1', description: '', quantity: 1, unitPrice: 0, type: 'labor' },
    ]
  );

  // Fetch limit info on mount (only for create mode)
  useEffect(() => {
    if (mode === 'create') {
      const fetchLimitInfo = async () => {
        try {
          const response = await fetch('/api/contractor/subscription/check-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature: 'invoicesPerMonth' }),
          });

          if (response.ok) {
            const data = await response.json();
            setLimitInfo(data);
          }
        } catch (error) {
          console.error('Error fetching limit info:', error);
        }
      };

      fetchLimitInfo();
    }
  }, [mode]);

  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        type: 'labor',
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (status: 'draft' | 'sent') => {
    setLoading(true);
    setError('');

    try {
      // Validate
      if (!customerEmail || !customerName) {
        setError('Customer information is required');
        setLoading(false);
        return;
      }

      if (!dueDate) {
        setError('Due date is required');
        setLoading(false);
        return;
      }

      if (lineItems.some((item) => !item.description || item.unitPrice <= 0)) {
        setError('All line items must have a description and price');
        setLoading(false);
        return;
      }

      // Create or update invoice
      const url = mode === 'create' 
        ? '/api/contractor/invoices'
        : `/api/contractor/invoices/${invoice.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          customerEmail,
          customerName,
          lineItems,
          subtotal,
          taxRate: taxRate > 0 ? taxRate : null,
          taxAmount: taxAmount > 0 ? taxAmount : null,
          total,
          dueDate,
          notes,
          terms,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Check if it's a subscription limit error
        if (data.error === 'SUBSCRIPTION_LIMIT_REACHED') {
          setShowUpgradeModal(true);
          setLoading(false);
          return;
        }
        
        throw new Error(data.error || 'Failed to save invoice');
      }

      const data = await response.json();

      // If sending, call send endpoint
      if (status === 'sent') {
        await fetch(`/api/contractor/invoices/${data.invoice.id}/send`, {
          method: 'POST',
        });
      }

      router.push('/contractor-dashboard/invoices');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Limit Warning Banner */}
      {mode === 'create' && limitInfo && limitInfo.limit !== -1 && (
        <Alert className={`${
          limitInfo.remaining === 0
            ? 'bg-red-50 border-red-500'
            : limitInfo.percentage >= 80
            ? 'bg-yellow-50 border-yellow-500'
            : 'bg-blue-50 border-blue-500'
        }`}>
          <AlertCircle className={`h-4 w-4 ${
            limitInfo.remaining === 0
              ? 'text-red-500'
              : limitInfo.percentage >= 80
              ? 'text-yellow-500'
              : 'text-blue-500'
          }`} />
          <AlertDescription className={`${
            limitInfo.remaining === 0
              ? 'text-red-700'
              : limitInfo.percentage >= 80
              ? 'text-yellow-700'
              : 'text-blue-700'
          }`}>
            {limitInfo.remaining === 0 ? (
              <>
                You've reached your limit of {limitInfo.limit} invoices this month.{' '}
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="underline font-semibold hover:opacity-80"
                >
                  Upgrade to Pro
                </button>{' '}
                for unlimited invoices.
              </>
            ) : limitInfo.percentage >= 80 ? (
              <>
                You're using {limitInfo.current} of {limitInfo.limit} invoices this month ({limitInfo.percentage}%).{' '}
                Consider{' '}
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="underline font-semibold hover:opacity-80"
                >
                  upgrading
                </button>{' '}
                to avoid interruptions.
              </>
            ) : (
              <>
                You have {limitInfo.remaining} of {limitInfo.limit} invoices remaining this month.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Customer Information */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Email *
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="john@example.com"
              required
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
          <Button
            type="button"
            onClick={addLineItem}
            variant="outline"
            size="sm"
            className="border-2 border-gray-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {lineItems.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="col-span-12 md:col-span-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(item.id, 'description', e.target.value)
                  }
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="Service or product description"
                  required
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={item.type}
                  onChange={(e) =>
                    updateLineItem(item.id, 'type', e.target.value)
                  }
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="labor">Labor</option>
                  <option value="material">Material</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unit Price *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div className="col-span-12 md:col-span-1 flex items-end">
                <Button
                  type="button"
                  onClick={() => removeLineItem(item.id)}
                  variant="outline"
                  size="sm"
                  className="w-full border-2 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={lineItems.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="col-span-12 text-right">
                <p className="text-sm font-medium text-gray-900">
                  Amount: ${(item.quantity * item.unitPrice).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-6 pt-6 border-t-2 border-gray-200">
          <div className="max-w-md ml-auto space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Tax Rate (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border-2 border-gray-200 rounded focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <span className="font-medium text-gray-900">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-200">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Terms
            </label>
            <select
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="Due on Receipt">Due on Receipt</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 60">Net 60</option>
              <option value="Net 90">Net 90</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Additional notes or payment instructions..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
          className="border-2 border-gray-200"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit('draft')}
          disabled={loading}
          variant="outline"
          className="border-2 border-gray-200"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save as Draft'}
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit('sent')}
          disabled={loading}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-2 border-black shadow-lg"
        >
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Sending...' : 'Save & Send'}
        </Button>
      </div>

      {/* Upgrade Modal */}
      {limitInfo && (
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="invoices"
          currentTier={limitInfo.tier}
          requiredTier="pro"
          currentLimit={limitInfo.limit}
          requiredLimit={-1}
          benefits={[
            'Unlimited invoices per month',
            'Recurring invoice templates',
            'Advanced payment tracking',
            'Team management for up to 6 members',
            'CRM features with customer portal',
            'Lead management (100 active leads)',
          ]}
        />
      )}
    </div>
  );
}
