import { requireAdmin } from '@/lib/auth-guard';
import { getLandlordInvoices } from '@/lib/actions/invoice.actions';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import InvoiceList from './invoice-list';
import CreateInvoiceForm from './create-invoice-form';

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string; propertyId?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const preselectedUnitId = params.unitId;
  const preselectedPropertyId = params.propertyId;

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    return (
      <main className='w-full min-h-[calc(100vh-4rem)] flex items-center justify-center'>
        <p className='text-gray-500'>Unable to load invoices.</p>
      </main>
    );
  }

  const [invoicesResult, properties] = await Promise.all([
    getLandlordInvoices(),
    prisma.property.findMany({
      where: { landlordId: landlordResult.landlord.id },
      include: {
        units: {
          select: {
            id: true,
            name: true,
            leases: {
              where: { status: 'active' },
              select: {
                id: true,
                tenant: {
                  select: { id: true, name: true, email: true },
                },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Find preselected unit info if unitId is provided
  let preselectedInfo: { propertyId: string; tenantId: string; leaseId: string } | null = null;
  if (preselectedUnitId) {
    for (const property of properties) {
      const unit = property.units.find((u) => u.id === preselectedUnitId);
      if (unit && unit.leases[0]) {
        preselectedInfo = {
          propertyId: property.id,
          tenantId: unit.leases[0].tenant?.id || '',
          leaseId: unit.leases[0].id,
        };
        break;
      }
    }
  }

  const invoices = invoicesResult.invoices || [];

  // Stats
  const totalPending = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const countPending = invoices.filter((i) => i.status === 'pending').length;
  const countOverdue = invoices.filter((i) => i.status === 'overdue').length;

  return (
    <div className='w-full space-y-5'>

      {/* Page header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Invoices</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Create, manage, and send invoices to your tenants
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-semibold uppercase tracking-wider'>Total Invoices</p>
          <p className='text-2xl font-bold text-gray-900 mt-1'>{invoices.length}</p>
        </div>
        <div className='rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm'>
          <p className='text-[10px] text-amber-600 font-semibold uppercase tracking-wider'>Pending</p>
          <p className='text-2xl font-bold text-amber-600 mt-1'>{countPending}</p>
          <p className='text-xs text-gray-500 mt-0.5'>${totalPending.toFixed(2)} owed</p>
        </div>
        <div className='rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm'>
          <p className='text-[10px] text-red-600 font-semibold uppercase tracking-wider'>Overdue</p>
          <p className='text-2xl font-bold text-red-600 mt-1'>{countOverdue}</p>
          <p className='text-xs text-gray-500 mt-0.5'>${totalOverdue.toFixed(2)} past due</p>
        </div>
        <div className='rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm'>
          <p className='text-[10px] text-emerald-600 font-semibold uppercase tracking-wider'>Collected</p>
          <p className='text-2xl font-bold text-emerald-600 mt-1'>${totalPaid.toFixed(2)}</p>
          <p className='text-xs text-gray-500 mt-0.5'>all time</p>
        </div>
      </div>

      {/* Create Invoice — full width card */}
      <div className='relative rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 shadow-md overflow-hidden'>
        <div className='absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-cyan-200/20 to-transparent rounded-bl-full pointer-events-none' />
        <div className='relative px-5 py-4 border-b border-sky-100'>
          <h2 className='text-base font-semibold text-gray-900'>New Invoice</h2>
          <p className='text-xs text-gray-500 mt-0.5'>Issue a charge to any tenant or recipient</p>
        </div>
        <div className='relative p-5'>
          <CreateInvoiceForm
            properties={properties}
            preselectedPropertyId={preselectedInfo?.propertyId || preselectedPropertyId}
            preselectedTenantId={preselectedInfo?.tenantId}
            preselectedLeaseId={preselectedInfo?.leaseId}
          />
        </div>
      </div>

      {/* All Invoices — full width card */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='px-5 py-4 border-b border-gray-100'>
          <h2 className='text-base font-semibold text-gray-900'>All Invoices</h2>
          <p className='text-xs text-gray-500 mt-0.5'>{invoices.length} total</p>
        </div>
        <div className='p-5'>
          <InvoiceList invoices={invoices} />
        </div>
      </div>

    </div>
  );
}
