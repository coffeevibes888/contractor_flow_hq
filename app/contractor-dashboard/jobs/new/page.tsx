import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { JobForm } from '@/components/contractor/job-form';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function NewJobPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
  });

  if (!contractorProfile) {
    return redirect('/onboarding/contractor');
  }

  // Get customers for dropdown
  const customers = await prisma.contractorCustomer.findMany({
    where: { contractorId: contractorProfile.id },
    orderBy: { name: 'asc' },
  });

  // Get employees for assignment
  const employees = await prisma.contractorEmployee.findMany({
    where: {
      contractorId: contractorProfile.id,
      status: 'active',
    },
    orderBy: { firstName: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Create New Job</h1>
        <p className="text-gray-600 mt-1">Add a new project to your pipeline</p>
      </div>

      <JobForm customers={customers} employees={employees} />
    </div>
  );
}
