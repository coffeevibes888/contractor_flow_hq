import { Metadata } from 'next';
import { requireContractor } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, Phone, Mail, Star, Plus, AlertTriangle, ChevronRight, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Subcontractors | Contractor Portal',
};

export default async function SubcontractorsPage() {
  const session = await requireContractor();
  const { id: userId } = session.user;

  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!contractorProfile) {
    return (
      <div className='w-full space-y-5'>
        <h1 className='text-xl font-bold text-black'>Subcontractor Management</h1>
        <p className='text-sm text-gray-500'>Contractor profile not found.</p>
      </div>
    );
  }

  const subcontractors = await prisma.$queryRaw`
    SELECT * FROM "ContractorSubcontractor"
    WHERE "contractorId" = ${contractorProfile.id}
    ORDER BY "companyName" ASC
  `;

  const subs = Array.isArray(subcontractors) ? subcontractors : [];

  const activeCount = subs.filter((s: any) => s.status === 'active').length;
  const inactiveCount = subs.filter((s: any) => s.status === 'inactive').length;
  const expiringInsurance = subs.filter((s: any) => {
    if (!s.insuranceExpiry) return false;
    const expiry = new Date(s.insuranceExpiry);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays && s.status === 'active';
  }).length;

  const avgRating = subs.length > 0
    ? (subs.reduce((acc: number, s: any) => acc + (s.rating || 0), 0) / subs.length).toFixed(1)
    : '0.0';

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Subcontractors</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage your subcontractor network</p>
        </div>
        <Link href='/contractor-dashboard/subcontractors/new'>
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold self-start'>
            <Plus className='h-4 w-4 mr-2' />
            Add Subcontractor
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'Active Subs', value: String(activeCount), icon: Building2, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Inactive', value: String(inactiveCount), icon: Users, gradient: 'from-gray-400 to-slate-400' },
          { label: 'Expiring Insurance', value: String(expiringInsurance), icon: AlertTriangle, gradient: 'from-amber-400 to-orange-400', alert: expiringInsurance > 0 },
          { label: 'Avg Rating', value: `${avgRating} ★`, icon: Star, gradient: 'from-yellow-400 to-amber-400' },
        ].map(({ label, value, icon: Icon, gradient, alert }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
            {alert && <div className='absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse' />}
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-[10px] text-gray-500 font-medium'>{label}</p>
                <p className='text-2xl font-bold text-gray-900 mt-0.5'>{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                <Icon className='h-4 w-4' />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expiring Insurance Alert */}
      {expiringInsurance > 0 && (
        <div className='flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium'>
          <AlertTriangle className='h-3.5 w-3.5' />
          {expiringInsurance} subcontractor{expiringInsurance > 1 ? 's have' : ' has'} insurance expiring within 30 days
        </div>
      )}

      {/* Subcontractors List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>Your Subcontractors</h3>
          <span className='text-xs text-gray-400'>{subs.length} total</span>
        </div>

        {subs.length === 0 ? (
          <div className='p-10 text-center'>
            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center'>
              <Building2 className='h-7 w-7 text-gray-300' />
            </div>
            <h3 className='text-base font-bold text-gray-800 mb-1'>No subcontractors yet</h3>
            <p className='text-sm text-gray-500 mb-4'>Add subcontractors to assign them to jobs and track their work.</p>
            <Link href='/contractor-dashboard/subcontractors/new'>
              <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
                <Plus className='h-4 w-4 mr-2' />
                Add Your First Subcontractor
              </Button>
            </Link>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {subs.map((sub: any) => {
              const isInsuranceExpiring = sub.insuranceExpiry &&
                new Date(sub.insuranceExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              return (
                <Link
                  key={sub.id}
                  href={`/contractor-dashboard/subcontractors/${sub.id}`}
                  className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'
                >
                  <div className='h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0'>
                    <Building2 className='h-4 w-4 text-emerald-500' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>{sub.companyName}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                        sub.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {sub.status}
                      </span>
                      {isInsuranceExpiring && (
                        <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 shrink-0'>
                          Insurance Expiring
                        </span>
                      )}
                    </div>
                    <p className='text-[10px] text-gray-500 mt-0.5'>{sub.contactName}</p>
                    <div className='flex items-center gap-3 mt-0.5'>
                      {sub.email && (
                        <span className='flex items-center gap-1 text-[10px] text-gray-400'>
                          <Mail className='h-3 w-3' />{sub.email}
                        </span>
                      )}
                      {sub.phone && (
                        <span className='flex items-center gap-1 text-[10px] text-gray-400'>
                          <Phone className='h-3 w-3' />{sub.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  {sub.rating > 0 && (
                    <div className='text-right shrink-0'>
                      <p className='text-xs font-bold text-amber-500'>{sub.rating.toFixed(1)} ★</p>
                    </div>
                  )}
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
