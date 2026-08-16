'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function NewsletterSignup() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Treat both /?for=contractor and /contractor as the contractor side.
  const isContractor =
    searchParams.get('for') === 'contractor' || pathname?.startsWith('/contractor');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: isContractor ? 'homepage-contractor' : 'homepage' }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Thanks for subscribing! Check your inbox for a welcome email.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <section
      className={`w-full py-10 md:py-16 px-4 md:px-4 ${
        isContractor
          ? 'bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50'
          : 'bg-blue-50'
      }`}
    >
      <div className='max-w-3xl mx-auto'>
        <div className='text-center space-y-5'>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${
              isContractor
                ? 'bg-white border border-rose-200'
                : 'bg-white border border-blue-200'
            }`}
          >
            <Mail
              className={`h-3.5 w-3.5 ${isContractor ? 'text-rose-500' : 'text-blue-600'}`}
            />
            <span
              className={`text-xs font-bold ${
                isContractor ? 'text-rose-700' : 'text-blue-700'
              }`}
            >
              Not Ready to Sign Up Yet?
            </span>
          </div>

          <h3 className='text-2xl md:text-3xl font-black text-slate-900'>
            {isContractor ? (
              <>
                Get Free Tips to Grow Your Business.
                <br className='hidden sm:block' />
                <span className='bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent'>
                  No Commitment Required.
                </span>
              </>
            ) : (
              <>
                Get Free Property Management Tips.
                <br className='hidden sm:block' />
                <span className='text-cyan-600'>No Commitment Required.</span>
              </>
            )}
          </h3>
          <p className='text-slate-700 text-sm md:text-base max-w-xl mx-auto font-medium'>
            {isContractor
              ? 'Join contractors getting weekly tips on winning more jobs, invoicing faster, managing crews, and growing revenue — straight to your inbox.'
              : 'Join landlords getting weekly tips on rent collection, tenant screening, and cutting software costs — straight to your inbox.'}
          </p>

          {status === 'success' ? (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 ${
                isContractor
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              }`}
            >
              <CheckCircle2 className='h-5 w-5' />
              <span className='text-sm font-semibold'>{message}</span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className='flex flex-col sm:flex-row gap-3 max-w-lg mx-auto'
            >
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='Your email address'
                className={`flex-1 rounded-full bg-white px-5 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent ${
                  isContractor
                    ? 'border border-rose-200 focus:ring-rose-300'
                    : 'border border-blue-200 focus:ring-blue-300'
                }`}
                required
              />
              <button
                type='submit'
                disabled={status === 'loading'}
                className={`group inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg whitespace-nowrap ${
                  isContractor
                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 shadow-rose-500/30'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-blue-500/30'
                }`}
              >
                {status === 'loading' ? (
                  'Sending...'
                ) : (
                  <>
                    Send Me Tips
                    <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                  </>
                )}
              </button>
            </form>
          )}

          {status === 'error' && <p className='text-sm text-red-600'>{message}</p>}

          <p className='text-slate-500 text-xs'>No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
}
