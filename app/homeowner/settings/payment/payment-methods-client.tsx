'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  addSavedPaymentMethod,
  getSavedPaymentMethods,
  deleteSavedPaymentMethod,
  updateSavedPaymentMethod,
} from '@/lib/actions/user.actions';
import { savedPaymentMethodSchema } from '@/lib/validators';
import { z } from 'zod';
import { Trash2, Edit2, CreditCard, Plus, Loader2, Shield, CheckCircle2, Building2 } from 'lucide-react';
import CardForm from '@/app/user/profile/card-form';
import AddBankAccountButton from '@/components/shared/add-bank-account-button';

type SavedPaymentMethod = {
  id: string;
  type: string;
  last4: string;
  brand?: string;
  expirationDate?: string;
  cardholderName?: string;
  isDefault: boolean;
  isVerified: boolean;
};

export default function HomeownerPaymentMethodsClient() {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMethod, setEditingMethod] = useState<SavedPaymentMethod | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    const result = await getSavedPaymentMethods();
    if (result.success) {
      setMethods(result.methods as SavedPaymentMethod[]);
    } else {
      toast({
        variant: 'destructive',
        description: result.message,
      });
    }
    setIsLoading(false);
  };

  const onSubmit = async (values: z.infer<typeof savedPaymentMethodSchema>) => {
    setIsSubmitting(true);
    const res = editingId
      ? await updateSavedPaymentMethod(editingId, values)
      : await addSavedPaymentMethod(values);

    if (!res.success) {
      toast({ variant: 'destructive', description: res.message });
    } else {
      toast({ description: res.message });
      setShowForm(false);
      setEditingId(null);
      setEditingMethod(null);
      await fetchPaymentMethods();
    }
    setIsSubmitting(false);
  };

  const handleEdit = (method: SavedPaymentMethod) => {
    setEditingId(method.id);
    setEditingMethod(method);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingMethod(null);
    setShowForm(false);
  };

  const handleDelete = async (paymentMethodId: string) => {
    setIsDeleting(paymentMethodId);
    const res = await deleteSavedPaymentMethod(paymentMethodId);
    if (!res.success) {
      toast({ variant: 'destructive', description: res.message });
    } else {
      toast({ description: res.message });
      await fetchPaymentMethods();
    }
    setIsDeleting(null);
  };

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900'>Payment Methods</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Save cards and bank accounts to pay contractors instantly
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <AddBankAccountButton
            onSuccess={fetchPaymentMethods}
            variant='outline'
            className='border-gray-200 text-gray-700 hover:bg-gray-50'
          />
          <Button
            type='button'
            onClick={() => {
              if (showForm) handleCancelEdit();
              else setShowForm(true);
            }}
            disabled={isLoading}
            className='bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-sm'
          >
            {showForm ? (
              'Cancel'
            ) : (
              <>
                <Plus className='h-4 w-4 mr-1.5' />
                Add Card
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stripe trust strip */}
      <div className='rounded-xl border border-gray-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 p-3 flex items-center gap-3'>
        <div className='rounded-lg bg-white p-2 border border-cyan-100'>
          <Shield className='h-4 w-4 text-cyan-600' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-xs font-bold text-gray-900'>Secured by Stripe</p>
          <p className='text-[11px] text-gray-600'>
            Your card details are tokenized and stored securely with Stripe. We never see your full card number.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className='rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm'>
          <Loader2 className='h-8 w-8 mx-auto animate-spin text-cyan-500' />
          <p className='text-sm text-gray-500 mt-3'>Loading payment methods...</p>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4'>
          <h4 className='text-sm font-bold text-gray-900'>
            {editingId ? 'Edit Payment Method' : 'Add New Payment Method'}
          </h4>
          <CardForm
            initialData={editingMethod}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && methods.length === 0 && !showForm && (
        <div className='rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center'>
          <div className='mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-sky-50 to-cyan-50 border border-cyan-100 flex items-center justify-center mb-3'>
            <CreditCard className='h-6 w-6 text-cyan-600' />
          </div>
          <h3 className='text-sm font-bold text-gray-900'>No saved payment methods</h3>
          <p className='text-xs text-gray-500 mt-1 max-w-sm mx-auto'>
            Add a card or bank account so you can pay contractors with one click. Funds are held in escrow until you approve completed work.
          </p>
          <div className='flex flex-wrap items-center justify-center gap-2 mt-4'>
            <AddBankAccountButton
              onSuccess={fetchPaymentMethods}
              variant='outline'
              className='border-gray-200 text-gray-700 hover:bg-gray-50'
            />
            <Button
              onClick={() => setShowForm(true)}
              className='bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white'
            >
              <Plus className='h-4 w-4 mr-1.5' />
              Add Card
            </Button>
          </div>
          <p className='text-[11px] text-gray-400 mt-3'>
            Bank accounts are best for large payments (no card fees on $5K+ jobs).
          </p>
        </div>
      )}

      {/* Method Cards */}
      {!isLoading && methods.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {methods.map((method) => {
            const isBank = method.type === 'us_bank_account' || method.type === 'bank_account';
            return (
            <div
              key={method.id}
              className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow'
            >
              <div className='p-4 space-y-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-start gap-3 min-w-0'>
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0 ${
                      isBank
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-br from-sky-500 to-cyan-500'
                    }`}>
                      {isBank ? <Building2 className='h-5 w-5' /> : <CreditCard className='h-5 w-5' />}
                    </div>
                    <div className='min-w-0'>
                      <p className='text-sm font-bold text-gray-900 truncate'>
                        {method.brand || (isBank ? 'Bank' : 'Card')} •••• {method.last4}
                      </p>
                      {method.cardholderName && (
                        <p className='text-[11px] text-gray-500 truncate'>{method.cardholderName}</p>
                      )}
                      {method.expirationDate && !isBank && (
                        <p className='text-[11px] text-gray-400'>Expires {method.expirationDate}</p>
                      )}
                      {isBank && (
                        <p className='text-[11px] text-emerald-600 font-medium'>ACH bank transfer</p>
                      )}
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-1 shrink-0'>
                    {method.isDefault && (
                      <span className='inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold'>
                        <CheckCircle2 className='h-2.5 w-2.5' />
                        Default
                      </span>
                    )}
                    {!method.isVerified && (
                      <span className='inline-flex items-center rounded-full bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold'>
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                  {!isBank && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='text-gray-600 hover:text-gray-900 hover:bg-gray-50 h-8'
                      onClick={() => handleEdit(method)}
                    >
                      <Edit2 className='w-3.5 h-3.5 mr-1.5' />
                      Edit
                    </Button>
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-red-600 hover:text-red-700 hover:bg-red-50 h-8'
                    onClick={() => handleDelete(method.id)}
                    disabled={isDeleting === method.id}
                  >
                    {isDeleting === method.id ? (
                      <Loader2 className='w-3.5 h-3.5 mr-1.5 animate-spin' />
                    ) : (
                      <Trash2 className='w-3.5 h-3.5 mr-1.5' />
                    )}
                    Remove
                  </Button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
