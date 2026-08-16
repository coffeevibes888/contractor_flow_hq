import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Mail, Phone, MapPin, Briefcase, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';
import { getContractorOwnerUserIdForUser } from '@/lib/contractor-profile';

export default async function ContractorLandlordsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  // Allow both owners and employees with customer/relationship permissions
  // to see the landlord directory. The data is relationship-level, not
  // financial.
  const contractorAuth = await resolveContractorAuth(session.user.id);
  if (!contractorAuth) {
    return redirect('/onboarding/contractor');
  }
  if (!can(contractorAuth, 'customers.view') && !contractorAuth.isOwner) {
    return redirect('/contractor-dashboard');
  }

  const ownerUserId = await getContractorOwnerUserIdForUser(session.user.id);
  if (!ownerUserId) return redirect('/onboarding/contractor');

  const contractors = await prisma.contractor.findMany({
    where: { userId: ownerUserId },
    include: {
      landlord: {
        select: {
          id: true,
          name: true,
          companyName: true,
          companyEmail: true,
          companyPhone: true,
          companyAddress: true,
          _count: { select: { properties: true } },
        },
      },
      _count: { select: { workOrders: true } },
      workOrders: {
        where: { status: 'completed' },
        select: { agreedPrice: true, actualCost: true },
      },
    },
  });

  const landlordData = contractors.map((c) => ({
    ...c,
    totalEarnings: c.workOrders.reduce((sum, wo) => sum + Number(wo.actualCost || wo.agreedPrice || 0), 0),
  }));

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>My Landlords</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Property managers you work with</p>
        </div>
        <Button variant='outline' className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm self-start'>
          <Plus className='h-4 w-4 mr-2' /> Enter Invite Code
        </Button>
      </div>

      {/* Landlords List */}
      {landlordData.length === 0 ? (
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center'>
            <Building2 className='h-7 w-7 text-gray-300' />
          </div>
          <h3 className='text-base font-bold text-gray-800 mb-1'>No landlord connections yet</h3>
          <p className='text-sm text-gray-500 mb-4'>Enter an invite code from a property manager to connect.</p>
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
            <Plus className='h-4 w-4 mr-2' /> Enter Invite Code
          </Button>
        </div>
      ) : (
        <div className='space-y-3'>
          {landlordData.map((contractor) => (
            <div key={contractor.id} className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex items-start gap-3'>
                    <div className='h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0'>
                      <Building2 className='h-6 w-6 text-amber-500' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-sm font-bold text-gray-800'>
                        {contractor.landlord.companyName || contractor.landlord.name}
                      </h3>
                      <div className='flex flex-wrap gap-3 mt-1'>
                        {contractor.landlord.companyEmail && (
                          <span className='flex items-center gap-1 text-xs text-gray-500'>
                            <Mail className='h-3 w-3' />{contractor.landlord.companyEmail}
                          </span>
                        )}
                        {contractor.landlord.companyPhone && (
                          <span className='flex items-center gap-1 text-xs text-gray-500'>
                            <Phone className='h-3 w-3' />{contractor.landlord.companyPhone}
                          </span>
                        )}
                      </div>
                      {contractor.landlord.companyAddress && (
                        <p className='flex items-center gap-1 mt-1 text-xs text-gray-400'>
                          <MapPin className='h-3 w-3' />{contractor.landlord.companyAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className='text-right shrink-0'>
                    <p className='text-lg font-bold text-emerald-600'>{formatCurrency(contractor.totalEarnings)}</p>
                    <p className='text-[10px] text-gray-400'>Total Earned</p>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-100'>
                  <div className='text-center'>
                    <p className='text-base font-bold text-gray-800'>{contractor._count.workOrders}</p>
                    <p className='text-[10px] text-gray-400'>Total Jobs</p>
                  </div>
                  <div className='text-center'>
                    <p className='text-base font-bold text-gray-800'>{contractor.landlord._count.properties}</p>
                    <p className='text-[10px] text-gray-400'>Properties</p>
                  </div>
                  <div className='text-center'>
                    <p className='text-base font-bold text-emerald-600'>Active</p>
                    <p className='text-[10px] text-gray-400'>Status</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Code Entry */}
      <div className='rounded-xl border border-amber-100 bg-amber-50 p-4'>
        <h3 className='text-sm font-bold text-amber-800 mb-1'>Have an invite code?</h3>
        <p className='text-xs text-amber-700 mb-3'>
          Property managers can send you an invite code to connect. Enter it below to start receiving work orders.
        </p>
        <div className='flex gap-2'>
          <input
            type='text'
            placeholder='Enter 6-character code'
            className='flex-1 px-3 py-2 rounded-lg bg-white border border-amber-200 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 text-sm'
          />
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm'>
            Connect
          </Button>
        </div>
      </div>
    </div>
  );
}
