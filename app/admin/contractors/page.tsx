import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { normalizeTier } from '@/lib/config/subscription-tiers';
import ContractorWorkPage from '@/components/admin/contractor-work-page';

export const metadata: Metadata = {
  title: 'Contractor Work | Admin',
  description: 'Manage contractors, work orders, and payments',
};

export default async function ContractorsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const landlordResult = await getOrCreateCurrentLandlord();
  
  if (!landlordResult.success || !landlordResult.landlord) {
    redirect('/admin');
  }

  const tier = normalizeTier(landlordResult.landlord.subscriptionTier);
  
  if (tier === 'starter') {
    return (
      <div className="container mx-auto py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-amber-800 mb-2">
            PRO Feature
          </h2>
          <p className="text-amber-700 mb-4">
            Contractor management is available on PRO and Enterprise plans.
            Upgrade to manage contractors, create work orders, and pay them directly.
          </p>
          <a
            href="/admin/settings/subscription"
            className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Upgrade to PRO
          </a>
        </div>
      </div>
    );
  }

  return <ContractorWorkPage />;
}
