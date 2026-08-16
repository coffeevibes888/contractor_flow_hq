import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Wrench, AlertCircle, CheckCircle, DollarSign, Plus, Download, Lock, Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { EquipmentList } from '@/components/contractor/equipment-list';
import { canAccessFeature } from '@/lib/services/contractor-feature-gate';
import { formatCurrency } from '@/lib/utils';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function EquipmentPage() {
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

  const featureAccess = await canAccessFeature(contractorProfile.id, 'equipment');

  if (!featureAccess.allowed) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Equipment Tracking</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage tools, equipment, and maintenance schedules</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-orange-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Equipment Management</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Equipment management is available on the Pro plan. Upgrade to track tools,
            manage maintenance schedules, and optimize equipment utilization.
          </p>
          <div className='flex flex-wrap gap-3 justify-center mb-6'>
            {['🔧 Equipment Tracking', '📅 Maintenance Schedules', '👷 Assignment Tracking', '💵 Asset Management'].map((label) => (
              <div key={label} className='px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700'>{label}</div>
            ))}
          </div>
          <Link href='/contractor-dashboard/settings/subscription' className='inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'>
            <Zap className='h-4 w-4' /> Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const equipment = await prisma.contractorEquipment.findMany({
    where: { contractorId: contractorProfile.id },
    orderBy: { name: 'asc' },
  });

  const totalEquipment = equipment.length;
  const totalValue = equipment.reduce((sum, item) => sum + Number(item.purchasePrice || 0), 0);
  const assigned = equipment.filter((item) => item.assignedToId).length;
  const needsMaintenance = equipment.filter(
    (item) => item.nextMaintenanceDate && new Date(item.nextMaintenanceDate) <= new Date()
  ).length;

  const maintenanceAlerts = equipment
    .filter((item) => item.nextMaintenanceDate && new Date(item.nextMaintenanceDate) <= new Date())
    .sort((a, b) => new Date(a.nextMaintenanceDate!).getTime() - new Date(b.nextMaintenanceDate!).getTime())
    .slice(0, 5);

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Equipment Tracking</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage tools, equipment, and maintenance schedules</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm text-xs'>
            <Download className='h-3.5 w-3.5 mr-1.5' /> Export
          </Button>
          <Link href='/contractor-dashboard/equipment/new'>
            <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold'>
              <Plus className='h-4 w-4 mr-2' /> Add Equipment
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'Total Equipment', value: String(totalEquipment), icon: Wrench, gradient: 'from-blue-400 to-indigo-400' },
          { label: 'Total Value', value: formatCurrency(totalValue), icon: DollarSign, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Assigned', value: String(assigned), icon: CheckCircle, gradient: 'from-violet-400 to-purple-400' },
          { label: 'Needs Service', value: String(needsMaintenance), icon: AlertCircle, gradient: 'from-amber-400 to-orange-400', alert: needsMaintenance > 0 },
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

      {/* Maintenance Alerts */}
      {maintenanceAlerts.length > 0 && (
        <div className='rounded-xl border border-amber-200 bg-amber-50 overflow-hidden'>
          <div className='flex items-center gap-2 p-4 border-b border-amber-100'>
            <AlertCircle className='h-4 w-4 text-amber-600' />
            <h3 className='text-sm font-bold text-amber-800'>Maintenance Due</h3>
          </div>
          <div className='divide-y divide-amber-100'>
            {maintenanceAlerts.map((item) => (
              <div key={item.id} className='flex items-center gap-3 px-4 py-3'>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-semibold text-gray-800 truncate'>{item.name}</p>
                  <p className='text-[10px] text-gray-500'>{item.type} · Serial: {item.serialNumber || 'N/A'}</p>
                </div>
                <div className='text-right shrink-0'>
                  <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600'>
                    Due {new Date(item.nextMaintenanceDate!).toLocaleDateString()}
                  </span>
                  {item.assignedToName && (
                    <p className='text-[10px] text-gray-400 mt-0.5'>Assigned to {item.assignedToName}</p>
                  )}
                </div>
                <Link href={`/contractor-dashboard/equipment/${item.id}/maintenance`}>
                  <Button size='sm' className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs h-7'>
                    Schedule
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Equipment</h3>
          <span className='text-xs text-gray-400'>{totalEquipment} items</span>
        </div>
        <div className='p-4'>
          <EquipmentList equipment={equipment} />
        </div>
      </div>
    </div>
  );
}
