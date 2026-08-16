'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ExpenseFormProps = {
  expense?: any;
  mode: 'create' | 'edit';
};

export function ExpenseForm({ expense, mode }: ExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState(expense?.receiptUrl || '');

  // Form state
  const [category, setCategory] = useState(expense?.category || 'Materials');
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount ? Number(expense.amount) : 0);
  const [vendor, setVendor] = useState(expense?.vendor || '');
  const [expenseDate, setExpenseDate] = useState(
    expense?.expenseDate
      ? new Date(expense.expenseDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [billable, setBillable] = useState(expense?.billable ?? true);
  const [taxDeductible, setTaxDeductible] = useState(expense?.taxDeductible ?? true);
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod || 'card');

  const categories = [
    'Materials',
    'Tools',
    'Fuel',
    'Permits',
    'Insurance',
    'Subcontractor',
    'Marketing',
    'Office Supplies',
    'Utilities',
    'Other',
  ];

  const paymentMethods = [
    { value: 'card', label: 'Credit Card' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
  ];

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate
      if (!category || !description || amount <= 0 || !expenseDate) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Upload receipt if provided
      let receiptUrl = expense?.receiptUrl || null;
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);

        const uploadResponse = await fetch('/api/contractor/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          receiptUrl = uploadData.url;
        }
      }

      // Create or update expense
      const url =
        mode === 'create'
          ? '/api/contractor/expenses'
          : `/api/contractor/expenses/${expense.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description,
          amount,
          vendor: vendor || null,
          expenseDate,
          receiptUrl,
          billable,
          taxDeductible,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save expense');
      }

      router.push('/contractor-dashboard/expenses');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Expense Information
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="What was this expense for?"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Home Depot, Lowe's, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Receipt Upload */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt</h3>
        {receiptPreview ? (
          <div className="relative">
            <img
              src={receiptPreview}
              alt="Receipt"
              className="max-w-md rounded-lg border-2 border-gray-200"
            />
            <Button
              type="button"
              onClick={removeReceipt}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 border-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              Upload a photo or scan of your receipt
            </p>
            <label className="cursor-pointer">
              <span className="inline-flex items-center px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptChange}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Options</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Billable to Customer</p>
              <p className="text-xs text-gray-500">
                This expense can be billed to a customer
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={taxDeductible}
              onChange={(e) => setTaxDeductible(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Tax Deductible</p>
              <p className="text-xs text-gray-500">
                This is a business expense for tax purposes
              </p>
            </div>
          </label>
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
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-2 border-black shadow-lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : mode === 'create' ? 'Create Expense' : 'Update Expense'}
        </Button>
      </div>
    </form>
  );
}
