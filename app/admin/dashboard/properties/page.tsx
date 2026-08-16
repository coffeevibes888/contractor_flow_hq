import Link from 'next/link';
import Pagination from '@/components/shared/pagination';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { PropertiesMobileList, PropertiesDesktopTable } from '@/components/admin/properties-list';
import { ListingToggleTip } from '@/components/admin/listing-toggle-tip';
import { Building2, Plus, Search, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20; // Increased for scale — 20 per page handles 500+ well

const AdminPropertiesPage = async (props: {
  searchParams: Promise<{
    page: string;
    query: string;
  }>;
}) => {
  await requireAdmin();

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    throw new Error(landlordResult.message || 'Unable to determine landlord');
  }
  const landlordId = landlordResult.landlord.id;

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const searchText = searchParams.query || '';

  const where = {
    landlordId,
    status: { not: 'deleted' },
    ...(searchText && searchText !== 'all'
      ? { name: { contains: searchText, mode: 'insensitive' as const } }
      : {}),
  };

  const [properties, totalCount] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        units: {
          select: {
            id: true,
            name: true,
            rentAmount: true,
            images: true,
            isAvailable: true,
            leases: {
              where: { status: 'active' },
              select: {
                id: true,
                tenant: { select: { name: true } },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.property.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const transformedProperties = properties.map((property) => {
    const firstImage = property.units.find(u => u.images?.length > 0)?.images?.[0] || null;
    const avail = property.units.filter(u => u.isAvailable);
    const lowestRent = avail.length > 0
      ? Math.min(...avail.map(u => Number(u.rentAmount)))
      : property.units.length > 0
      ? Math.min(...property.units.map(u => Number(u.rentAmount)))
      : 0;

    return {
      id: property.id,
      name: property.name,
      type: property.type,
      isPublished: property.isPublished,
      firstImage,
      lowestRent,
      availableUnitsCount: avail.length,
      units: property.units.map(u => ({
        id: u.id,
        name: u.name,
        rentAmount: Number(u.rentAmount),
        isAvailable: u.isAvailable,
        hasActiveLease: u.leases && u.leases.length > 0,
        tenantName: u.leases?.[0]?.tenant?.name,
        leaseId: u.leases?.[0]?.id,
      })),
    };
  });

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Properties</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage your buildings and units
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Link
            href='/admin/tenants/add'
            className='px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center gap-1.5'
          >
            <Plus className='h-3.5 w-3.5' />
            Add Tenant
          </Link>
          <Link
            href='/admin/dashboard/properties/new'
            className='px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5'
          >
            <Plus className='h-3.5 w-3.5' />
            Add Property
          </Link>
        </div>
      </div>

      {/* Listing toggle explainer */}
      <ListingToggleTip />

      {/* Search */}
      <div className='flex items-center gap-3'>
        <form className='relative flex-1' action='/admin/dashboard/properties' method='GET'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
          <input
            name='query'
            type='text'
            placeholder='Search properties...'
            defaultValue={searchText}
            className='w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all'
          />
        </form>
        {searchText && (
          <Link
            href='/admin/dashboard/properties'
            className='text-xs text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap'
          >
            Clear filter
          </Link>
        )}
        <span className='text-xs text-gray-400 whitespace-nowrap'>
          Page {page} of {totalPages || 1}
        </span>
      </div>

      {/* Properties List */}
      {transformedProperties.length === 0 ? (
        <div className='rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm'>
          <Building2 className='mx-auto h-12 w-12 text-gray-300 mb-4' />
          <h3 className='text-lg font-semibold text-gray-800 mb-2'>
            {searchText ? 'No properties match your search' : 'No Properties Yet'}
          </h3>
          <p className='text-sm text-gray-500 mb-4 max-w-md mx-auto'>
            {searchText
              ? `No properties found for "${searchText}". Try a different search.`
              : 'Add your first property to start managing units and tenants.'}
          </p>
          {!searchText && (
            <Link
              href='/admin/dashboard/properties/new'
              className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md hover:shadow-lg transition-all'
            >
              <Plus className='h-4 w-4' />
              Add Property
            </Link>
          )}
        </div>
      ) : (
        <>
          <PropertiesMobileList properties={transformedProperties} />
          <PropertiesDesktopTable properties={transformedProperties} />
        </>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} />
      )}
    </div>
  );
};

export default AdminPropertiesPage;
