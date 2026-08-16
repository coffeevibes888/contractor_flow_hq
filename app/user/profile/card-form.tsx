'use client';

import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { billingAddressSchema } from '@/lib/validators';

type CardFormProps = {
  onSubmit: (data: {
    stripePaymentMethodId: string;
    type: string;
    cardholderName: string;
    last4: string;
    expirationDate: string;
    brand: string;
    billingAddress: z.infer<typeof billingAddressSchema>;
    isDefault: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  initialData?: {
    id: string;
    cardholderName?: string;
    isDefault: boolean;
    last4: string;
    brand?: string;
    expirationDate?: string;
  } | null;
};

const billingFormSchema = z.object({
  cardholderName: z.string().min(3, 'Cardholder name must be at least 3 characters'),
  billingAddress: billingAddressSchema,
  isDefault: z.boolean().optional().default(false),
});

export default function CardForm({
  onSubmit,
  isLoading = false,
  onCancel,
  initialData,
}: CardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<z.infer<typeof billingFormSchema>>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      cardholderName: initialData?.cardholderName || '',
      billingAddress: {
        fullName: '',
        streetAddress: '',
        city: '',
        postalCode: '',
        country: '',
      },
      isDefault: initialData?.isDefault || false,
    },
  });

  const handleSubmit = async (values: z.infer<typeof billingFormSchema>) => {
    if (isEditing) {
      setIsProcessing(true);
      try {
        await onSubmit({
          stripePaymentMethodId: initialData?.id || '',
          type: 'card',
          cardholderName: values.cardholderName,
          last4: initialData?.last4 || '',
          expirationDate: initialData?.expirationDate || '',
          brand: initialData?.brand || '',
          billingAddress: values.billingAddress,
          isDefault: values.isDefault,
        });
      } catch (error) {
        console.error('Payment method update error:', error);
        toast({
          variant: 'destructive',
          description: error instanceof Error ? error.message : 'Failed to update payment method. Please try again.',
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!stripe || !elements) {
      toast({
        variant: 'destructive',
        description: 'Stripe not loaded',
      });
      return;
    }

    setIsProcessing(true);
    const cardElement = elements.getElement(CardElement);

    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement!,
        billing_details: {
          name: values.cardholderName,
          address: {
            line1: values.billingAddress.streetAddress,
            city: values.billingAddress.city,
            postal_code: values.billingAddress.postalCode,
            country: values.billingAddress.country,
          },
        },
      });

      if (error) {
        toast({
          variant: 'destructive',
          description: error.message || 'Failed to create payment method',
        });
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        toast({
          variant: 'destructive',
          description: 'Failed to create payment method',
        });
        setIsProcessing(false);
        return;
      }

      const cardDetails = paymentMethod.card;
      const expirationDate = `${String(cardDetails?.exp_month).padStart(2, '0')}/${String(cardDetails?.exp_year).slice(-2)}`;

      await onSubmit({
        stripePaymentMethodId: paymentMethod.id,
        type: 'card',
        cardholderName: values.cardholderName,
        last4: cardDetails?.last4 || '',
        expirationDate,
        brand: cardDetails?.brand?.toUpperCase() || '',
        billingAddress: values.billingAddress,
        isDefault: values.isDefault,
      });

      form.reset();
      if (cardElement) {
        cardElement.clear();
      }
    } catch (error) {
      console.error('Payment method submission error:', error);
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to save payment method. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='cardholderName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cardholder Name</FormLabel>
              <FormControl>
                <Input placeholder='John Doe' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <div className='border rounded-lg p-4 bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500'>
            <FormLabel className='block mb-2'>Card Details</FormLabel>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        )}

        {isEditing && (
          <div className='border border-white/10 rounded-lg p-4 bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500'>
            <p className='text-sm text-slate-300'>
              {initialData?.brand} •••• {initialData?.last4}
              {initialData?.expirationDate && (
                <span className='ml-2'>Expires {initialData.expirationDate}</span>
              )}
            </p>
          </div>
        )}

        <div className='border-t pt-6'>
          <h4 className='font-semibold mb-4'>Billing Address</h4>

          <FormField
            control={form.control}
            name='billingAddress.fullName'
            render={({ field }) => (
              <FormItem className='mb-4'>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder='John Doe' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='billingAddress.streetAddress'
            render={({ field }) => (
              <FormItem className='mb-4'>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Input placeholder='123 Main Street' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
            <FormField
              control={form.control}
              name='billingAddress.city'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder='New York' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='billingAddress.postalCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input placeholder='10001' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='billingAddress.country'
            render={({ field }) => (
              <FormItem className='mb-4'>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder='United States' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='isDefault'
          render={({ field }) => (
            <FormItem className='flex items-center gap-2'>
              <FormControl>
                <input
                  type='checkbox'
                  checked={field.value}
                  onChange={field.onChange}
                  className='w-4 h-4'
                />
              </FormControl>
              <FormLabel className='m-0'>Set as default payment method</FormLabel>
            </FormItem>
          )}
        />

        <div className='flex gap-2 justify-end'>
          {onCancel && (
            <Button type='button' variant='outline' onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type='submit' 
            disabled={isLoading || isProcessing || (!isEditing && (!stripe || !elements))}
          >
            {isProcessing || isLoading ? 'Processing...' : (isEditing ? 'Update Payment Method' : 'Add Payment Method')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
