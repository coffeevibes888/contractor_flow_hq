'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { sendVerificationEmailToken } from '@/lib/actions/auth.actions';
import { Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await sendVerificationEmailToken(email);

    if (result.success) {
      setMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' });
    } else {
      setMessage({ type: 'error', text: result.message });
    }

    setLoading(false);
  };

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-4'>
          <div className='flex justify-center'>
            <Mail className='h-12 w-12 text-blue-600' />
          </div>
          <CardTitle className='text-center'>Resend Verification Email</CardTitle>
          <CardDescription className='text-center'>
            Enter your email address and we'll send you a new verification link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResend} className='space-y-4'>
            <div>
              <Label htmlFor='email'>Email Address</Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='you@example.com'
                required
                className='bg-white text-gray-900 border-gray-300'
              />
            </div>

            <Button type='submit' disabled={loading} className='w-full'>
              {loading ? 'Sending...' : 'Send Verification Email'}
            </Button>

            {message && (
              <div
                className={`rounded-lg p-4 border ${
                  message.type === 'success'
                    ? 'bg-gradient-to-r from-sky-500 via-cyan-200 to-sky-500 border-black shadow-2xl'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {message.type === 'success' && (
                  <div className='flex items-start gap-2'>
                    <CheckCircle className='h-5 w-5 text-emerald-600 mt-0.5' />
                    <p className='text-sm text-black font-semibold'>{message.text}</p>
                  </div>
                )}
                {message.type === 'error' && (
                  <p className='text-sm text-red-800'>{message.text}</p>
                )}
              </div>
            )}

            <div className='text-sm text-center text-muted-foreground'>
              <Link href='/sign-in' className='link'>
                Back to Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
