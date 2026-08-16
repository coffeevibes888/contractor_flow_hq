'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import OAuthButtons from '@/components/auth/oauth-buttons';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

interface CredentialsSignInFormProps {
  callbackUrl?: string;
  fromProperty?: boolean;
  propertySlug?: string;
  subdomain?: string;
}

const CredentialsSignInForm = ({ 
  callbackUrl: propCallbackUrl,
  fromProperty,
  propertySlug,
  subdomain,
}: CredentialsSignInFormProps = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = propCallbackUrl || searchParams.get('callbackUrl') || '';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Build sign-up URL with property params if applicable
  const subdomainPath = subdomain ? `/${subdomain}` : '';
  const signUpUrl = fromProperty && propertySlug
    ? `${subdomainPath}/sign-up?fromProperty=true&propertySlug=${encodeURIComponent(propertySlug)}`
    : `${subdomainPath}/sign-up`;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First check if user has 2FA enabled
      const check2FARes = await fetch('/api/auth/email-2fa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const check2FAData = await check2FARes.json();

      if (check2FAData.requires2FA) {
        // User has 2FA enabled, show code input
        setStep('2fa');
        setResendCooldown(60);
        startCooldownTimer();
      } else {
        // No 2FA, proceed with normal sign-in
        await performSignIn();
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const performSignIn = async () => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('callbackUrl', callbackUrl);

    const res = await fetch('/api/auth/credentials-signin', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.success && data.redirectUrl) {
      router.push(data.redirectUrl);
    } else {
      setError(data.message || 'Invalid email or password');
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Verify the 2FA code
      const verifyRes = await fetch('/api/auth/email-2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: twoFactorCode }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setError(verifyData.message || 'Invalid code');
        setIsLoading(false);
        return;
      }

      // Code verified, now sign in
      await performSignIn();
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    try {
      await fetch('/api/auth/email-2fa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendCooldown(60);
      startCooldownTimer();
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const startCooldownTimer = () => {
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (step === '2fa') {
    return (
      <div className='space-y-4'>
        <button
          onClick={() => { setStep('credentials'); setTwoFactorCode(''); setError(''); }}
          className='flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to sign in
        </button>

        <div className='text-center space-y-2'>
          <div className='mx-auto w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center'>
            <Mail className='h-6 w-6 text-violet-400' />
          </div>
          <h2 className='text-xl font-semibold text-white'>Check your email</h2>
          <p className='text-sm text-slate-400'>
            We sent a verification code to <span className='text-white'>{email}</span>
          </p>
        </div>

        <form onSubmit={handle2FASubmit} className='space-y-4'>
          <div>
            <Label htmlFor='code'>Verification Code</Label>
            <Input
              id='code'
              type='text'
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder='000000'
              className='bg-white text-gray-900 border-gray-300 text-center text-2xl tracking-widest font-mono'
              maxLength={6}
              autoFocus
            />
          </div>

          <Button 
            type='submit' 
            disabled={isLoading || twoFactorCode.length !== 6} 
            className='w-full'
          >
            {isLoading ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Verifying...
              </>
            ) : (
              'Verify & Sign In'
            )}
          </Button>

          {error && (
            <div className='text-center text-destructive text-sm'>{error}</div>
          )}

          <div className='text-center'>
            <button
              type='button'
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || isLoading}
              className='text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {resendCooldown > 0 
                ? `Resend code in ${resendCooldown}s` 
                : "Didn't receive the code? Resend"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <OAuthButtons callbackUrl={callbackUrl} />
      
      <form onSubmit={handleCredentialsSubmit}>
        <input type='hidden' name='callbackUrl' value={callbackUrl} />
        <div className='space-y-6'>
          <div>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              name='email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete='email'
              className='bg-white text-gray-900 border-gray-300'
            />
          </div>
          <div>
            <Label htmlFor='password'>Password</Label>
            <Input
              id='password'
              name='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete='password'
              className='bg-white text-gray-900 border-gray-300'
            />
          </div>
          <div>
            <Button type='submit' disabled={isLoading} className='w-full'>
              {isLoading ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </div>

          {error && (
            <div className='text-center text-destructive'>{error}</div>
          )}

          <div className='text-sm text-right'>
            <Link href='/forgot-password' className='link'>
              Forgot Password?
            </Link>
          </div>

          <div className='text-sm text-center text-muted-foreground'>
            Don&apos;t have an account?{' '}
            <Link href={signUpUrl} target='_self' className='link'>
              Sign Up
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CredentialsSignInForm;
