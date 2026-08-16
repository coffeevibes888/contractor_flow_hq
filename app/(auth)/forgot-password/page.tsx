'use client';

import { useState } from 'react';
import { requestPasswordReset } from '@/lib/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        setSubmitted(true);
        toast({
          description: 'Password reset email sent. Check your inbox!',
        });
      } else {
        toast({
          variant: 'destructive',
          description: result.message,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        description: 'An error occurred. Please try again.',
      });
    } finally {
      setIsPending(false);
    }
  };

  if (submitted) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100'>
        <div className='bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center'>
          <h1 className='text-2xl font-bold mb-4'>Check Your Email</h1>
          <p className='text-gray-600 mb-6'>
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
          <p className='text-sm text-gray-500 mb-6'>
            The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
          </p>
          <Button asChild className='w-full'>
            <Link href='/sign-in'>Back to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='bg-white rounded-lg shadow-lg p-8 max-w-md w-full'>
        <h1 className='text-2xl font-bold mb-6'>Reset Your Password</h1>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Email Address
            </label>
            <Input
              type='email'
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
              className='bg-white text-gray-900 border-gray-300'
            />
          </div>
          <Button type='submit' className='w-full' disabled={isPending}>
            {isPending ? (
              <Loader className='w-4 h-4 animate-spin' />
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>
        <div className='mt-4 text-center'>
          <Link href='/sign-in' className='text-sm text-blue-600 hover:underline'>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
