import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Mail, Phone, Briefcase, Lock, Zap, Users, TrendingUp, UserCheck, UserX, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import { CustomersHeader } from '@/components/contractor/customers-header';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function CustomersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    subscriptionTier: true,
  });

  if (!contractorProfile) {
    return redirect('/onboarding/contractor');
  }

  const tier = contractorProfile.subscriptionTier || 'starter';
  const hasCRMAccess = tier === 'pro' || tier === 'enterprise';

  if (!hasCRMAccess) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Customers</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage your customer relationships</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-violet-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Customer CRM</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Customer relationship management is available on the Pro plan. Upgrade to manage customers,
            track communication history, and grow your business.
          </p>
          <Link
            href='/contractor-dashboard/settings/subscription'
            className='inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'
          >
            <Zap className='h-4 w-4' />
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const customers = await prisma.contractorCustomer.findMany({
    where: { contractorId: contractorProfile.id },
    include: { _count: { select: { jobs: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const limitInfo = await checkLimit(contractorProfile.id, 'customers');
  // CustomersHeader's prop type expects a `tier` alongside the limit fields.
  // checkLimit doesn't return tier, so merge in the one we already loaded.
  const limitInfoWithTier = { ...limitInfo, tier };

  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === 'customer').length,
    leads: customers.filter((c) => c.status === 'lead').length,
    inactive: customers.filter((c) => c.status === 'inactive').length,
  };

  const statusConfig: Record<string, { bg: string; text: string }> = {
    lead: { bg: 'bg-amber-50', text: 'text-amber-600' },
    prospect: { bg: 'bg-blue-50', text: 'text-blue-600' },
    customer: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-500' },
  };

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <CustomersHeader limitInfo={limitInfoWithTier} />

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <KPICard title='Total' value={String(stats.total)} icon={Users} gradient='from-blue-400 to-indigo-400' />
        <KPICard title='Active' value={String(stats.active)} icon={UserCheck} gradient='from-emerald-400 to-cyan-400' />
        <KPICard title='Leads' value={String(stats.leads)} icon={TrendingUp} gradient='from-amber-400 to-orange-400' />
        <KPICard title='Inactive' value={String(stats.inactive)} icon={UserX} gradient='from-gray-400 to-slate-400' />
      </div>

      {/* Customers List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Customers</h3>
          <Link href='/contractor-dashboard/customers/new'>
            <Button size='sm' className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold h-8 text-xs'>
              <Plus className='h-3.5 w-3.5 mr-1.5' />
              Add Customer
            </Button>
          </Link>
        </div>

        {customers.length === 0 ? (
          <div className='p-10 text-center'>
            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center'>
              <Users className='h-7 w-7 text-gray-300' />
            </div>
            <h3 className='text-base font-bold text-gray-800 mb-1'>No customers yet</h3>
            <p className='text-sm text-gray-500 mb-4'>Add your first customer to start tracking relationships.</p>
            <Link href='/contractor-dashboard/customers/new'>
              <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
                <Plus className='h-4 w-4 mr-2' />
                Add Customer
              </Button>
            </Link>
          </div>
        ) : (
          <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4'>
            {customers.map((customer) => {
              const sc = statusConfig[customer.status] || { bg: 'bg-gray-100', text: 'text-gray-500' };
              return (
                <Link
                  key={customer.id}
                  href={`/contractor-dashboard/customers/${customer.id}`}
                  className='block p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-amber-200 transition-all'
                >
                  <div className='flex items-start justify-between mb-3'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-sm font-semibold text-gray-800 truncate'>{customer.name}</h3>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${sc.bg} ${sc.text} capitalize`}>
                        {customer.status}
                      </span>
                    </div>
                    <ChevronRight className='h-4 w-4 text-gray-300 shrink-0 mt-0.5' />
                  </div>
                  <div className='space-y-1.5 text-xs text-gray-500'>
                    {customer.email && (
                      <div className='flex items-center gap-2'>
                        <Mail className='h-3 w-3' />
                        <span className='truncate'>{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className='flex items-center gap-2'>
                        <Phone className='h-3 w-3' />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    <div className='flex items-center gap-2'>
                      <Briefcase className='h-3 w-3' />
                      <span>{customer._count.jobs} jobs</span>
                    </div>
                  </div>
                  {Number(customer.totalSpent) > 0 && (
                    <div className='mt-3 pt-3 border-t border-gray-100 flex items-center justify-between'>
                      <span className='text-[10px] text-gray-400 font-medium'>Lifetime Value</span>
                      <span className='text-sm font-bold text-emerald-600'>
                        {formatCurrency(Number(customer.totalSpent))}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, gradient }: {
  title: string; value: string; icon: React.ElementType; gradient: string;
}) {
  return (
    <div className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
      <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-[10px] text-gray-500 font-medium'>{title}</p>
          <p className='text-2xl font-bold text-gray-900 mt-0.5'>{value}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
          <Icon className='h-4 w-4' />
        </div>
      </div>
    </div>
  );
}
