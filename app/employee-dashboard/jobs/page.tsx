import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import JobsClient from './jobs-client';

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { id: true, contractorId: true },
  });

  if (!employee) redirect('/employee-start');

  const db = prisma as any;

  // Fetch all assigned jobs
  const jobs = await db.contractorJob.findMany({
    where: {
      contractorId: employee.contractorId,
      assignedEmployeeIds: { has: employee.id },
    },
    select: {
      id: true,
      title: true,
      jobNumber: true,
      description: true,
      status: true,
      address: true,
      city: true,
      state: true,
      estimatedStartDate: true,
      estimatedEndDate: true,
      estimatedHours: true,
      actualHours: true,
      priority: true,
      notes: true,
      photos: true,
      beforePhotos: true,
      afterPhotos: true,
      customer: { select: { id: true, name: true, phone: true } },
      materials: {
        select: {
          id: true,
          quantityNeeded: true,
          quantityLoaded: true,
          status: true,
          item: { select: { name: true, unit: true } },
        },
        take: 20,
      },
      jobNotes: {
        select: { id: true, content: true, createdAt: true, isInternal: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
    orderBy: [{ status: 'asc' }, { estimatedStartDate: 'asc' }],
    take: 30,
  }).catch(() => []);

  return (
    <JobsClient
      employeeId={employee.id}
      contractorId={employee.contractorId}
      jobs={jobs.map((j: any) => ({
        id: j.id,
        title: j.title,
        jobNumber: j.jobNumber,
        description: j.description,
        status: j.status,
        address: [j.address, j.city, j.state].filter(Boolean).join(', '),
        estimatedStartDate: j.estimatedStartDate?.toISOString() || null,
        estimatedEndDate: j.estimatedEndDate?.toISOString() || null,
        estimatedHours: j.estimatedHours,
        actualHours: j.actualHours,
        priority: j.priority,
        notes: j.notes,
        photos: j.photos || [],
        beforePhotos: j.beforePhotos || [],
        afterPhotos: j.afterPhotos || [],
        customer: j.customer ? { name: j.customer.name, phone: j.customer.phone } : null,
        materials: (j.materials || []).map((m: any) => ({
          id: m.id,
          name: m.item?.name || 'Unknown',
          unit: m.item?.unit || 'each',
          quantityNeeded: m.quantityNeeded,
          quantityLoaded: m.quantityLoaded,
          status: m.status,
        })),
        jobNotes: (j.jobNotes || []).map((n: any) => ({
          id: n.id,
          content: n.content,
          createdAt: n.createdAt.toISOString(),
          isInternal: n.isInternal,
        })),
      }))}
    />
  );
}
