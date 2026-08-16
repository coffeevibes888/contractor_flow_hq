import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { JobForm } from '@/components/contractor/job-form';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const { id } = await params;

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
  });

  if (!contractorProfile) {
    return redirect('/onboarding/contractor');
  }

  // Fetch the job to edit (scoped to this contractor)
  const job = await prisma.contractorJob.findFirst({
    where: { id, contractorId: contractorProfile.id },
  });

  if (!job) {
    notFound();
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

  // Serialize the data the form needs (dates → ISO strings, Decimals → numbers)
  const initialData = {
    title: job.title ?? '',
    description: job.description ?? '',
    jobType: job.jobType ?? '',
    customerId: job.customerId ?? '',
    address: job.address ?? '',
    city: job.city ?? '',
    state: job.state ?? '',
    zipCode: job.zipCode ?? '',
    estimatedCost: job.estimatedCost != null ? Number(job.estimatedCost).toString() : '',
    laborCost: job.laborCost != null ? Number(job.laborCost).toString() : '',
    materialCost: job.materialCost != null ? Number(job.materialCost).toString() : '',
    estimatedStartDate: job.estimatedStartDate?.toISOString() ?? '',
    estimatedEndDate: job.estimatedEndDate?.toISOString() ?? '',
    estimatedHours: job.estimatedHours != null ? Number(job.estimatedHours).toString() : '',
    assignedEmployeeIds: job.assignedEmployeeIds ?? [],
    notes: job.notes ?? '',
    priority: job.priority ?? 'normal',
    status: job.status ?? 'quoted',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Edit Job</h1>
        <p className="text-gray-600 mt-1">
          Update the details for {job.title || `Job #${job.jobNumber}`}
        </p>
      </div>

      <JobForm
        customers={customers}
        employees={employees}
        initialData={initialData}
        jobId={job.id}
      />
    </div>
  );
}
