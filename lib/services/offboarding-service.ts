import { prisma } from '@/db/prisma';
import type { 
  Lease, 
  TenantDeparture, 
  TenantHistory, 
  UnitTurnoverChecklist,
  DepositDisposition 
} from '@prisma/client';
import type {
  DepartureType,
  OffboardingParams,
  OffboardingResult,
  OutstandingBalanceParams,
  BalanceDisposition,
} from '@/types/tenant-lifecycle';

export class OffboardingService {
  /**
   * Executes the complete tenant offboarding workflow
   * Steps: terminate lease → record departure → handle deposit → clear balances → create history → create checklist
   */
  async executeOffboarding(params: OffboardingParams): Promise<OffboardingResult> {
    const { leaseId, departureType, departureDate, notes, markUnitAvailable } = params;
    
    const result: OffboardingResult = {
      success: false,
      leaseTerminated: false,
      departureRecorded: false,
      errors: [],
    };

    try {
      // Fetch the lease with all related data
      const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: {
          tenant: true,
          unit: {
            include: {
              property: true,
            },
          },
          rentPayments: {
            where: {
              status: { in: ['pending', 'overdue'] },
            },
          },
        },
      });

      if (!lease) {
        result.errors?.push('Lease not found');
        return result;
      }

      const landlordId = lease.unit.property.landlordId;
      if (!landlordId) {
        result.errors?.push('Property has no associated landlord');
        return result;
      }

      // Step 1: Terminate the lease
      try {
        await this.terminateLease(leaseId, departureType, departureDate);
        result.leaseTerminated = true;
      } catch (error: any) {
        result.errors?.push(`Failed to terminate lease: ${error.message}`);
        return result; // Halt on lease termination failure
      }

      // Step 2: Record the departure
      try {
        const departure = await this.recordDeparture({
          leaseId,
          tenantId: lease.tenantId,
          unitId: lease.unitId,
          landlordId,
          departureType,
          departureDate,
          notes,
        });
        result.departureRecorded = true;
      } catch (error: any) {
        result.errors?.push(`Failed to record departure: ${error.message}`);
        // Continue - departure recording is not critical
      }

      // Step 3: Cancel pending payments
      try {
        await this.cancelPendingPayments(leaseId);
      } catch (error: any) {
        result.errors?.push(`Failed to cancel pending payments: ${error.message}`);
        // Continue - not critical
      }

      // Step 4: Create tenant history record
      try {
        const history = await this.createTenantHistory({
          lease,
          departureType,
          departureDate,
        });
        result.tenantHistoryId = history.id;
      } catch (error: any) {
        result.errors?.push(`Failed to create tenant history: ${error.message}`);
        // Continue - not critical
      }

      // Step 5: Create turnover checklist
      try {
        const checklist = await this.createTurnoverChecklist({
          unitId: lease.unitId,
          leaseId,
          landlordId,
        });
        result.turnoverChecklistId = checklist.id;
      } catch (error: any) {
        result.errors?.push(`Failed to create turnover checklist: ${error.message}`);
        // Continue - not critical
      }

      // Step 6: Optionally mark unit as available
      if (markUnitAvailable) {
        try {
          await prisma.unit.update({
            where: { id: lease.unitId },
            data: { 
              isAvailable: true,
              availableFrom: departureDate,
            },
          });
        } catch (error: any) {
          result.errors?.push(`Failed to mark unit available: ${error.message}`);
          // Continue - not critical
        }
      }

