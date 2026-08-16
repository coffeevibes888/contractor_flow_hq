import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  Star,
  ShoppingCart,
  Plus,
  Download,
  Search,
  Lock,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { VendorList } from '@/components/contractor/vendor-list';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function VendorsPage() {
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

  const tier = contractorProfile.subscriptionTier || 'starter';
  const hasAccess = tier === 'pro' || tier === 'enterprise';

  if (!hasAccess) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Vendor Management</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage suppliers and track purchases</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-indigo-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Vendor Management</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Vendor management is available on the Pro plan. Upgrade to track suppliers,
            manage purchase orders, and keep your supply chain organized.
          </p>
          <Link href='/contractor-dashboard/settings/subscription' className='inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'>
            <Zap className='h-4 w-4' /> Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  // Fetch vendors
  const vendors = await prisma.contractorVendor.findMany({
    where: { contractorId: contractorProfile.id },
    orderBy: { name: 'asc' },
  });

  // Calculate stats
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.isActive).length;
  const avgRating =
    vendors.reduce((sum, v) => sum + Number(v.rating || 0), 0) / totalVendors || 0;
  const totalOrders = vendors.reduce((sum, v) => sum + v.totalOrders, 0);

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Vendor Management</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage suppliers and track purchases</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm text-xs'>
            <Download className='h-3.5 w-3.5 mr-1.5' /> Export
          </Button>
          <Link href='/contractor-dashboard/vendors/new'>
            <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold'>
              <Plus className='h-4 w-4 mr-2' /> Add Vendor
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'Total Vendors', value: String(totalVendors), icon: Store, gradient: 'from-blue-400 to-indigo-400' },
          { label: 'Active', value: String(activeVendors), icon: ShoppingCart, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Avg Rating', value: `${avgRating.toFixed(1)} ★`, icon: Star, gradient: 'from-amber-400 to-orange-400' },
          { label: 'Total Orders', value: String(totalOrders), icon: ShoppingCart, gradient: 'from-violet-400 to-purple-400' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
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

      {/* Vendors List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Vendors</h3>
          <span className='text-xs text-gray-400'>{totalVendors} total</span>
        </div>
        <div className='p-4'>
          <VendorList vendors={vendors} />
        </div>
      </div>
    </div>
  );
}
