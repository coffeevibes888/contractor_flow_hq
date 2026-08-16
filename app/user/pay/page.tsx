import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import PayRentClient from './pay-rent-client';

export const metadata: Metadata = {
  title: 'Pay Rent',
  description: 'Make a secure rent payment',
};

export default async function PayRentPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id as string;

  // Get tenant's active lease
  const lease = await prisma.lease.findFirst({
    where: {
      tenantId: userId,
      status: { in: ['active', 'pending_signature'] },
    },
    select: {
      id: true,
      status: true,
      rentAmount: true,
      billingDayOfMonth: true,
      startDate: true,
      endDate: true,
      tenantSignedAt: true,
      landlordSignedAt: true,
      unit: {
        select: {
          name: true,
          property: { 
            select: { 
              name: true,
              landlord: {
                select: {
                  name: true,
                  companyName: true,
                }
              }
            } 
          },
        },
      },
      rentPayments: {
        where: {
          status: { in: ['pending', 'overdue'] },
        },
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  // Get all pending payments
  const pendingPayments = lease?.rentPayments || [];
  
  // Separate move-in payments from regular rent
  const moveInPaymentTypes = ['first_month_rent', 'last_month_rent', 'security_deposit', 'pet_deposit_annual', 'cleaning_fee'];
  const moveInPayments = pendingPayments.filter(
    (p) => moveInPaymentTypes.includes(
      (p.metadata as Record<string, unknown>)?.type as string || ''
    )
  );
  
  const regularPayments = pendingPayments.filter(
    (p) => !moveInPaymentTypes.includes(
      (p.metadata as Record<string, unknown>)?.type as string || ''
    )
  );

  const totalAmount = pendingPayments.reduce(
    (sum, p) => sum + Number(p.amount), 
    0
  );

  return (
    <PayRentClient
      lease={lease ? {
        id: lease.id,
        status: lease.status,
        rentAmount: Number(lease.rentAmount),
        billingDayOfMonth: lease.billingDayOfMonth,
        unitName: lease.unit.name,
        propertyName: lease.unit.property.name,
        landlordName: lease.unit.property.landlord?.companyName || lease.unit.property.landlord?.name || 'Property Manager',
        tenantSignedAt: lease.tenantSignedAt?.toISOString() || null,
        landlordSignedAt: lease.landlordSignedAt?.toISOString() || null,
      } : null}
      pendingPayments={pendingPayments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        dueDate: p.dueDate.toISOString(),
        status: p.status,
        type: (p.metadata as Record<string, unknown>)?.type as string || 'rent',
      }))}
      moveInPayments={moveInPayments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        type: (p.metadata as Record<string, unknown>)?.type as string || 'rent',
      }))}
      regularPayments={regularPayments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        dueDate: p.dueDate.toISOString(),
        status: p.status,
      }))}
      totalAmount={totalAmount}
    />
  );
}
