import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { CustomerForm } from '@/components/contractor/customer-form';
import Link from 'next/link';
import { Lock, Zap } from 'lucide-react';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function NewCustomerPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    subscriptionTier: true,
  });

  if (!contractorProfile) {
    return redirect('/onboarding/contractor');
  }

  // Determine subscription tier
  const tier = contractorProfile.subscriptionTier || 'starter';

  // Check if CRM feature is available
  const hasCRMAccess = tier === 'pro' || tier === 'enterprise';

  if (!hasCRMAccess) {
    return (
      <main className="w-full px-4 py-10 md:px-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-8 text-center">
            <Lock className="h-12 w-12 text-violet-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Customer CRM</h1>
            <p className="text-slate-300 mb-6">
              Customer relationship management features are available on the Pro plan. 
              Upgrade to manage customers, track communication history, and grow your business.
            </p>
            <Link
              href="/contractor-dashboard/settings/subscription"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-full font-semibold transition-colors"
            >
              <Zap className="h-5 w-5" />
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Add New Customer</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Create a new customer record</p>
      </div>

      <CustomerForm />
    </div>
  );
}
