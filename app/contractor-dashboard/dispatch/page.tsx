import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { MorningBriefingClient } from './morning-briefing-client';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = { title: 'Morning Briefing | Dispatch' };

export default async function DispatchBoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const profile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    subscriptionTier: true,
  });
  if (!profile) redirect('/onboarding/contractor');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const db = prisma as any;

  // Today's jobs with assigned employees
  const todayJobs = await db.contractorJob.findMany({
    where: {
      contractorId: profile.id,
      status: { in: ['scheduled', 'in_progress', 'approved'] },
      estimatedStartDate: { gte: today, lt: tomorrow },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
    },
    orderBy: { estimatedStartDate: 'asc' },
  });

  // All active employees
  const employees = await db.contractorEmployee.findMany({
    where: { contractorId: profile.id, status: 'active' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      photo: true,
      userId: true,
    },
    orderBy: { firstName: 'asc' },
  });

  // Currently clocked-in crew (for live status)
  const clockedIn = await db.contractorTimeEntry.findMany({
    where: { contractorId: profile.id, clockOut: null },
    select: {
      id: true,
      employeeId: true,
      jobId: true,
      clockIn: true,
      clockInLocation: true,
    },
  });

  // Inventory low-stock alerts
  const lowStockItems = await db.contractorInventoryItem.findMany({
    where: {
      contractorId: profile.id,
      reorderPoint: { not: null },
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      reorderPoint: true,
      unit: true,
      category: true,
    },
  });

  const lowStock = lowStockItems.filter(
    (i: any) => i.reorderPoint !== null && Number(i.quantity) <= Number(i.reorderPoint)
  );

  // Unassigned jobs (any status, no crew)
  const unassignedJobs = await db.contractorJob.findMany({
    where: {
      contractorId: profile.id,
      status: { in: ['scheduled', 'approved'] },
      assignedEmployeeIds: { equals: [] },
    },
    select: {
      id: true,
      jobNumber: true,
      title: true,
      estimatedStartDate: true,
      address: true,
      city: true,
      state: true,
      priority: true,
    },
    orderBy: { estimatedStartDate: 'asc' },
    take: 10,
  });

  // Serialize for client
  const serialize = (obj: any): any => JSON.parse(JSON.stringify(obj));

  return (
    <MorningBriefingClient
      businessName={profile.businessName ?? 'Your Business'}
      todayJobs={serialize(todayJobs)}
      employees={serialize(employees)}
      clockedIn={serialize(clockedIn)}
      lowStock={serialize(lowStock)}
      unassignedJobs={serialize(unassignedJobs)}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}
    />
  );
}
