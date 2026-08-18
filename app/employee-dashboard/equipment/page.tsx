import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import EquipmentClient from './equipment-client';

export default async function EquipmentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { id: true, contractorId: true, firstName: true, lastName: true },
  });

  if (!employee) redirect('/employee-start');

  const db = prisma as any;

  // Fetch assigned truck and its inventory
  const assignedTruck = await db.contractorTruck.findFirst({
    where: { contractorId: employee.contractorId, assignedToId: employee.id },
    select: {
      id: true,
      name: true,
      licensePlate: true,
      make: true,
      model: true,
      year: true,
    },
  }).catch(() => null);

  // Get truck inventory items if truck assigned
  let truckItems: any[] = [];
  if (assignedTruck) {
    truckItems = await db.contractorTruckInventory.findMany({
      where: { truckId: assignedTruck.id, contractorId: employee.contractorId },
      select: {
        id: true,
        quantity: true,
        item: { select: { id: true, name: true, sku: true, unit: true, category: true } },
      },
      orderBy: { item: { name: 'asc' } },
    }).catch(() => []);
  }

  // Fetch equipment assigned to this employee
  const assignedEquipment = await db.contractorEquipment.findMany({
    where: { contractorId: employee.contractorId, assignedToId: employee.id },
    select: {
      id: true,
      name: true,
      serialNumber: true,
      category: true,
      status: true,
      condition: true,
      lastMaintenanceDate: true,
      notes: true,
    },
    orderBy: { name: 'asc' },
  }).catch(() => []);

  // Fetch recent expenses logged by this employee
  const recentExpenses = await db.contractorExpense.findMany({
    where: { contractorId: employee.contractorId, paidBy: employee.id },
    select: {
      id: true,
      category: true,
      description: true,
      amount: true,
      expenseDate: true,
      status: true,
      receiptUrl: true,
      billable: true,
    },
    orderBy: { expenseDate: 'desc' },
    take: 20,
  }).catch(() => []);

  return (
    <EquipmentClient
      employeeId={employee.id}
      contractorId={employee.contractorId}
      employeeName={`${employee.firstName} ${employee.lastName}`.trim()}
      truck={assignedTruck ? {
        id: assignedTruck.id,
        name: assignedTruck.name,
        licensePlate: assignedTruck.licensePlate,
        vehicle: [assignedTruck.year, assignedTruck.make, assignedTruck.model].filter(Boolean).join(' '),
      } : null}
      truckItems={truckItems.map((t: any) => ({
        id: t.id,
        name: t.item?.name || 'Unknown',
        sku: t.item?.sku || null,
        unit: t.item?.unit || 'each',
        category: t.item?.category || null,
        quantity: t.quantity,
      }))}
      equipment={assignedEquipment.map((e: any) => ({
        id: e.id,
        name: e.name,
        serialNumber: e.serialNumber,
        category: e.category,
        status: e.status,
        condition: e.condition,
        lastMaintenance: e.lastMaintenanceDate?.toISOString() || null,
        notes: e.notes,
      }))}
      expenses={recentExpenses.map((e: any) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        date: e.expenseDate.toISOString(),
        status: e.status,
        hasReceipt: !!e.receiptUrl,
        billable: e.billable,
      }))}
    />
  );
}
