import { prisma } from '@/db/prisma';
import type { DepositDisposition, DepositDeductionItem } from '@prisma/client';
import type {
  CreateDepositDispositionRequest,
  DeductionCategory,
  DepositRefundMethod,
} from '@/types/tenant-lifecycle';
import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary if not already configured
if (!cloudinary.config().cloud_name) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export class DepositService {
  /**
   * Creates a deposit disposition with itemized deductions
   */
  async createDisposition(
    params: CreateDepositDispositionRequest
  ): Promise<DepositDisposition & { deductions: DepositDeductionItem[] }> {
    const { leaseId, originalAmount, deductions, refundMethod, notes } = params;

    // Validate deductions
    for (const deduction of deductions) {
      if (!deduction.category || !deduction.amount || !deduction.description) {
        throw new Error('Each deduction requires category, amount, and description');
      }
      if (deduction.amount <= 0) {
        throw new Error('Deduction amount must be positive');
      }
    }

    // Calculate totals
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    
    if (totalDeductions > originalAmount) {
      throw new Error('Total deductions cannot exceed original deposit amount');
    }

    const refundAmount = originalAmount - totalDeductions;

    // Fetch the lease to get tenant and landlord info
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: true,
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

    // Create the deposit disposition with deductions in a transaction
    const disposition = await prisma.$transaction(async (tx) => {
      const depositDisposition = await tx.depositDisposition.create({
        data: {
          leaseId,
          tenantId: lease.tenantId,
          landlordId,
          originalAmount,
          totalDeductions,
          refundAmount,
          refundMethod,
          refundStatus: 'pending',
          notes,
        },
      });

      // Create deduction items
      if (deductions.length > 0) {
        await tx.depositDeductionItem.createMany({
          data: deductions.map((d) => ({
            depositDispositionId: depositDisposition.id,
            category: d.category,
            amount: d.amount,
            description: d.description,
            evidenceUrls: d.evidenceUrls || [],
          })),
        });
      }

      // Fetch the complete disposition with deductions
      return tx.depositDisposition.findUnique({
        where: { id: depositDisposition.id },
        include: { deductions: true },
      });
    });

    if (!disposition) {
      throw new Error('Failed to create deposit disposition');
    }

    return disposition;
  }

  /**
   * Uploads evidence file to Cloudinary
   */
  async uploadEvidence(
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; publicId: string }> {
    const isVideo = mimeType.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'deposit-evidence',
          resource_type: resourceType,
          public_id: `evidence_${Date.now()}_${fileName.replace(/\.[^/.]+$/, '')}`,
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Failed to upload evidence: ${error.message}`));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error('Upload failed with no result'));
          }
        }
      );

      uploadStream.end(file);
    });
  }

  /**
   * Gets a deposit disposition by ID
   */
  async getDispositionById(
    dispositionId: string
  ): Promise<(DepositDisposition & { deductions: DepositDeductionItem[] }) | null> {
    return prisma.depositDisposition.findUnique({
      where: { id: dispositionId },
      include: { deductions: true },
    });
  }

  /**
   * Gets all deposit dispositions for a lease
   */
  async getDispositionsForLease(
    leaseId: string
  ): Promise<(DepositDisposition & { deductions: DepositDeductionItem[] })[]> {
    return prisma.depositDisposition.findMany({
      where: { leaseId },
      include: { deductions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Updates refund status
   */
  async updateRefundStatus(
    dispositionId: string,
    status: 'pending' | 'processing' | 'completed',
    processedAt?: Date
  ): Promise<DepositDisposition> {
    return prisma.depositDisposition.update({
      where: { id: dispositionId },
      data: {
        refundStatus: status,
        processedAt: status === 'completed' ? (processedAt || new Date()) : undefined,
      },
    });
  }

  /**
   * Processes refund (placeholder for payment integration)
   */
  async processRefund(dispositionId: string): Promise<void> {
    const disposition = await this.getDispositionById(dispositionId);
    
    if (!disposition) {
      throw new Error('Deposit disposition not found');
    }

    if (disposition.refundAmount <= 0) {
      // No refund needed
      await this.updateRefundStatus(dispositionId, 'completed');
      return;
    }

    // Update status to processing
    await this.updateRefundStatus(dispositionId, 'processing');

    // TODO: Integrate with payment system (Stripe, etc.) to process actual refund
    // For now, just mark as completed
    // In production, this would:
    // 1. Create a Stripe transfer or refund
    // 2. Wait for confirmation
    // 3. Update status to completed

    await this.updateRefundStatus(dispositionId, 'completed');
  }

  /**
   * Sends disposition summary to tenant
   */
  async sendDispositionSummary(dispositionId: string): Promise<void> {
    const disposition = await prisma.depositDisposition.findUnique({
      where: { id: dispositionId },
      include: {
        deductions: true,
        lease: {
          include: {
            tenant: true,
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    if (!disposition) {
      throw new Error('Deposit disposition not found');
    }

    const tenant = disposition.lease.tenant;
    const property = disposition.lease.unit.property;

    // TODO: Send email notification to tenant
    // This would use the existing email service
    console.log(`Sending deposit disposition summary to ${tenant.email}`);
    console.log(`Property: ${property.name}`);
    console.log(`Original Deposit: $${disposition.originalAmount}`);
    console.log(`Total Deductions: $${disposition.totalDeductions}`);
    console.log(`Refund Amount: $${disposition.refundAmount}`);
    
    if (disposition.deductions.length > 0) {
      console.log('Deductions:');
      disposition.deductions.forEach((d) => {
        console.log(`  - ${d.category}: $${d.amount} - ${d.description}`);
      });
    }
  }

  /**
   * Calculates refund amount after applying to outstanding balance
   */
  calculateRefundAfterBalance(
    originalDeposit: number,
    deductions: number,
    outstandingBalance: number,
    applyToBalance: boolean
  ): { refundAmount: number; appliedToBalance: number } {
    const availableForRefund = originalDeposit - deductions;
    
    if (!applyToBalance || outstandingBalance <= 0) {
      return {
        refundAmount: availableForRefund,
        appliedToBalance: 0,
      };
    }

    const appliedToBalance = Math.min(availableForRefund, outstandingBalance);
    const refundAmount = availableForRefund - appliedToBalance;

    return {
      refundAmount,
      appliedToBalance,
    };
  }
}

// Export singleton instance
export const depositService = new DepositService();
