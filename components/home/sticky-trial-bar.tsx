'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { X, ArrowRight, Zap } from 'lucide-react';

export default function StickyTrialBar() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isContractor =
    searchParams.get('for') === 'contractor' || pathname?.startsWith('/contractor') || pathname === '/';

  useEffect(() => {
    const dismissed = sessionStorage.getItem('stickyBarDismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const handleScroll = () => {
      if (window.scrollY > 500 && !isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem('stickyBarDismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className='fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-500 max-w-[100vw] overflow-hidden'>
      <div
        className={`flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 w-full overflow-hidden shadow-[0_-4px_24px_rgba(0,0,0,0.18)] ${
          isContractor
            ? 'bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500'
            : 'bg-gradient-to-r from-cyan-600 via-blue-500 to-blue-600'
        }`}
      >
        {/* Left — message */}
        <div className='flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1'>
          <Zap className='h-4 w-4 text-yellow-300 shrink-0' />
          <p className='text-xs sm:text-sm font-semibold text-white truncate min-w-0'>
            <span className='hidden sm:inline'>
              {isContractor
                ? 'Angi & Thumbtack charge hundreds per month. We\'re $99/mo unlimited with a '
                : 'Buildium starts at $55/mo. AppFolio at $280/mo. We start at $39 with a '}
            </span>
            <span className='text-yellow-300 font-bold'>14-day free trial — no credit card.</span>
          </p>
        </div>

        {/* Right — CTA + dismiss */}
        <div className='flex items-center gap-1 sm:gap-2 shrink-0'>
          <Link
            href={isContractor ? '/sign-up?role=contractor' : '/sign-up'}
            className='inline-flex items-center gap-1 sm:gap-1.5 bg-white text-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold hover:bg-yellow-50 transition-colors shadow-md whitespace-nowrap'
          >
            Start free trial
            <ArrowRight className='h-3.5 w-3.5' />
          </Link>
          <button
            onClick={handleDismiss}
            aria-label='Dismiss'
            className='text-white/70 hover:text-white transition-colors p-1 shrink-0'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
      </div>
    </div>
  );
}
