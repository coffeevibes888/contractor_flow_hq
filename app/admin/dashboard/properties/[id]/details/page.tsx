import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getConnectAccountStatus } from '@/lib/actions/stripe-connect.actions';
import { PropertyDetailsTabs } from '@/app/admin/products/[id]/details/property-details-tabs';
import { normalizeTier } from '@/lib/config/subscription-tiers';

export default async function PropertyDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await props.params;

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) notFound();

  const property = await prisma.property.findFirst({
    where: { id, landlordId: landlordResult.landlord.id },
    include: {
      bankAccount: true,
      units: {
        include: {
          leases: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              rentAmount: true,
              billingDayOfMonth: true,
              tenantSignedAt: true,
              landlordSignedAt: true,
              tenant: { 
                select: { 
                  id: true, 
                  name: true, 
                  email: true, 
                  phoneNumber: true,
                  image: true,
                  createdAt: true,
                  rentalApplications: {
                    where: { status: { in: ['approved', 'pending'] } },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                      id: true,
                      phone: true,
                      verification: {
                        select: {
                          identityStatus: true,
                          employmentStatus: true,
                          monthlyIncome: true,
                        },
                      },
                    },
                  },
                } 
              },
              signatureRequests: {
                select: { role: true, status: true, signedAt: true },
              },
              rentPayments: {
                orderBy: { dueDate: 'desc' },
                take: 12,
                select: {
                  id: true,
                  dueDate: true,
                  paidAt: true,
                  amount: true,
                  status: true,
                  metadata: true,
                },
              },
              recurringCharges: {
                select: {
                  id: true,
                  description: true,
                  amount: true,
                  dayOfMonthToPost: true,
                  status: true,
                },
              },
            },
          },
          tickets: {
            orderBy: { createdAt: 'desc' },
            include: {
              tenant: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          applications: {
            where: { status: 'pending' },
            orderBy: { createdAt: 'desc' },
            include: {
              applicant: {
                select: { id: true, name: true, email: true },
              },
              verification: {
                select: {
                  identityStatus: true,
                  employmentStatus: true,
                  overallStatus: true,
                },
              },
            },
          },
        },
      },
      expenses: {
        orderBy: { incurredAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!property) notFound();

  const allRentPayments = await prisma.rentPayment.findMany({
    where: { lease: { unit: { propertyId: property.id } } },
    orderBy: { dueDate: 'desc' },
    include: {
      tenant: { select: { name: true } },
      lease: { select: { unit: { select: { name: true } } } },
    },
  });

  const serializedProperty = {
    id: property.id,
    name: property.name,
    slug: property.slug,
    description: property.description,
    address: property.address,
    type: property.type,
    isPublished: property.isPublished,
    addressVerified: property.addressVerified,
    createdAt: property.createdAt.toISOString(),
    units: property.units.map(unit => ({
      id: unit.id,
      name: unit.name,
      type: unit.type,
      building: (unit as any).building || null,
      floor: (unit as any).floor || null,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms ? Number(unit.bathrooms) : null,
      sizeSqFt: unit.sizeSqFt,
      rentAmount: Number(unit.rentAmount),
      isAvailable: unit.isAvailable,
      images: unit.images,
      amenities: (unit as any).amenities || [],
      leases: unit.leases.map(lease => ({
        id: lease.id,
        status: lease.status,
        startDate: lease.startDate.toISOString(),
        endDate: lease.endDate?.toISOString() || null,
        rentAmount: Number(lease.rentAmount),
        billingDayOfMonth: lease.billingDayOfMonth,
        tenantSignedAt: lease.tenantSignedAt?.toISOString() || null,
        landlordSignedAt: lease.landlordSignedAt?.toISOString() || null,
        tenant: lease.tenant ? {
          id: lease.tenant.id,
          name: lease.tenant.name,
          email: lease.tenant.email,
          phoneNumber: lease.tenant.phoneNumber,
          image: lease.tenant.image,
          createdAt: lease.tenant.createdAt.toISOString(),
          applicationId: lease.tenant.rentalApplications?.[0]?.id || null,
          applicationPhone: lease.tenant.rentalApplications?.[0]?.phone || null,
          verification: lease.tenant.rentalApplications?.[0]?.verification ? {
            identityStatus: lease.tenant.rentalApplications[0].verification.identityStatus,
            employmentStatus: lease.tenant.rentalApplications[0].verification.employmentStatus,
            monthlyIncome: lease.tenant.rentalApplications[0].verification.monthlyIncome 
              ? Number(lease.tenant.rentalApplications[0].verification.monthlyIncome) 
              : null,
          } : null,
        } : null,
        signatureRequests: lease.signatureRequests,
        rentPayments: lease.rentPayments.map(payment => ({
          id: payment.id,
          dueDate: payment.dueDate.toISOString(),
          paidAt: payment.paidAt?.toISOString() || null,
          amount: Number(payment.amount),
          status: payment.status,
          metadata: payment.metadata as Record<string, unknown> | null,
        })),
        recurringCharges: lease.recurringCharges.map(charge => ({
          id: charge.id,
          description: charge.description,
          amount: Number(charge.amount),
          dayOfMonthToPost: charge.dayOfMonthToPost,
          status: charge.status,
        })),
        unitName: unit.name,
        unitType: unit.type,
        propertyName: property.name,
      })),
      tickets: unit.tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        assignedToName: ticket.assignedToName,
        tenant: ticket.tenant ? {
          id: ticket.tenant.id,
          name: ticket.tenant.name,
          email: ticket.tenant.email,
        } : null,
      })),
      applications: unit.applications.map(app => ({
        id: app.id,
        fullName: app.fullName,
        email: app.email,
        phone: app.phone,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
        applicant: app.applicant,
        verification: app.verification,
      })),
    })),
    expenses: property.expenses.map(expense => ({
      id: expense.id,
      category: expense.category,
      amount: Number(expense.amount),
      description: expense.description,
      date: expense.incurredAt.toISOString(),
      vendor: null,
    })),
  };

  const serializedRentPayments = allRentPayments.map(payment => ({
    id: payment.id,
    dueDate: payment.dueDate.toISOString(),
    paidAt: payment.paidAt?.toISOString() || null,
    amount: Number(payment.amount),
    status: payment.status,
    tenantName: payment.tenant?.name || 'Unknown',
    unitName: payment.lease?.unit?.name || 'Unknown',
  }));

  const landlordTier = normalizeTier(landlordResult.landlord.subscriptionTier);
  const isPro = landlordTier === 'pro' || landlordTier === 'enterprise';

  const connectStatus = await getConnectAccountStatus();
  const wallet = await prisma.landlordWallet.findUnique({
    where: { landlordId: landlordResult.landlord.id },
  });
  const availableBalance = wallet ? Number(wallet.availableBalance || 0) : 0;

  const bankAccountInfo = property.bankAccount ? {
    last4: property.bankAccount.last4,
    bankName: property.bankAccount.bankName,
    isVerified: property.bankAccount.isVerified,
  } : null;

  return (
    <PropertyDetailsTabs 
      property={serializedProperty} 
      rentPayments={serializedRentPayments}
      landlordId={landlordResult.landlord.id}
      isPro={isPro}
      cashoutInfo={{
        canCashOut: connectStatus.status?.canReceivePayouts ?? false,
        availableBalance,
        hasBankAccount: !!property.bankAccount,
        bankAccount: bankAccountInfo,
        defaultBankLast4: connectStatus.status?.bankAccountLast4 ?? null,
      }}
    />
  );
}
