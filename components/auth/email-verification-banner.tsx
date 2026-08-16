'use client';

import { useState } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendVerificationEmailToken } from '@/lib/actions/auth.actions';
import { useToast } from '@/hooks/use-toast';

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

export function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const result = await sendVerificationEmailToken(email);
      if (result.success) {
        toast({
          title: 'Email sent',
          description: 'Check your inbox for the verification link',
        });
      } else {
        toast({
          title: 'Failed to send',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isDismissed) return null;

  return (
    <div className='bg-amber-50 border-b border-amber-200'>
      <div className='max-w-7xl mx-auto px-4 py-3'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3 flex-1'>
            <AlertCircle className='h-5 w-5 text-amber-600 flex-shrink-0' />
            <div className='flex-1'>
              <p className='text-sm text-amber-900'>
                <strong>Please verify your email</strong> to unlock all features. Check your inbox at{' '}
                <span className='font-semibold'>{email}</span>
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleResend}
              disabled={isResending}
              className='text-amber-900 hover:text-amber-950 hover:bg-amber-100'
            >
              <Mail className='h-4 w-4 mr-1' />
              {isResending ? 'Sending...' : 'Resend'}
            </Button>
            <button
              onClick={handleDismiss}
              className='text-amber-600 hover:text-amber-900 p-1'
              aria-label='Dismiss'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
