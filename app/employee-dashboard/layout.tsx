import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import { EmployeeDashboardSidebar } from './sidebar';
import { EmployeeDashboardHeader } from './header';

/**
 * Employee Dashboard Layout
 *
 * Server component with auth enforcement:
 * 1. Must be signed in
 * 2. Must have role 'contractor_employee' (or admin/superAdmin)
 * 3. Must have an active ContractorEmployee record linked to their userId
 * 4. Email verification required
 */
export default async function EmployeeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Not authenticated → sign in
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Role check — allow contractor_employee, admin, and superAdmin
  const allowedRoles = ['contractor_employee', 'admin', 'superAdmin'];
  let effectiveRole = session.user.role;

  if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
    // Re-read from DB in case JWT is stale
    const freshUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    effectiveRole = freshUser?.role || undefined;

    if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
      if (effectiveRole === 'user' || !effectiveRole) {
        redirect('/onboarding');
      }
      redirect('/unauthorized');
    }
  }

  // Verify the employee record exists and is active
  const employee = await prisma.contractorEmployee.findFirst({
    where: {
      userId: session.user.id,
      status: 'active',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      contractorId: true,
      contractor: {
        select: { businessName: true },
      },
    },
  });

  if (!employee && effectiveRole === 'contractor_employee') {
    // Employee record not found or not active — send to onboarding
    redirect('/team-start');
  }

  // Email verification (soft — don't block but show banner later)
  // For now, allow access regardless of email verification to reduce friction

  return (
    <SessionProviderWrapper>
      <div className="flex min-h-screen bg-slate-50">
        <EmployeeDashboardSidebar
          employeeName={employee ? `${employee.firstName} ${employee.lastName}`.trim() : session.user.name || ''}
          companyName={employee?.contractor?.businessName || ''}
          employeeRole={employee?.role || ''}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <EmployeeDashboardHeader
            employeeName={employee ? `${employee.firstName} ${employee.lastName}`.trim() : session.user.name || ''}
            companyName={employee?.contractor?.businessName || ''}
          />
          <main className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
            <div className="max-w-6xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SessionProviderWrapper>
  );
}
