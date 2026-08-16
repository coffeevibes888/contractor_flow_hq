'use client';

import { useState, useEffect } from 'react';
import { X, Gift, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const shown = localStorage.getItem('exitIntentShown');
    if (shown) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      localStorage.setItem('exitIntentShown', 'true');
    }, 20000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={() => setIsVisible(false)}
      />

      {/* Modal */}
      <div className='relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-10 animate-in zoom-in-95 duration-300'>
        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className='absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors'
          aria-label='Close popup'
        >
          <X className='h-6 w-6' />
        </button>

        {/* Content */}
        <div className='text-center space-y-6'>
          <div className='inline-flex items-center justify-center rounded-full bg-violet-50 p-4 border border-violet-100'>
            <Gift className='h-10 w-10 text-violet-600' />
          </div>

          <h2 className='text-3xl font-bold text-slate-900'>
            Wait! Don't Miss Out
          </h2>

          <p className='text-slate-600 text-base leading-relaxed'>
            Try Property Flow HQ free for 14 days. <span className='text-violet-600 font-bold'>No charge until day 15.</span>
          </p>

          <div className='bg-slate-50 border border-slate-100 rounded-xl p-6 text-left'>
            <ul className='space-y-2 text-sm text-slate-600'>
              <li className='flex items-center gap-2'>
                <span className='text-emerald-500 font-bold'>✓</span> Online rent collection
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-emerald-500 font-bold'>✓</span> Maintenance tracking
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-emerald-500 font-bold'>✓</span> Digital leases & e-signatures
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-emerald-500 font-bold'>✓</span> Your own branded tenant portal
              </li>
            </ul>
          </div>

          <div className='space-y-4 pt-2'>
            <Link
              href='/sign-up?role=landlord&plan=starter&skipOnboarding=true'
              className='group w-full inline-flex items-center justify-center rounded-full bg-violet-600 text-white px-8 py-4 text-lg font-bold shadow-xl hover:bg-violet-500 transition-all duration-300 hover:scale-105 hover:shadow-violet-500/25'
            >
              Start 14-day free trial
              <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
            </Link>


            <button
              onClick={() => setIsVisible(false)}
              className='w-full text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors'
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
