import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone, Award, Clock, Lock, Zap } from 'lucide-react';
import Image from 'next/image';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function EmployeesPage() {
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
  const hasAccess = tier === 'pro' || tier === 'enterprise';

  if (!hasAccess) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Team Members</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage your employees and contractors</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-amber-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Employee Management</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Employee management is available on the Pro plan. Upgrade to add team members,
            track hours, manage pay rates, and run your crew from one place.
          </p>
          <Link href='/contractor-dashboard/settings/subscription' className='inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'>
            <Zap className='h-4 w-4' /> Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const employees = await prisma.contractorEmployee.findMany({
    where: { contractorId: contractorProfile.id },
    include: {
      _count: {
        select: {
          timeEntries: true,
          assignments: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    inactive: 'bg-gray-100 text-gray-700 border-gray-300',
    terminated: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Team Members</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage your employees and contractors</p>
        </div>
        <Link href='/contractor-dashboard/employees/new'>
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold self-start'>
            <Plus className='h-4 w-4 mr-2' /> Add Employee
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-3 gap-3'>
        {[
          { label: 'Total', value: String(stats.total), gradient: 'from-blue-400 to-indigo-400' },
          { label: 'Active', value: String(stats.active), gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Inactive', value: String(stats.inactive), gradient: 'from-gray-400 to-slate-400' },
        ].map(({ label, value, gradient }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
            <p className='text-[10px] text-gray-500 font-medium'>{label}</p>
            <p className='text-2xl font-bold text-gray-900 mt-0.5'>{value}</p>
          </div>
        ))}
      </div>

      {/* Employees Grid */}
      <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {employees.length === 0 ? (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm col-span-full p-10 text-center'>
            <p className='text-sm text-gray-500 mb-4'>No team members yet</p>
            <Link href='/contractor-dashboard/employees/new'>
              <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
                <Plus className='h-4 w-4 mr-2' /> Add Your First Employee
              </Button>
            </Link>
          </div>
        ) : (
          employees.map((employee) => {
            const sc = statusColors[employee.status] || 'bg-gray-100 text-gray-500';
            return (
              <Link key={employee.id} href={`/contractor-dashboard/employees/${employee.id}`} className='block'>
                <div className='rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-amber-200 transition-all h-full p-4'>
                  <div className='flex items-start gap-3 mb-3'>
                    <div className='h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100'>
                      {employee.photo ? (
                        <Image src={employee.photo} alt={`${employee.firstName} ${employee.lastName}`} width={48} height={48} className='object-cover rounded-full' />
                      ) : (
                        <span className='text-base font-bold text-amber-600'>{employee.firstName[0]}{employee.lastName[0]}</span>
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-sm font-semibold text-gray-800 truncate'>{employee.firstName} {employee.lastName}</h3>
                      <p className='text-xs text-gray-500'>{employee.role}</p>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${sc} capitalize`}>{employee.status}</span>
                    </div>
                  </div>
                  <div className='space-y-1 text-xs text-gray-500'>
                    {employee.email && <div className='flex items-center gap-2'><Mail className='h-3 w-3' /><span className='truncate'>{employee.email}</span></div>}
                    {employee.phone && <div className='flex items-center gap-2'><Phone className='h-3 w-3' /><span>{employee.phone}</span></div>}
                  </div>
                  <div className='grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100'>
                    <div>
                      <p className='text-[10px] text-gray-400 flex items-center gap-1'><Clock className='h-3 w-3' />Jobs</p>
                      <p className='text-sm font-bold text-gray-800'>{employee._count.assignments}</p>
                    </div>
                    <div>
                      <p className='text-[10px] text-gray-400 flex items-center gap-1'><Award className='h-3 w-3' />Rating</p>
                      <p className='text-sm font-bold text-gray-800'>{Number(employee.avgRating).toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
