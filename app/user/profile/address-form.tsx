'use client';

import { useState } from 'react';
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
import { 
  updateShippingAddress, 
  updateBillingAddress 
} from '@/lib/actions/user.actions';
import { updateAddressSchema } from '@/lib/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type AddressFormProps = {
  initialAddress?: Partial<z.infer<typeof updateAddressSchema>> | null;
  initialShippingAddress?: Partial<z.infer<typeof updateAddressSchema>> | null;
  initialBillingAddress?: Partial<z.infer<typeof updateAddressSchema>> | null;
};

export default function AddressForm({ 
  initialAddress, 
  initialShippingAddress,
  initialBillingAddress 
}: AddressFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [addressType, setAddressType] = useState<'shipping' | 'billing'>('shipping');
  const { toast } = useToast();

  const shippingForm = useForm<z.infer<typeof updateAddressSchema>>({
    resolver: zodResolver(updateAddressSchema),
    defaultValues: initialShippingAddress || {
      fullName: '',
      streetAddress: '',
      city: '',
      postalCode: '',
      country: '',
    },
  });

  const billingForm = useForm<z.infer<typeof updateAddressSchema>>({
    resolver: zodResolver(updateAddressSchema),
    defaultValues: initialBillingAddress || {
      fullName: '',
      streetAddress: '',
      city: '',
      postalCode: '',
      country: '',
    },
  });

  const onShippingSubmit = async (values: z.infer<typeof updateAddressSchema>): Promise<void> => {
    const res = await updateShippingAddress(values);

    if (!res.success) {
      toast({
        variant: 'destructive',
        description: res.message,
      });
      return;
    }

    toast({
      description: res.message,
    });
  };

  const onBillingSubmit = async (values: z.infer<typeof updateAddressSchema>): Promise<void> => {
    const res = await updateBillingAddress(values);

    if (!res.success) {
      toast({
        variant: 'destructive',
        description: res.message,
      });
      return;
    }

    toast({
      description: res.message,
    });
  };

  const renderAddressDisplay = (address: Partial<z.infer<typeof updateAddressSchema>> | undefined | null, title: string) => {
    if (!address) return null;
    
    return (
      <div className='space-y-4'>
        <h4 className='font-semibold text-white'>{title}</h4>
        <div className='p-4 bg-white/5 border border-white/20 rounded-lg'>
          <p className='text-sm text-gray-300'>
            <span className='font-medium text-white'>{address.fullName}</span>
          </p>
          <p className='text-sm text-gray-300'>{address.streetAddress}</p>
          <p className='text-sm text-gray-300'>
            {address.city}, {address.postalCode}
          </p>
          <p className='text-sm text-gray-300'>{address.country}</p>
        </div>
      </div>
    );
  };

  const renderAddressForm = (
    form: ReturnType<typeof useForm<z.infer<typeof updateAddressSchema>>>,
    onSubmitFn: (values: z.infer<typeof updateAddressSchema>) => Promise<void>,
    title: string
  ) => {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitFn)} className='space-y-4'>
          <FormField
            control={form.control}
            name='fullName'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-gray-200'>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder='Full Name' className='input-field bg-white/5 border-white/20 text-white placeholder:text-gray-500' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='streetAddress'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-gray-200'>Street Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Street Address'
                    className='input-field bg-white/5 border-white/20 text-white placeholder:text-gray-500'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='city'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-gray-200'>City</FormLabel>
                  <FormControl>
                    <Input placeholder='City' className='input-field bg-white/5 border-white/20 text-white placeholder:text-gray-500' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='postalCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-gray-200'>Postal Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Postal Code'
                      className='input-field bg-white/5 border-white/20 text-white placeholder:text-gray-500'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name='country'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-gray-200'>Country</FormLabel>
                <FormControl>
                  <Input placeholder='Country' className='input-field bg-white/5 border-white/20 text-white placeholder:text-gray-500' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type='submit'
            className='w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Saving...' : `Save ${title}`}
          </Button>
        </form>
      </Form>
    );
  };

  if (!isEditing && (initialAddress || initialShippingAddress || initialBillingAddress)) {
    return (
      <div className='space-y-4'>
        <div className='flex gap-2 mb-4'>
          <Button
            type='button'
            variant={addressType === 'shipping' ? 'default' : 'outline'}
            className={addressType === 'shipping' ? 'bg-gradient-to-r from-violet-600 to-purple-600' : 'border-white/20 text-white hover:bg-white/10'}
            onClick={() => setAddressType('shipping')}
          >
            Shipping Address
          </Button>
          <Button
            type='button'
            variant={addressType === 'billing' ? 'default' : 'outline'}
            className={addressType === 'billing' ? 'bg-gradient-to-r from-violet-600 to-purple-600' : 'border-white/20 text-white hover:bg-white/10'}
            onClick={() => setAddressType('billing')}
          >
            Billing Address
          </Button>
        </div>

        <div className='space-y-4'>
          {addressType === 'shipping' && (
            <>
              {initialShippingAddress ? (
                renderAddressDisplay(initialShippingAddress, 'Shipping Address')
              ) : (
                <div className='p-4 text-center text-gray-400 border border-dashed border-white/20 rounded-lg bg-white/5'>
                  No shipping address saved
                </div>
              )}
              <Button
                type='button'
                variant='outline'
                className='w-full border-white/20 text-white hover:bg-white/10'
                onClick={() => {
                  setAddressType('shipping');
                  setIsEditing(true);
                }}
              >
                {initialShippingAddress ? 'Edit' : 'Add'} Shipping Address
              </Button>
            </>
          )}

          {addressType === 'billing' && (
            <>
              {initialBillingAddress ? (
                renderAddressDisplay(initialBillingAddress, 'Billing Address')
              ) : (
                <div className='p-4 text-center text-gray-400 border border-dashed border-white/20 rounded-lg bg-white/5'>
                  No billing address saved
                </div>
              )}
              <Button
                type='button'
                variant='outline'
                className='w-full border-white/20 text-white hover:bg-white/10'
                onClick={() => {
                  setAddressType('billing');
                  setIsEditing(true);
                }}
              >
                {initialBillingAddress ? 'Edit' : 'Add'} Billing Address
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-white'>
          {addressType === 'shipping' ? 'Shipping' : 'Billing'} Address
        </h3>
        {addressType === 'shipping'
          ? renderAddressForm(shippingForm, onShippingSubmit, 'Shipping Address')
          : renderAddressForm(billingForm, onBillingSubmit, 'Billing Address')}
        <Button
          type='button'
          variant='outline'
          className='w-full border-white/20 text-white hover:bg-white/10'
          onClick={() => {
            setIsEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-semibold text-white'>Add Addresses</h3>
      <Button
        type='button'
        variant='outline'
        className='w-full border-white/20 text-white hover:bg-white/10'
        onClick={() => {
          setAddressType('shipping');
          setIsEditing(true);
        }}
      >
        Add Shipping Address
      </Button>
      <Button
        type='button'
        variant='outline'
        className='w-full border-white/20 text-white hover:bg-white/10'
        onClick={() => {
          setAddressType('billing');
          setIsEditing(true);
        }}
      >
        Add Billing Address
      </Button>
    </div>
  );
}
