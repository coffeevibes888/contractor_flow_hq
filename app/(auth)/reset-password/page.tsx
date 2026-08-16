'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  if (!token) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100'>
        <div className='bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center'>
          <XCircle className='w-12 h-12 mx-auto text-red-500 mb-4' />
          <h1 className='text-xl font-semibold mb-2'>Invalid Link</h1>
          <p className='text-gray-600 mb-6'>
            The password reset link is invalid or expired.
          </p>
          <Button asChild className='w-full'>
            <Link href='/forgot-password'>Request New Link</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsPending(true);

    try {
      const result = await resetPassword(token, password);

      if (result.success) {
        setSuccess(true);
        toast({
          description: 'Password reset successfully!',
        });
      } else {
        setError(result.message);
        toast({
          variant: 'destructive',
          description: result.message,
        });
      }
    } catch {
      const errorMessage = 'An error occurred. Please try again.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        description: errorMessage,
      });
    } finally {
      setIsPending(false);
    }
  };

  if (success) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100'>
        <div className='bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center'>
          <CheckCircle className='w-12 h-12 mx-auto text-green-500 mb-4' />
          <h1 className='text-xl font-semibold mb-2'>Password Reset</h1>
          <p className='text-gray-600 mb-6'>
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Button asChild className='w-full'>
            <Link href='/sign-in'>Sign In</Link>
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
              New Password
            </label>
            <Input
              type='password'
              placeholder='Enter new password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending}
              className='bg-white text-gray-900 border-gray-300'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Confirm Password
            </label>
            <Input
              type='password'
              placeholder='Confirm password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isPending}
              className='bg-white text-gray-900 border-gray-300'
            />
          </div>
          {error && <p className='text-red-500 text-sm'>{error}</p>}
          <Button type='submit' className='w-full' disabled={isPending}>
            {isPending ? (
              <Loader className='w-4 h-4 animate-spin' />
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
