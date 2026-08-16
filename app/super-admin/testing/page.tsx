import { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import TestingDashboardClient from './testing-dashboard-client';

export const metadata: Metadata = {
  title: 'Testing Dashboard | Super Admin',
  description: 'Unified testing interface for all user roles',
};

async function getTestingData() {
  // Get all users grouped by role
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Get all landlords with their properties
  const landlords = await prisma.landlord.findMany({
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      properties: {
        include: {
          units: {
            include: {
              leases: {
                where: { status: 'active' },
                include: {
                  tenant: { select: { id: true, name: true, email: true } },
                  rentPayments: {
                    orderBy: { dueDate: 'desc' },
                    take: 3,
                  },
                },
              },
            },
          },
        },
      },
      _count: {
        select: { properties: true },
      },
    },
    take: 20,
  });

  // Get contractors
  const contractors = await prisma.contractor.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: {
        select: { workOrders: true },
      },
    },
    take: 20,
  });

  // Get recent rent payments
  const recentPayments = await prisma.rentPayment.findMany({
    include: {
      lease: {
        include: {
          tenant: { select: { id: true, name: true, email: true } },
          unit: {
            include: {
              property: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { dueDate: 'desc' },
    take: 20,
  });

  // Get maintenance tickets
  const maintenanceTickets = await prisma.maintenanceTicket.findMany({
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      unit: {
        include: {
          property: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Get active leases
  const activeLeases = await prisma.lease.findMany({
    where: { status: 'active' },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      unit: {
        include: {
          property: {
            include: {
              landlord: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    take: 30,
  });

  return {
    users,
    landlords,
    contractors,
    recentPayments,
    maintenanceTickets,
    activeLeases,
  };
}

export default async function TestingPage() {
  await requireSuperAdmin();
  const data = await getTestingData();

  return <TestingDashboardClient initialData={data} />;
}
