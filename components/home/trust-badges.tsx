import { Shield, Lock, CreditCard, CheckCircle2 } from 'lucide-react';

export default function TrustBadges() {
  return (
    <section className='w-full py-8 md:py-12 px-3 md:px-4 '>
      <div className='max-w-6xl mx-auto'>
        <div className='rounded-2xl border border-slate-200 bg-white shadow-md p-6 md:p-8'>
          <div className='text-center mb-6 md:mb-8'>
            <h3 className='text-lg md:text-xl font-bold text-slate-900 mb-2'>
              Trusted by Property Managers Nationwide
            </h3>
            <p className='text-xs md:text-sm text-slate-600'>
              Enterprise-grade security and reliability for landlords of all sizes
            </p>
          </div>

          <div className='flex flex-wrap justify-center gap-6 md:gap-10'>
            {/* SSL Secured */}
            <div className='flex flex-col items-center text-center space-y-2'>
              <div className='rounded-full bg-emerald-500/20 p-3 border border-emerald-500/30'>
                <Lock className='h-5 w-5 md:h-6 md:w-6 text-emerald-400' />
              </div>
              <div>
                <p className='text-xs md:text-sm font-semibold text-slate-900'>SSL Secured</p>
                <p className='text-[10px] md:text-xs text-slate-600'>256-bit encryption</p>
              </div>
            </div>

            {/* PCI Compliant */}
            <div className='flex flex-col items-center text-center space-y-2'>
              <div className='rounded-full bg-blue-500/20 p-3 border border-blue-500/30'>
                <CreditCard className='h-5 w-5 md:h-6 md:w-6 text-blue-400' />
              </div>
              <div>
                <p className='text-xs md:text-sm font-semibold text-slate-900'>PCI Compliant</p>
                <p className='text-[10px] md:text-xs text-slate-600'>Stripe powered</p>
              </div>
            </div>

            {/* Data Protected */}
            <div className='flex flex-col items-center text-center space-y-2'>
              <div className='rounded-full bg-violet-500/20 p-3 border border-violet-500/30'>
                <Shield className='h-5 w-5 md:h-6 md:w-6 text-violet-400' />
              </div>
              <div>
                <p className='text-xs md:text-sm font-semibold text-slate-900'>Data Protected</p>
                <p className='text-[10px] md:text-xs text-slate-600'>Bank-level security</p>
              </div>
            </div>

            {/* 99.9% Uptime */}
            <div className='flex flex-col items-center text-center space-y-2'>
              <div className='rounded-full bg-cyan-500/20 p-3 border border-cyan-500/30'>
                <CheckCircle2 className='h-5 w-5 md:h-6 md:w-6 text-cyan-400' />
              </div>
              <div>
                <p className='text-xs md:text-sm font-semibold text-slate-900'>99.9% Uptime</p>
                <p className='text-[10px] md:text-xs text-slate-600'>Always available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
