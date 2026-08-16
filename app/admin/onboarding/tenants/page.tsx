import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import TenantInviteForm from '@/components/admin/tenant-invite-form';

export const metadata: Metadata = {
  title: 'Invite tenants',
};

const TenantOnboardingPage = async () => {
  await requireAdmin();

  const landlordResult = await getOrCreateCurrentLandlord();
  const landlordName = landlordResult.success ? landlordResult.landlord.name : 'your properties';

  const currentStep = 3;
  const totalSteps = 4;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <main className='w-full px-4 py-8 md:px-0'>
      <div className='max-w-4xl mx-auto space-y-8'>
        <section className='space-y-4'>
          <div className='space-y-2'>
            <p className='text-xs font-semibold tracking-wide text-emerald-600 uppercase'>
              Setup progress
            </p>
            <div className='flex items-center justify-between gap-4'>
              <h1 className='text-2xl md:text-3xl font-semibold text-slate-900'>
                Invite tenants to {landlordName}
              </h1>
              <span className='text-xs md:text-sm font-medium text-slate-600 whitespace-nowrap'>
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <p className='text-sm md:text-base text-slate-600 max-w-2xl'>
              Send a simple invite so your tenants can create an account, sign leases, and pay rent online.
              You can invite more tenants anytime from the dashboard.
            </p>
          </div>
          <div className='w-full rounded-full bg-slate-200 h-3 overflow-hidden'>
            <div
              className='h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all'
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className='flex items-center justify-between text-[11px] md:text-xs text-slate-500'>
            <span>Profile</span>
            <span>Property</span>
            <span className='font-semibold text-emerald-600'>Tenants</span>
            <span>Payouts</span>
          </div>
        </section>

        <section className='rounded-3xl border border-slate-200 bg-white shadow-sm px-4 py-5 md:px-6 md:py-6 space-y-4'>
          <h2 className='text-lg md:text-xl font-semibold text-slate-900'>
            Send your first tenant invite
          </h2>
          <p className='text-sm md:text-base text-slate-600'>
            Enter a tenant&apos;s details below. We&apos;ll use your Settings to decide whether to send the invite by
            email, text message, or both. Right now, only email will be used; SMS support is being prepared.
          </p>
          <TenantInviteForm />
        </section>
      </div>
    </main>
  );
};

export default TenantOnboardingPage;