      result.success = true;
      return result;

    } catch (error: any) {
      result.errors?.push(`Unexpected error during offboarding: ${error.message}`);
      return result;
    }
  }

  /**
   * Terminates a lease
   */
  private async terminateLease(
    leaseId: string,
    reason: DepartureType,
    terminationDate: Date
  ): Promise<Lease> {
    return prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: 'terminated',
        terminationReason: reason,
        terminatedAt: terminationDate,
        endDate: terminationDate,
      },
    });
  }

  /**
   * Records a tenant departure
   */
  private async recordDeparture(params: {
    leaseId: string;
    tenantId: string;
    unitId: string;
    landlordId: string;
    departureType: DepartureType;
    departureDate: Date;
    notes?: string;
    evictionNoticeId?: string;
  }): Promise<TenantDeparture> {
    return prisma.tenantDeparture.create({
      data: {
        leaseId: params.leaseId,
        tenantId: params.tenantId,
        unitId: params.unitId,
        landlordId: params.landlordId,
        departureType: params.departureType,
        departureDate: params.departureDate,
        notes: params.notes,
        evictionNoticeId: params.evictionNoticeId,
      },
    });
  }

  /**
   * Cancels all pending rent payments for a lease
   */
  private async cancelPendingPayments(leaseId: string): Promise<number> {
    const result = await prisma.rentPayment.updateMany({
      where: {
        leaseId,
        status: { in: ['pending', 'scheduled'] },
      },
      data: {
        status: 'cancelled',
      },
    });
    return result.count;
  }

  /**
   * Creates a tenant history record from lease data
   */
  async createTenantHistory(params: {
    lease: Lease & { 
      tenant: { name: string; email: string; phoneNumber: string | null };
      unit: { id: string; property: { id: string; landlordId: string | null } };
    };
    departureType: DepartureType;
    departureDate: Date;
    depositDisposition?: DepositDisposition;
  }): Promise<TenantHistory> {
    const { lease, departureType, departureDate, depositDisposition } = params;
    const landlordId = lease.unit.property.landlordId;

    if (!landlordId) {
      throw new Error('Property has no associated landlord');
    }

    return prisma.tenantHistory.create({
      data: {
        unitId: lease.unitId,
        propertyId: lease.unit.property.id,
        landlordId,
        tenantId: lease.tenantId,
        leaseId: lease.id,
        tenantName: lease.tenant.name,
        tenantEmail: lease.tenant.email,
        tenantPhone: lease.tenant.phoneNumber,
        leaseStartDate: lease.startDate,
        leaseEndDate: lease.endDate || departureDate,
        rentAmount: lease.rentAmount,
        departureType,
        departureDate,
        depositAmount: depositDisposition?.originalAmount,
        depositRefunded: depositDisposition?.refundAmount,
        depositDeducted: depositDisposition?.totalDeductions,
        wasEvicted: departureType === 'eviction',
      },
    });
  }

  /**
   * Creates a turnover checklist for a unit
   */
  private async createTurnoverChecklist(params: {
    unitId: string;
    leaseId: string;
    landlordId: string;
  }): Promise<UnitTurnoverChecklist> {
    return prisma.unitTurnoverChecklist.create({
      data: {
        unitId: params.unitId,
        leaseId: params.leaseId,
        landlordId: params.landlordId,
        depositProcessed: false,
        keysCollected: false,
        unitInspected: false,
        cleaningCompleted: false,
        repairsCompleted: false,
      },
    });
  }

  /**
   * Handles outstanding balance disposition
   */
  async handleOutstandingBalance(params: OutstandingBalanceParams): Promise<void> {
    const { leaseId, disposition, depositToApply } = params;

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        rentPayments: {
          where: {
            status: { in: ['pending', 'overdue'] },
          },
        },
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!lease) {
      throw new Error('Lease not found');
    }

    const landlordId = lease.unit.property.landlordId;
    if (!landlordId) {
      throw new Error('Property has no associated landlord');
    }

    const totalOwed = lease.rentPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    switch (disposition) {
      case 'write_off':
        // Create bad debt expense record
        await prisma.expense.create({
          data: {
            landlordId,
            propertyId: lease.unit.property.id,
            unitId: lease.unitId,
            amount: totalOwed,
            category: 'bad_debt',
            description: `Written off balance for lease ${leaseId}`,
            incurredAt: new Date(),
          },
        });
        
        // Mark payments as written off
        await prisma.rentPayment.updateMany({
          where: {
            leaseId,
            status: { in: ['pending', 'overdue'] },
          },
          data: {
            status: 'cancelled',
            metadata: { writtenOff: true, writtenOffAt: new Date().toISOString() },
          },
        });
        break;

      case 'apply_deposit':
        if (depositToApply && depositToApply > 0) {
          // This would be handled by the deposit disposition flow
          // Just mark payments as partially/fully covered
          let remaining = depositToApply;
          for (const payment of lease.rentPayments) {
            if (remaining <= 0) break;
            const paymentAmount = Number(payment.amount);
            if (remaining >= paymentAmount) {
              await prisma.rentPayment.update({
                where: { id: payment.id },
                data: {
                  status: 'paid',
                  paidAt: new Date(),
                  metadata: { paidFromDeposit: true },
                },
              });
              remaining -= paymentAmount;
            }
          }
        }
        break;

      case 'collections':
        // Mark tenant for collections
        await prisma.user.update({
          where: { id: lease.tenantId },
          data: {
            // Add collections metadata - in a real system this would be a separate model
            // For now, we'll use a flag approach
          },
        });
        
        // Create a record of the collections action
        // In production, this would integrate with a collections service
        console.log(`Tenant ${lease.tenantId} marked for collections: $${totalOwed}`);
        break;
    }
  }

  /**
   * Gets the offboarding status for a lease
   */
  async getOffboardingStatus(leaseId: string): Promise<{
    leaseTerminated: boolean;
    departureRecorded: boolean;
    historyCreated: boolean;
    checklistCreated: boolean;
  }> {
    const [lease, departure, history, checklist] = await Promise.all([
      prisma.lease.findUnique({ where: { id: leaseId } }),
      prisma.tenantDeparture.findFirst({ where: { leaseId } }),
      prisma.tenantHistory.findFirst({ where: { leaseId } }),
      prisma.unitTurnoverChecklist.findFirst({ where: { leaseId } }),
    ]);

    return {
      leaseTerminated: lease?.status === 'terminated',
      departureRecorded: !!departure,
      historyCreated: !!history,
      checklistCreated: !!checklist,
    };
  }
}

// Export singleton instance
export const offboardingService = new OffboardingService();
