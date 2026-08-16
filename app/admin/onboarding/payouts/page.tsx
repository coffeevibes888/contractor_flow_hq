import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import PayoutsVerificationPanel from '@/components/admin/payouts-verification-panel';

export const metadata: Metadata = {
  title: 'Connect payouts',
};

const PayoutsOnboardingPage = async () => {
  await requireAdmin();

  const landlordResult = await getOrCreateCurrentLandlord();
  const landlordName = landlordResult.success ? landlordResult.landlord.name : 'your properties';
  const hasStripeAccount = Boolean(landlordResult.success && landlordResult.landlord.stripeConnectAccountId);

  const currentStep = 4;
  const totalSteps = 4;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <main className='w-full px-4 py-8 md:px-0'>
      <div className='max-w-4xl mx-auto space-y-8'>
        <section className='space-y-4'>
          <div className='space-y-2'>
            <p className='text-xs font-semibold tracking-wide text-blue-600 uppercase'>
              Setup progress
            </p>
            <div className='flex items-center justify-between gap-4'>
              <h1 className='text-2xl md:text-3xl font-semibold text-slate-900'>
                Connect payouts for {landlordName}
              </h1>
              <span className='text-xs md:text-sm font-medium text-slate-600 whitespace-nowrap'>
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <p className='text-sm md:text-base text-slate-600 max-w-2xl'>
              Link your bank account so you can cash out collected rent. Your banking details are encrypted and securely processed.
            </p>
          </div>
          <div className='w-full rounded-full bg-slate-200 h-3 overflow-hidden'>
            <div
              className='h-3 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all'
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className='flex items-center justify-between text-[11px] md:text-xs text-slate-500'>
            <span>Profile</span>
            <span>Property</span>
            <span>Tenants</span>
            <span className='font-semibold text-blue-600'>Payouts</span>
          </div>
        </section>

        <section className='rounded-3xl border border-slate-200 bg-white shadow-sm px-4 py-5 md:px-6 md:py-6 space-y-4'>
          <h2 className='text-lg md:text-xl font-semibold text-slate-900'>
            {hasStripeAccount ? 'Almost there' : 'Set up your payout account'}
          </h2>
          <p className='text-sm md:text-base text-slate-600'>
            Complete a quick verification to cash out rent payments to your bank account.
          </p>
          <ul className='list-disc list-inside text-sm md:text-base text-slate-600 space-y-1'>
            <li>Confirm your business or personal details</li>
            <li>Add a bank account for standard payouts</li>
            <li>Optionally add a debit card for instant cashouts</li>
          </ul>
          <div className='pt-3'>
            <PayoutsVerificationPanel />
          </div>
        </section>
      </div>
    </main>
  );
};

export default PayoutsOnboardingPage;
