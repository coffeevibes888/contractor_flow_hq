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
import { Trash2, Edit2, Building2 } from 'lucide-react';
import CardForm from './card-form';
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

export default function SavedPaymentMethods() {
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
    let res;

    if (editingId) {
      res = await updateSavedPaymentMethod(editingId, values);
    } else {
      res = await addSavedPaymentMethod(values);
    }

    if (!res.success) {
      toast({
        variant: 'destructive',
        description: res.message,
      });
    } else {
      toast({
        description: res.message,
      });
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
      toast({
        variant: 'destructive',
        description: res.message,
      });
    } else {
      toast({
        description: res.message,
      });
      await fetchPaymentMethods();
    }
    setIsDeleting(null);
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h3 className='text-lg font-semibold text-white'>Saved Payment Methods</h3>
        <div className='flex flex-wrap gap-2'>
          <AddBankAccountButton
            onSuccess={fetchPaymentMethods}
            variant='outline'
            className='border-white/20 text-white hover:bg-white/10'
          />
          <Button
            type='button'
            variant='outline'
            className='border-white/20 text-white hover:bg-white/10'
            onClick={() => setShowForm(!showForm)}
            disabled={isLoading}
          >
            {showForm ? 'Cancel' : 'Add Card'}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className='text-center text-gray-400 py-8'>
          <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500'></div>
          <p className='mt-2'>Loading payment methods...</p>
        </div>
      )}

      {showForm && (
        <div className='border border-white/20 rounded-lg p-6 bg-white/5 space-y-4'>
          <h4 className='font-semibold text-white'>{editingId ? 'Edit Payment Method' : 'Add New Payment Method'}</h4>
          <CardForm
            initialData={editingMethod}
            onSubmit={onSubmit}
            isLoading={isSubmitting}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      {methods.length === 0 && !isLoading ? (
        <div className='p-4 text-center text-gray-400 border border-dashed border-white/20 rounded-lg bg-white/5'>
          No saved payment methods. Add a card or link a bank account to get started!
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {methods.map((method) => {
            const isBank = method.type === 'us_bank_account' || method.type === 'bank_account';
            return (
            <div
              key={method.id}
              className='flex flex-col justify-between p-4 border border-white/20 rounded-lg bg-white/5'
            >
              <div>
                <p className='font-medium text-white flex items-center gap-2'>
                  {isBank ? (
                    <Building2 className='w-4 h-4 text-emerald-300 shrink-0' />
                  ) : null}
                  <span>
                    {method.cardholderName && <span>{method.cardholderName} - </span>}
                    {method.brand} •••• {method.last4}
                    {method.expirationDate && !isBank && (
                      <span className='text-sm text-gray-400 ml-2'>Expires {method.expirationDate}</span>
                    )}
                    {isBank && (
                      <span className='text-sm text-emerald-300 ml-2'>ACH bank transfer</span>
                    )}
                  </span>
                </p>
                <div className='flex gap-2 mt-2'>
                  {method.isDefault && (
                    <span className='text-xs bg-violet-500/30 text-violet-200 px-2 py-1 rounded border border-violet-400/50'>
                      Default
                    </span>
                  )}
                  {!method.isVerified && (
                    <span className='text-xs bg-yellow-500/30 text-yellow-200 px-2 py-1 rounded border border-yellow-400/50'>
                      Pending Verification
                    </span>
                  )}
                </div>
              </div>
              <div className='flex gap-2 mt-4'>
                {!isBank && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-gray-400 hover:text-white hover:bg-white/10'
                    onClick={() => handleEdit(method)}
                  >
                    <Edit2 className='w-4 h-4' />
                  </Button>
                )}
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='text-red-400 hover:text-red-300 hover:bg-white/10'
                  onClick={() => handleDelete(method.id)}
                  disabled={isDeleting === method.id}
                >
                  <Trash2 className='w-4 h-4' />
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
