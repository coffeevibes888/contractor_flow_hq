'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  incrementPhoneOtpAttempts,
} from '@/lib/actions/auth.actions';
import { updatePhoneNumber } from '@/lib/actions/user.actions';
import {
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
} from '@/lib/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader } from 'lucide-react';

type PhoneVerificationProps = {
  onPhoneVerified?: () => void;
  mode?: 'verify' | 'add';
};

export default function PhoneVerification({
  onPhoneVerified,
  mode = 'verify',
}: PhoneVerificationProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [skipVerification, setSkipVerification] = useState(false);

  const phoneForm = useForm<z.infer<typeof sendPhoneOtpSchema>>({
    resolver: zodResolver(sendPhoneOtpSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const otpForm = useForm<z.infer<typeof verifyPhoneOtpSchema>>({
    resolver: zodResolver(verifyPhoneOtpSchema),
    defaultValues: {
      otp: '',
    },
  });

  const onPhoneSubmit = async (
    values: z.infer<typeof sendPhoneOtpSchema>
  ) => {
    if (!session?.user?.id) {
      toast({
        variant: 'destructive',
        description: 'User session not found',
      });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'add' && skipVerification) {
        const result = await updatePhoneNumber(values.phoneNumber);
        if (result.success) {
          toast({
            description: 'Phone number saved successfully',
          });
          phoneForm.reset();
          onPhoneVerified?.();
        } else {
          toast({
            variant: 'destructive',
            description: result.message,
          });
        }
      } else {
        const result = await sendPhoneOtp(session.user.id, values.phoneNumber);

        if (result.success) {
          setPhoneNumber(values.phoneNumber);
          setStep('otp');
          toast({
            description: 'Verification code sent to your phone',
          });
        } else {
          toast({
            variant: 'destructive',
            description: result.message,
          });
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'An error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (values: z.infer<typeof verifyPhoneOtpSchema>) => {
    if (!session?.user?.id) {
      toast({
        variant: 'destructive',
        description: 'User session not found',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await verifyPhoneOtp(session.user.id, values.otp);

      if (result.success) {
        toast({
          description: 'Phone number verified successfully!',
        });
        setStep('phone');
        phoneForm.reset();
        otpForm.reset();
        onPhoneVerified?.();
      } else {
        await incrementPhoneOtpAttempts(session.user.id, values.otp);
        toast({
          variant: 'destructive',
          description: result.message,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'An error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-white'>
          {mode === 'add' ? 'Add Phone Number' : 'Verify Phone Number'}
        </h3>
        <Form {...phoneForm}>
          <form
            onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
            className='space-y-4'
          >
            <FormField
              control={phoneForm.control}
              name='phoneNumber'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder='Phone number (e.g., +1 (555) 123-4567)'
                      className='input-field bg-white/5 border-white/20 text-white placeholder:text-gray-500'
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === 'add' && (
              <div className='flex items-center gap-2 p-3 bg-white/5 border border-white/20 rounded-lg'>
                <input
                  type='checkbox'
                  id='skipVerification'
                  checked={skipVerification}
                  onChange={(e) => setSkipVerification(e.target.checked)}
                  className='w-4 h-4 cursor-pointer'
                  disabled={loading}
                />
                <label htmlFor='skipVerification' className='text-sm text-gray-300 cursor-pointer flex-1'>
                  Save without verification
                </label>
              </div>
            )}
            <Button
              type='submit'
              className='w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
              disabled={loading}
            >
              {loading ? (
                <Loader className='w-4 h-4 animate-spin mr-2' />
              ) : null}
              {mode === 'add' && skipVerification
                ? 'Save Phone Number'
                : 'Send Verification Code'}
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-semibold text-white'>Verify Phone Number</h3>
      <p className='text-sm text-gray-400'>
        Enter the 6-digit code sent to {phoneNumber}
      </p>
      <Form {...otpForm}>
        <form
          onSubmit={otpForm.handleSubmit(onOtpSubmit)}
          className='space-y-4'
        >
          <FormField
            control={otpForm.control}
            name='otp'
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder='000000'
                    className='input-field text-center tracking-widest bg-white/5 border-white/20 text-white placeholder:text-gray-500'
                    maxLength={6}
                    {...field}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='flex gap-2'>
            <Button
              type='submit'
              className='flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
              disabled={loading}
            >
              {loading ? (
                <Loader className='w-4 h-4 animate-spin mr-2' />
              ) : null}
              Verify Code
            </Button>
            <Button
              type='button'
              variant='outline'
              className='flex-1 border-white/20 text-white hover:bg-white/10'
              onClick={() => {
                setStep('phone');
                otpForm.reset();
              }}
              disabled={loading}
            >
              Back
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
