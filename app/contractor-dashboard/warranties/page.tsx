import { Metadata } from 'next';
import { requireContractor } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Plus, CheckCircle, AlertTriangle, Clock, FileText, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Warranties | Contractor Portal',
};

export default async function WarrantiesPage() {
  const session = await requireContractor();
  const { id: userId } = session.user;

  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!contractorProfile) {
    return (
      <div className='w-full space-y-5'>
        <h1 className='text-xl font-bold text-black'>Warranties</h1>
        <p className='text-sm text-gray-500'>Contractor profile not found.</p>
      </div>
    );
  }

  const warranties = await prisma.$queryRaw`
    SELECT w.*, c.name as customerName 
    FROM "ContractorWarranty" w
    LEFT JOIN "ContractorCustomer" c ON w."customerId" = c.id
    WHERE w."contractorId" = ${contractorProfile.id}
    ORDER BY w."endDate" ASC
  `;

  const warrantyList = Array.isArray(warranties) ? warranties : [];
  const now = new Date();

  const activeCount = warrantyList.filter((w: any) => w.status === 'active' && new Date(w.endDate) > now).length;
  const expiringSoon = warrantyList.filter((w: any) => {
    if (w.status !== 'active') return false;
    const end = new Date(w.endDate);
    const ninetyDays = new Date(now);
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    return end <= ninetyDays && end > now;
  }).length;
  const expiredCount = warrantyList.filter((w: any) => new Date(w.endDate) <= now).length;
  const claimedCount = warrantyList.filter((w: any) => w.status === 'claimed').length;

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Warranties & Service Agreements</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Track warranty coverage and service agreements</p>
        </div>
        <Link href='/contractor-dashboard/warranties/new'>
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold self-start'>
            <Plus className='h-4 w-4 mr-2' /> New Warranty
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'Active', value: String(activeCount), icon: Shield, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Expiring Soon', value: String(expiringSoon), icon: Clock, gradient: 'from-amber-400 to-orange-400', alert: expiringSoon > 0 },
          { label: 'Expired', value: String(expiredCount), icon: AlertTriangle, gradient: 'from-red-400 to-rose-400' },
          { label: 'Claims', value: String(claimedCount), icon: FileText, gradient: 'from-violet-400 to-purple-400' },
        ].map(({ label, value, icon: Icon, gradient, alert }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
            {alert && <div className='absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500 animate-pulse' />}
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

      {/* Warranties List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Warranties</h3>
          <span className='text-xs text-gray-400'>{warrantyList.length} total</span>
        </div>

        {warrantyList.length === 0 ? (
          <div className='p-10 text-center'>
            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center'>
              <Shield className='h-7 w-7 text-gray-300' />
            </div>
            <h3 className='text-base font-bold text-gray-800 mb-1'>No warranties tracked yet</h3>
            <p className='text-sm text-gray-500 mb-4'>Add warranties to track coverage periods and auto-remind customers.</p>
            <Link href='/contractor-dashboard/warranties/new'>
              <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
                <Plus className='h-4 w-4 mr-2' /> Add First Warranty
              </Button>
            </Link>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {warrantyList.map((w: any) => {
              const endDate = new Date(w.endDate);
              const isExpired = endDate <= now;
              const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Link key={w.id} href={`/contractor-dashboard/warranties/${w.id}`} className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isExpired ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <Shield className={`h-4 w-4 ${isExpired ? 'text-red-400' : 'text-emerald-500'}`} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800 truncate'>{w.title}</p>
                    <p className='text-[10px] text-gray-500'>{w.customerName} · {w.warrantyType} · {w.durationMonths}mo</p>
                  </div>
                  <div className='text-right shrink-0'>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-50 text-red-600' : daysRemaining <= 90 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {isExpired ? 'Expired' : `${daysRemaining}d left`}
                    </span>
                    <p className='text-[10px] text-gray-400 mt-0.5'>Ends {endDate.toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className='h-4 w-4 text-gray-300 shrink-0' />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
