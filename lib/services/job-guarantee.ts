import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

/**
 * Job Guarantee Service
 * 
 * Manages fund holds for completed jobs to ensure quality and provide
 * customer protection. Funds are held for 7 days before automatic release.
 * Integrates with existing Dispute system for complaint resolution.
 * 
 * Requirements: 6.1-6.7
 */

export interface HoldFundsRequest {
  jobId: string;
  contractorId: string;
  customerId: string;
  amount: number;
  stripePaymentIntentId?: string;
}

export interface HoldFundsResult {
  holdId: string;
  amount: number;
  releaseAt: Date;
  status: string;
}

export interface ReleaseFundsRequest {
  holdId: string;
  contractorStripeAccountId: string;
}

export interface ReleaseFundsResult {
  holdId: string;
  transferId: string;
  amount: number;
  releasedAt: Date;
}

export interface DisputeRequest {
  holdId: string;
  customerId: string;
  landlordId: string;
  type: string;
  category: string;
  title: string;
  description: string;
  desiredResolution: string;
  evidence?: Array<{
    url: string;
    type: string;
    description?: string;
  }>;
}

export interface DisputeResult {
  disputeId: string;
  holdId: string;
  caseNumber: string;
}

export interface RefundRequest {
  holdId: string;
  amount: number;
  reason: string;
}

export interface RefundResult {
  holdId: string;
  refundId: string;
  amount: number;
}

export class JobGuaranteeService {
  /**
   * Create a fund hold for a completed job
   * Requirement 6.1: Hold funds for 7 days before releasing to contractor
   */
  async holdFunds(request: HoldFundsRequest): Promise<HoldFundsResult> {
    const { jobId, contractorId, customerId, amount } = request;

    // Calculate release date (7 days from now)
    const releaseAt = new Date();
    releaseAt.setDate(releaseAt.getDate() + 7);

    // Create the hold record
    const hold = await prisma.jobGuaranteeHold.create({
      data: {
        jobId,
        contractorId,
        customerId,
        amount,
        status: 'held',
        releaseAt,
      },
    });

    return {
      holdId: hold.id,
      amount: hold.amount.toNumber(),
      releaseAt: hold.releaseAt,
      status: hold.status,
    };
  }

  /**
   * Release held funds to contractor
   * Requirement 6.1: Auto-release after 7 days if no dispute
   */
  async releaseFunds(request: ReleaseFundsRequest): Promise<ReleaseFundsResult> {
    const { holdId, contractorStripeAccountId } = request;

    // Get the hold
    const hold = await prisma.jobGuaranteeHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new Error('Hold not found');
    }

    if (hold.status !== 'held') {
      throw new Error(`Cannot release funds with status: ${hold.status}`);
    }

    // Check if release date has passed
    const now = new Date();
    if (now < hold.releaseAt) {
      throw new Error('Release date has not been reached');
    }

    // Transfer funds to contractor via Stripe
    let transfer: Stripe.Transfer | null = null;
    if (contractorStripeAccountId) {
      try {
        transfer = await stripe.transfers.create({
          amount: Math.round(hold.amount.toNumber() * 100), // Convert to cents
          currency: 'usd',
          destination: contractorStripeAccountId,
          description: `Job guarantee release for job ${hold.jobId}`,
          metadata: {
            holdId: hold.id,
            jobId: hold.jobId,
            contractorId: hold.contractorId,
          },
        });
      } catch (error) {
        console.error('Stripe transfer failed:', error);
        throw new Error('Failed to transfer funds to contractor');
      }
    }

    // Update hold status
    const updatedHold = await prisma.jobGuaranteeHold.update({
      where: { id: holdId },
      data: {
        status: 'released',
        releasedAt: now,
        stripeTransferId: transfer?.id,
      },
    });

