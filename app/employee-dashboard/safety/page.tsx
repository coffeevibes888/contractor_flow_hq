import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import SafetyClient from './safety-client';

export default async function SafetyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { id: true, contractorId: true, firstName: true, lastName: true },
  });

  if (!employee) redirect('/employee-start');

  const db = prisma as any;

  // Fetch safety checklists assigned to this employee's jobs
  const checklists = await db.contractorSafetyChecklist.findMany({
    where: { contractorId: employee.contractorId, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      items: true,
      jobType: true,
    },
    orderBy: { name: 'asc' },
  }).catch(() => []);

  // Fetch completed checklists by this employee
  const completions = await db.contractorSafetyChecklistCompletion.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      checklistId: true,
      jobId: true,
      completedAt: true,
      responses: true,
      notes: true,
    },
    orderBy: { completedAt: 'desc' },
    take: 20,
  }).catch(() => []);

  // Fetch incident reports by this employee
  const incidents = await db.contractorIncidentReport.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      type: true,
      severity: true,
      description: true,
      location: true,
      status: true,
      createdAt: true,
      photos: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  }).catch(() => []);

  return (
    <SafetyClient
      employeeId={employee.id}
      contractorId={employee.contractorId}
      employeeName={`${employee.firstName} ${employee.lastName}`.trim()}
      checklists={checklists.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        items: c.items || [],
        jobType: c.jobType,
      }))}
      completions={completions.map((c: any) => ({
        id: c.id,
        checklistId: c.checklistId,
        jobId: c.jobId,
        completedAt: c.completedAt?.toISOString() || null,
        notes: c.notes,
      }))}
      incidents={incidents.map((i: any) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        description: i.description,
        location: i.location,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
        photos: i.photos || [],
      }))}
    />
  );
}
