'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const achSchema = z.object({
  accountHolderName: z.string().min(3, 'Account holder name is required'),
  accountHolderType: z.enum(['individual', 'company']).optional(),
  routingNumber: z
    .string()
    .regex(/^\d{9}$/, 'Routing number must be 9 digits'),
  accountNumber: z
    .string()
    .min(8, 'Account number must be at least 8 digits')
    .max(17, 'Account number cannot exceed 17 digits'),
  accountNumberConfirm: z.string().min(8, 'Please confirm your account number'),
  accountType: z.enum(['checking', 'savings'], {
    errorMap: () => ({ message: 'Please select an account type' }),
  }),
  consent: z.boolean().refine(v => v === true, { message: 'You must authorize the ACH debit' }),
});

type AchFormData = z.infer<typeof achSchema>;

interface BankAccountFormProps {
  onSubmit: (data: AchFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export default function BankAccountForm({
  onSubmit,
  isLoading = false,
  onCancel,
}: BankAccountFormProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAccountNumbers, setShowAccountNumbers] = useState(false);

  const form = useForm<AchFormData>({
    resolver: zodResolver(achSchema),
    defaultValues: {
      accountHolderName: '',
      accountHolderType: 'individual',
      routingNumber: '',
      accountNumber: '',
      accountNumberConfirm: '',
      accountType: 'checking',
      consent: false,
    },
  });

  const handleSubmit = async (values: AchFormData) => {
    if (values.accountNumber !== values.accountNumberConfirm) {
      toast({
        variant: 'destructive',
        description: 'Account numbers do not match',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Bank account submission error:', error);
      toast({
        variant: 'destructive',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to save bank account. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Form {...form}>
      <div className='space-y-6'>
        {/* Account Holder Name */}
        <FormField
          control={form.control}
          name='accountHolderName'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-slate-300'>Account Holder Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='John Doe'
                  {...field}
                  className='bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account Holder Type */}
        <FormField
          control={form.control}
          name='accountHolderType'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-slate-300'>Account Holder Type</FormLabel>
              <FormControl>
                <div className='flex gap-3'>
                  <label className='inline-flex items-center gap-2'>
                    <input
                      type='radio'
                      value='individual'
                      checked={field.value === 'individual'}
                      onChange={() => field.onChange('individual')}
                    />
                    <span className='text-sm text-slate-300'>Individual</span>
                  </label>
                  <label className='inline-flex items-center gap-2'>
                    <input
                      type='radio'
                      value='company'
                      checked={field.value === 'company'}
                      onChange={() => field.onChange('company')}
                    />
                    <span className='text-sm text-slate-300'>Company</span>
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account Type */}
        <FormField
          control={form.control}
          name='accountType'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-slate-300'>Account Type</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className='flex h-9 rounded-md border border-white/10 bg-slate-800/60 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                >
                  <option value='checking'>Checking</option>
                  <option value='savings'>Savings</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mandate / Authorization */}
        <FormField
          control={form.control}
          name='consent'
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <label className='inline-flex items-center gap-2'>
                  <input type='checkbox' checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
                  <span className='text-xs text-slate-400'>I authorize the landlord and platform to initiate ACH debits to this account for rent payments.</span>
                </label>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Routing Number */}
        <FormField
          control={form.control}
          name='routingNumber'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-slate-300'>Routing Number</FormLabel>
              <FormControl>
                <Input
                  placeholder='000000000'
                  {...field}
                  maxLength={9}
                  className='bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500'
                />
              </FormControl>
              <p className='text-xs text-slate-500 mt-1'>9 digits • Find it on a check or your bank website</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account Number */}
        <FormField
          control={form.control}
          name='accountNumber'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-slate-300'>Account Number</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    placeholder='Enter your account number'
                    type={showAccountNumbers ? 'text' : 'password'}
                    {...field}
                    className='bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 pr-10'
                  />
                  <button
                    type='button'
                    onClick={() => setShowAccountNumbers((s) => !s)}
                    aria-label={showAccountNumbers ? 'Hide account number' : 'Show account number'}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white'
                  >
                    {showAccountNumbers ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                </div>
              </FormControl>
              <p className='text-xs text-slate-500 mt-1'>8-17 digits • Your number is masked for security</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account Number Confirmation */}
        <FormField
          control={form.control}
          name='accountNumberConfirm'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-slate-300'>Confirm Account Number</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    placeholder='Re-enter your account number'
                    type={showAccountNumbers ? 'text' : 'password'}
                    {...field}
                    className='bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 pr-10'
                  />
                  <button
                    type='button'
                    onClick={() => setShowAccountNumbers((s) => !s)}
                    aria-label={showAccountNumbers ? 'Hide account number' : 'Show account number'}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white'
                  >
                    {showAccountNumbers ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Security Notice */}
        <div className='rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm'>
          <p className='text-white font-medium mb-1'>🔒 Your information is secure</p>
          <p className='text-slate-400 text-xs'>
            Your bank details are encrypted and securely transmitted to our payment processor. We never store your full account number.
          </p>
        </div>

        {/* Submit Buttons */}
        <div className='flex gap-2 pt-2'>
          <Button
            type='button'
            onClick={() => form.handleSubmit(handleSubmit)()}
            disabled={isProcessing || isLoading}
            className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white'
          >
            {isProcessing || isLoading ? 'Processing...' : 'Continue with Bank Account'}
          </Button>
          {onCancel && (
            <Button
              type='button'
              variant='outline'
              onClick={onCancel}
              disabled={isProcessing || isLoading}
              className='border-white/10 text-slate-300 hover:bg-slate-800'
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Form>
  );
}
