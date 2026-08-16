import { Metadata } from 'next';
import ContractorMarketplace from './contractor-marketplace';
import {
  loadMarketplaceContractors,
  type MarketplaceSearchParams,
} from '@/lib/services/load-marketplace-contractors';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contractor Marketplace | Property Flow HQ',
  description:
    'Browse verified contractors or find open jobs for your property maintenance needs',
};

/**
 * Legacy `/contractors` marketplace route. `/contractors` (exact) is
 * 301-redirected to `/contractor-marketplace` in next.config.ts, so this
 * page normally isn't rendered — but the deeper `/contractors/:id` and
 * `/contractors/jobs/:id` routes ARE live. We keep this thin (delegating to
 * the shared loader) so it stays correct if the redirect ever changes,
 * without duplicating the marketplace data-loading logic.
 */
export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<MarketplaceSearchParams>;
}) {
  try {
    const params = await searchParams;
    const { contractors, openJobsCount, normalizedSpecialty } =
      await loadMarketplaceContractors(params);

    return (
      <ContractorMarketplace
        initialView={params.view === 'jobs' ? 'jobs' : 'contractors'}
        contractors={contractors}
        openJobsCount={openJobsCount}
        searchParams={params}
        activeSpecialty={normalizedSpecialty}
      />
    );
  } catch (error) {
    console.error('Error loading contractors page:', error);
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-600 flex items-center justify-center">
        <div className="bg-white/90 rounded-xl p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Unable to load contractors</h1>
          <p className="text-slate-600">Please try again later.</p>
        </div>
      </div>
    );
  }
}
