import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, TrendingDown, DollarSign, Plus, Download, Search, Lock, Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { InventoryList } from '@/components/contractor/inventory-list';
import { canAccessFeature } from '@/lib/services/contractor-feature-gate';
import { formatCurrency } from '@/lib/utils';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function InventoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    subscriptionTier: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  // Ensure usage tracking exists
  await prisma.contractorUsageTracking.upsert({
    where: { contractorId: contractorProfile.id },
    update: {},
    create: {
      contractorId: contractorProfile.id,
      activeJobsCount: 0,
      invoicesThisMonth: 0,
      totalCustomers: 0,
      teamMembersCount: 0,
      inventoryCount: 0,
      equipmentCount: 0,
      activeLeadsCount: 0,
    },
  });

  const featureAccess = await canAccessFeature(contractorProfile.id, 'inventory');

  if (!featureAccess.allowed) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Inventory Management</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Track materials, supplies, and stock levels</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-emerald-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Inventory Management</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Inventory management is available on the Pro plan. Upgrade to track materials,
            manage stock levels, and optimize your supply chain.
          </p>
          <div className='flex flex-wrap gap-3 justify-center mb-6'>
            {['📦 Stock Tracking', '🔔 Low Stock Alerts', '💰 Cost Management', '📊 Usage Reports'].map((label) => (
              <div key={label} className='px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700'>{label}</div>
            ))}
          </div>
          <Link href='/contractor-dashboard/settings/subscription' className='inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'>
            <Zap className='h-4 w-4' /> Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const rawItems = await prisma.contractorInventoryItem.findMany({
    where: { contractorId: contractorProfile.id },
    include: { vendor: { select: { id: true, name: true, contactName: true } } },
    orderBy: { name: 'asc' },
  });

  const items = rawItems.map((item) => ({
    ...item,
    unitCost: Number(item.unitCost),
    costPerUnit: Number(item.costPerUnit),
  }));

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost), 0);
  const lowStockItems = items.filter((item) => item.reorderPoint && item.quantity <= item.reorderPoint).length;
  const outOfStockItems = items.filter((item) => item.quantity === 0).length;

  const lowStockAlerts = items
    .filter((item) => item.reorderPoint && item.quantity <= item.reorderPoint)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Inventory Management</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Track materials, supplies, and stock levels</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm text-xs'>
            <Download className='h-3.5 w-3.5 mr-1.5' /> Export
          </Button>
          <Link href='/contractor-dashboard/inventory/new'>
            <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold'>
              <Plus className='h-4 w-4 mr-2' /> Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'Total Items', value: String(totalItems), icon: Package, gradient: 'from-blue-400 to-indigo-400' },
          { label: 'Total Value', value: formatCurrency(totalValue), icon: DollarSign, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Low Stock', value: String(lowStockItems), icon: TrendingDown, gradient: 'from-amber-400 to-orange-400', alert: lowStockItems > 0 },
          { label: 'Out of Stock', value: String(outOfStockItems), icon: AlertTriangle, gradient: 'from-red-400 to-rose-400', alert: outOfStockItems > 0 },
        ].map(({ label, value, icon: Icon, gradient, alert }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
            {alert && <div className='absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse' />}
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-[10px] text-gray-500 font-medium'>{label}</p>
                <p className='text-xl font-bold text-gray-900 mt-0.5'>{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                <Icon className='h-4 w-4' />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className='rounded-xl border border-amber-200 bg-amber-50 overflow-hidden'>
          <div className='flex items-center gap-2 p-4 border-b border-amber-100'>
            <AlertTriangle className='h-4 w-4 text-amber-600' />
            <h3 className='text-sm font-bold text-amber-800'>Low Stock Alerts</h3>
          </div>
          <div className='divide-y divide-amber-100'>
            {lowStockAlerts.map((item) => (
              <div key={item.id} className='flex items-center gap-3 px-4 py-3'>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-semibold text-gray-800 truncate'>{item.name}</p>
                  <p className='text-[10px] text-gray-500'>{item.category} · SKU: {item.sku || 'N/A'}</p>
                </div>
                <div className='text-right shrink-0'>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.quantity === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {item.quantity} {item.unit}
                  </span>
                  <p className='text-[10px] text-gray-400 mt-0.5'>Reorder at {item.reorderPoint}</p>
                </div>
                {item.vendor && (
                  <Link href={`/contractor-dashboard/vendors/${item.vendor.id}`}>
                    <Button size='sm' className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs h-7'>
                      Reorder
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Inventory</h3>
          <span className='text-xs text-gray-400'>{totalItems} items</span>
        </div>
        <div className='p-4'>
          <InventoryList items={items} />
        </div>
      </div>
    </div>
  );
}
