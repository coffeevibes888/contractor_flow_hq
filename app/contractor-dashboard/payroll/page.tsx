import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Lock, Zap } from 'lucide-react';
import Link from 'next/link';
import { PayrollDashboard } from '@/components/contractor/payroll/payroll-dashboard';
import { resolveContractorAuth, can, meetsMinTier } from '@/lib/contractor-auth';

export const metadata: Metadata = { title: 'Payroll | Contractor Dashboard' };

export default async function PayrollPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const contractorAuth = await resolveContractorAuth(session.user.id);
  if (!contractorAuth) redirect('/onboarding/contractor');

  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { id: contractorAuth.contractorId },
    select: { id: true, businessName: true },
  });
  if (!contractorProfile) redirect('/onboarding/contractor');

  const hasAccess = meetsMinTier(contractorAuth, 'pro') && can(contractorAuth, 'payroll.view');

  if (!hasAccess) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Payroll</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Process payroll for your team</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-amber-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Payroll</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Payroll calculation is available on the Pro plan. Upgrade to calculate
            gross pay, overtime, deductions, net pay, and track payments for your team.
          </p>
          <Link
            href='/contractor-dashboard/settings/subscription'
            className='inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'
          >
            <Zap className='h-4 w-4' />
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const db = prisma as any;
  const [payrolls, employees] = await Promise.all([
    db.contractorPayroll.findMany({
      where: { contractorId: contractorProfile.id },
      include: {
        paychecks: { select: { id: true, status: true, grossPay: true, netPay: true } },
      },
      orderBy: { periodStart: 'desc' },
      take: 20,
    }),
    db.contractorEmployee.findMany({
      where: { contractorId: contractorProfile.id, status: 'active' },
      select: { id: true, firstName: true, lastName: true, payRate: true, payType: true, employeeType: true },
      orderBy: [{ lastName: 'asc' }],
    }),
  ]);

  return (
    <div className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Payroll</h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Process payroll for your team</p>
      </div>
      {/* Direct deposit coming soon banner */}
      <div className='flex items-start gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50'>
        <div className='p-1.5 rounded-lg bg-blue-100 shrink-0'>
          <Zap className='h-4 w-4 text-blue-600' />
        </div>
        <div>
          <p className='text-xs font-semibold text-blue-800'>Direct deposit coming soon</p>
          <p className='text-xs text-blue-700 mt-0.5 leading-relaxed'>
            Currently you can calculate pay, track deductions, and record payments manually (check, Zelle, cash).
            Automated direct deposit via Stripe Treasury is in progress — it will be enabled automatically once approved.
          </p>
        </div>
      </div>

      <PayrollDashboard
        contractorId={contractorProfile.id}
        businessName={contractorProfile.businessName}
        initialPayrolls={JSON.parse(JSON.stringify(payrolls))}
        employees={JSON.parse(JSON.stringify(employees))}
        canRun={can(contractorAuth, 'payroll.run')}
        canMarkPaid={can(contractorAuth, 'payroll.mark_paid')}
      />
    </div>
  );
}