    return {
      holdId: updatedHold.id,
      transferId: transfer?.id || '',
      amount: updatedHold.amount.toNumber(),
      releasedAt: updatedHold.releasedAt!,
    };
  }

  /**
   * Initiate a dispute for a held job
   * Requirement 6.2: Pause fund release when customer files complaint
   * Requirement 6.3: Collect evidence from both parties
   */
  async initiateDispute(request: DisputeRequest): Promise<DisputeResult> {
    const { holdId, customerId, landlordId, type, category, title, description, desiredResolution, evidence } = request;

    // Get the hold
    const hold = await prisma.jobGuaranteeHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new Error('Hold not found');
    }

    if (hold.status !== 'held') {
      throw new Error(`Cannot dispute hold with status: ${hold.status}`);
    }

    // Check if within 7-day window
    const now = new Date();
    if (now > hold.releaseAt) {
      throw new Error('Dispute window has expired');
    }

    // Generate case number
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const caseNumber = `DSP-${dateStr}-${randomNum}`;

    // Create dispute using existing Dispute model
    const dispute = await prisma.dispute.create({
      data: {
        caseNumber,
        landlordId,
        contractorId: hold.contractorId,
        workOrderId: hold.jobId,
        type,
        category,
        title,
        description,
        desiredResolution,
        disputedAmount: hold.amount,
        escrowHeld: hold.amount,
        status: 'open',
        priority: 'high',
        filedById: customerId,
        filedByRole: 'homeowner',
        responseDeadline: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48 hours
        resolutionDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Add evidence if provided
    if (evidence && evidence.length > 0) {
      await prisma.disputeEvidence.createMany({
        data: evidence.map((e) => ({
          disputeId: dispute.id,
          uploadedById: customerId,
          type: e.type,
          url: e.url,
          description: e.description,
        })),
      });
    }

    // Create timeline entry
    await prisma.disputeTimeline.create({
      data: {
        disputeId: dispute.id,
        action: 'created',
        description: 'Dispute filed for job guarantee',
        performedById: customerId,
        metadata: {
          holdId: hold.id,
          jobId: hold.jobId,
        },
      },
    });

    // Update hold status to disputed
    await prisma.jobGuaranteeHold.update({
      where: { id: holdId },
      data: {
        status: 'disputed',
        disputeId: dispute.id,
      },
    });

    return {
      disputeId: dispute.id,
      holdId: hold.id,
      caseNumber: dispute.caseNumber,
    };
  }

  /**
   * Resolve a dispute and handle fund distribution
   * Requirement 6.4: Issue refund if resolved in customer's favor
   * Requirement 6.5: Release funds if resolved in contractor's favor
   * Requirement 6.6: Cover up to $2,500 per job
   */
  async resolveDispute(
    disputeId: string,
    resolution: 'customer' | 'contractor' | 'split',
    refundAmount?: number,
    contractorStripeAccountId?: string
  ): Promise<void> {
    // Get the dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Get the associated hold
    const hold = await prisma.jobGuaranteeHold.findFirst({
      where: { disputeId },
    });

    if (!hold) {
      throw new Error('Associated hold not found');
    }

    const maxCoverage = 2500; // $2,500 max coverage per job
    const holdAmount = hold.amount.toNumber();

    if (resolution === 'customer') {
      // Resolved in customer's favor - issue refund
      const refundAmt = refundAmount || Math.min(holdAmount, maxCoverage);
      
      await this.refundCustomer({
        holdId: hold.id,
        amount: refundAmt,
        reason: `Dispute ${dispute.caseNumber} resolved in customer favor`,
      });

      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'resolved',
          resolutionType: refundAmount === holdAmount ? 'refund_full' : 'refund_partial',
          resolvedAmount: refundAmt,
          resolvedAt: new Date(),
        },
      });
    } else if (resolution === 'contractor') {
      // Resolved in contractor's favor - release funds
      if (contractorStripeAccountId) {
        await this.releaseFunds({
          holdId: hold.id,
          contractorStripeAccountId,
        });
      } else {
        // Just update status if no Stripe account
        await prisma.jobGuaranteeHold.update({
          where: { id: hold.id },
          data: {
            status: 'released',
            releasedAt: new Date(),
          },
        });
      }

      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'resolved',
          resolutionType: 'dismissed',
          resolvedAt: new Date(),
        },
      });
    } else if (resolution === 'split') {
      // Split resolution - partial refund and partial release
      const refundAmt = refundAmount || Math.min(holdAmount / 2, maxCoverage);
      
      await this.refundCustomer({
        holdId: hold.id,
        amount: refundAmt,
        reason: `Dispute ${dispute.caseNumber} resolved with split decision`,
      });

      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'resolved',
          resolutionType: 'mediated_agreement',
          resolvedAmount: refundAmt,
          resolvedAt: new Date(),
        },
      });
    }
  }

  /**
   * Refund customer from held funds
   */
  async refundCustomer(request: RefundRequest): Promise<RefundResult> {
    const { holdId, amount, reason } = request;

    const hold = await prisma.jobGuaranteeHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new Error('Hold not found');
    }

    const maxRefund = Math.min(hold.amount.toNumber(), 2500); // $2,500 max
    const refundAmount = Math.min(amount, maxRefund);

    // In a real implementation, this would process a Stripe refund
    // For now, we'll just update the hold status
    const updatedHold = await prisma.jobGuaranteeHold.update({
      where: { id: holdId },
      data: {
        status: 'refunded',
      },
    });

    return {
      holdId: updatedHold.id,
      refundId: `refund_${Date.now()}`, // Mock refund ID
      amount: refundAmount,
    };
  }

  /**
   * Get holds ready for release (7 days passed, no dispute)
   */
  async getHoldsReadyForRelease(): Promise<string[]> {
    const now = new Date();
    
    const holds = await prisma.jobGuaranteeHold.findMany({
      where: {
        status: 'held',
        releaseAt: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
    });

    return holds.map((h) => h.id);
  }

  /**
   * Check contractor complaint history
   * Requirement 6.7: Flag contractors with 3+ upheld complaints in 90 days
   */
  async checkContractorComplaintHistory(contractorId: string): Promise<{
    shouldFlag: boolean;
    complaintCount: number;
  }> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Count upheld complaints (resolved in customer's favor)
    const complaints = await prisma.dispute.count({
      where: {
        contractorId,
        status: 'resolved',
        resolutionType: {
          in: ['refund_full', 'refund_partial'],
        },
        resolvedAt: {
          gte: ninetyDaysAgo,
        },
      },
    });

    return {
      shouldFlag: complaints >= 3,
      complaintCount: complaints,
    };
  }

  /**
   * Get hold by ID
   */
  async getHold(holdId: string) {
    return prisma.jobGuaranteeHold.findUnique({
      where: { id: holdId },
    });
  }

  /**
   * Get holds for a contractor
   */
  async getContractorHolds(contractorId: string) {
    return prisma.jobGuaranteeHold.findMany({
      where: { contractorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get holds for a customer
   */
  async getCustomerHolds(customerId: string) {
    return prisma.jobGuaranteeHold.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Export singleton instance
export const jobGuaranteeService = new JobGuaranteeService();
