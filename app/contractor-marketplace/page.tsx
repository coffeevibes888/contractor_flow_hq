import ContractorMarketplace from '@/app/contractors/contractor-marketplace';
import {
  loadMarketplaceContractors,
  type MarketplaceSearchParams,
} from '@/lib/services/load-marketplace-contractors';

export const dynamic = 'force-dynamic';

export default async function ContractorMarketplacePage({
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
    console.error('Error loading contractor marketplace:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-950 via-orange-900 to-orange-950 flex items-center justify-center">
        <div className="bg-white/90 rounded-xl p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Unable to load marketplace</h1>
          <p className="text-slate-600">Please try again later.</p>
        </div>
      </div>
    );
  }
}
