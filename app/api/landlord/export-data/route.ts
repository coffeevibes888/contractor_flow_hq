import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // ── 1. User account record ───────────────────────────────────────────────
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        onboardingCompleted: true,
      },
    });

    // ── 2. Landlord profile ──────────────────────────────────────────────────
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: userId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        companyName: true,
        companyEmail: true,
        companyPhone: true,
        companyAddress: true,
        logoUrl: true,
        aboutBio: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!landlord) {
      return buildResponse({
        exportedAt: new Date().toISOString(),
        version: '2.0',
        account: userRecord,
        landlordProfile: null,
      });
    }

    const landlordId = landlord.id;

    // ── 3. Each section fetched independently so one bad query can't block the rest ──

    const properties = await safeQuery('properties', () =>
      prisma.property.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          address: true,
          amenities: true,
          createdAt: true,
          updatedAt: true,
          units: {
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
              type: true,
              bedrooms: true,
              bathrooms: true,
              sizeSqFt: true,
              rentAmount: true,
              isAvailable: true,
              createdAt: true,
              leases: {
                orderBy: { startDate: 'desc' },
                select: {
                  id: true,
                  startDate: true,
                  endDate: true,
                  rentAmount: true,
                  billingDayOfMonth: true,
                  status: true,
                  createdAt: true,
                  tenant: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phoneNumber: true,
                      createdAt: true,
                    },
                  },
                  rentPayments: {
                    orderBy: { dueDate: 'desc' },
                    select: {
                      id: true,
                      dueDate: true,
                      paidAt: true,
                      amount: true,
                      status: true,
                      paymentMethod: true,
                      convenienceFee: true,
                      createdAt: true,
                    },
                  },
                  recurringCharges: {
                    select: {
                      id: true,
                      description: true,
                      amount: true,
                      dayOfMonthToPost: true,
                      status: true,
                      startDate: true,
                      endDate: true,
                    },
                  },
                },
              },
              tickets: {
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  status: true,
                  priority: true,
                  location: true,
                  cost: true,
                  isRecurring: true,
                  createdAt: true,
                  resolvedAt: true,
                },
              },
              applications: {
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                  status: true,
                  moveInDate: true,
                  monthlyIncome: true,
                  employmentStatus: true,
                  screeningStatus: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      })
    );

    const expenses = await safeQuery('expenses', () =>
      prisma.expense.findMany({
        where: { landlordId },
        orderBy: { incurredAt: 'desc' },
        select: {
          id: true,
          propertyId: true,
          unitId: true,
          amount: true,
          category: true,
          description: true,
          vendor: true,
          incurredAt: true,
          isRecurring: true,
          receiptUrl: true,
          createdAt: true,
        },
      })
    );

    const payouts = await safeQuery('payouts', () =>
      prisma.payout.findMany({
        where: { landlordId },
        orderBy: { initiatedAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          initiatedAt: true,
          paidAt: true,
          stripeTransferId: true,
        },
      })
    );

    const wallet = await safeQuery('wallet', () =>
      prisma.landlordWallet.findUnique({
        where: { landlordId },
        select: {
          availableBalance: true,
          pendingBalance: true,
          lastPayoutAt: true,
          updatedAt: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              type: true,
              amount: true,
              description: true,
              status: true,
              availableAt: true,
              createdAt: true,
            },
          },
        },
      })
    );

    const leaseViolations = await safeQuery('leaseViolations', () =>
      prisma.leaseViolation.findMany({
        where: { landlordId },
        orderBy: { occurredAt: 'desc' },
        select: {
          id: true,
          leaseId: true,
          tenantId: true,
          unitId: true,
          type: true,
          description: true,
          occurredAt: true,
          resolvedAt: true,
          createdAt: true,
        },
      })
    );

    const documents = await safeQuery('documents', () =>
      prisma.document.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          category: true,
          fileUrl: true,
          mimeType: true,
          sizeBytes: true,
          relatedToType: true,
          relatedToId: true,
          notes: true,
          createdAt: true,
        },
      })
    );

    const legalDocuments = await safeQuery('legalDocuments', () =>
      prisma.legalDocument.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    );

    const leaseTemplates = await safeQuery('leaseTemplates', () =>
      prisma.leaseTemplate.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    );

    const workOrders = await safeQuery('workOrders', () =>
      prisma.workOrder.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          agreedPrice: true,
          actualCost: true,
          createdAt: true,
          completedAt: true,
        },
      })
    );

    const contractorPayments = await safeQuery('contractorPayments', () =>
      prisma.contractorPayment.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          platformFee: true,
          netAmount: true,
          status: true,
          description: true,
          paidAt: true,
          createdAt: true,
        },
      })
    );

    const contractorEstimates = await safeQuery('contractorEstimates', () =>
      prisma.contractorEstimate.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      })
    );

    const teamMembers = await safeQuery('teamMembers', () =>
      prisma.teamMember.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          role: true,
          permissions: true,
          invitedEmail: true,
          status: true,
          joinedAt: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    );

    const owners = await safeQuery('owners', () =>
      prisma.owner.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          payoutSplit: true,
          payoutMethod: true,
          isActive: true,
          createdAt: true,
        },
      })
    );

    const ownerStatements = await safeQuery('ownerStatements', () =>
      prisma.ownerStatement.findMany({
        where: { landlordId },
        orderBy: { periodStart: 'desc' },
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
          totalIncome: true,
          totalExpense: true,
          netIncome: true,
          distribution: true,
          status: true,
          generatedAt: true,
          emailSentAt: true,
        },
      })
    );

    const bankTransactions = await safeQuery('bankTransactions', () =>
      prisma.bankTransaction.findMany({
        where: { landlordId },
        orderBy: { postedAt: 'desc' },
        select: {
          id: true,
          source: true,
          amount: true,
          currency: true,
          description: true,
          postedAt: true,
          status: true,
          notes: true,
          createdAt: true,
        },
      })
    );

    const rentalApplications = await safeQuery('rentalApplications', () =>
      prisma.rentalApplication.findMany({
        where: { unit: { property: { landlordId } } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          moveInDate: true,
          monthlyIncome: true,
          employmentStatus: true,
          screeningStatus: true,
          createdAt: true,
          unit: {
            select: {
              id: true,
              name: true,
              property: { select: { id: true, name: true } },
            },
          },
        },
      })
    );

    const disputes = await safeQuery('disputes', () =>
      prisma.dispute.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          caseNumber: true,
          type: true,
          status: true,
          title: true,
          description: true,
          disputedAmount: true,
          resolution: true,
          createdAt: true,
          resolvedAt: true,
        },
      })
    );

    const scannedDocuments = await safeQuery('scannedDocuments', () =>
      prisma.scannedDocument.findMany({
        where: { landlordId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          originalFileName: true,
          documentType: true,
          classificationStatus: true,
          createdAt: true,
        },
      })
    );

    // ── 4. Assemble the full export payload ─────────────────────────────────
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      account: userRecord,
      landlordProfile: {
        ...landlord,
        wallet,
        properties,
        expenses,
        payouts,
        bankTransactions,
        contractorPayments,
        contractorEstimates,
        rentalApplications,
        leaseViolations,
        documents,
        legalDocuments,
        leaseTemplates,
        scannedDocuments,
        workOrders,
        teamMembers,
        disputes,
        owners,
        ownerStatements,
      },
    };

    return buildResponse(exportPayload);
  } catch (error) {
    console.error('[export-data] Unhandled error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export data', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Run a Prisma query and return its result, or null + a server log if it throws.
 * This ensures one bad query never blocks the entire export.
 */
async function safeQuery<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[export-data] Query failed for "${label}":`, err);
    return null;
  }
}

function buildResponse(payload: unknown) {
  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().split('T')[0];
  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="propertyflow-export-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
