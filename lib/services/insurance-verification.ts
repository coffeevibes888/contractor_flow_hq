/**
 * Insurance Verification Service
 * 
 * Handles contractor insurance certificate management and verification.
 * Uploads certificates to Cloudinary and tracks expiration dates.
 * 
 * Requirements: 2.1, 2.6
 * - 2.1: Upload insurance certificate and extract expiration date
 * - 2.6: Store insurance documents securely with encryption
 */

import { prisma } from '@/db/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';

// Types
export interface InsuranceResult {
  success: boolean;
  certificateUrl: string | null;
  provider: string | null;
  coverageAmount: number | null;
  expirationDate: Date | null;
  uploadedAt: Date;
  error?: string;
}

export interface CertificateData {
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  expirationDate: Date;
  insuredName: string;
  coverageTypes: string[]; // general_liability, workers_comp, etc.
}

export interface InsuranceStatus {
  isVerified: boolean;
  certificateUrl: string | null;
  provider: string | null;
  coverageAmount: number | null;
  expiresAt: Date | null;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  needsRenewal: boolean; // true if within 14 days of expiration
}

export interface ExpirationStatus {
  isExpired: boolean;
  expiresAt: Date | null;
  daysUntilExpiration: number | null;
  needsRenewal: boolean;
}

/**
 * Insurance Verification Service
 * Handles insurance certificate uploads and expiration tracking
 */
export class InsuranceVerificationService {
  /**
   * Upload insurance certificate to Cloudinary
   * Requirement 2.1: Upload insurance certificate
   * Requirement 2.6: Store insurance documents securely with encryption
   */
  static async uploadCertificate(
    contractorId: string,
    fileBuffer: Buffer,
    fileName: string,
    metadata: {
      provider?: string;
      coverageAmount?: number;
      expirationDate?: Date;
    }
  ): Promise<InsuranceResult> {
    try {
      // Upload to Cloudinary with secure settings
      // Requirement 2.6: Secure storage with encryption
      const uploadResult = await uploadToCloudinary(fileBuffer, {
        folder: `contractors/${contractorId}/insurance`,
        resource_type: 'raw',
        type: 'authenticated', // Requires signed URLs to access
        access_mode: 'authenticated',
        tags: ['insurance_certificate', contractorId],
        context: {
          contractor_id: contractorId,
          uploaded_at: new Date().toISOString(),
          file_name: fileName,
        },
      });

      // Update contractor profile with insurance information
      await prisma.contractorProfile.update({
        where: { id: contractorId },
        data: {
          insuranceCertificateUrl: uploadResult.secure_url,
          insuranceProvider: metadata.provider || null,
          insuranceCoverageAmount: metadata.coverageAmount || null,
          insuranceExpiry: metadata.expirationDate || null,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        certificateUrl: uploadResult.secure_url,
        provider: metadata.provider || null,
        coverageAmount: metadata.coverageAmount || null,
        expirationDate: metadata.expirationDate || null,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('Insurance certificate upload failed:', error);
      
      return {
        success: false,
        certificateUrl: null,
        provider: null,
        coverageAmount: null,
        expirationDate: null,
        uploadedAt: new Date(),
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Extract certificate data from uploaded file
   * Note: This is a placeholder for OCR/parsing functionality
   * In production, this would use OCR services like AWS Textract or Google Vision
   * For now, we rely on manual entry with this as a future enhancement
   */
  static async extractCertificateData(fileUrl: string): Promise<Partial<CertificateData>> {
    // Placeholder for future OCR implementation
    // In production, this would:
    // 1. Download the file from Cloudinary
    // 2. Send to OCR service (AWS Textract, Google Vision, etc.)
    // 3. Parse the OCR results to extract structured data
    // 4. Return the extracted data
    
    console.log('Certificate data extraction not yet implemented. Manual entry required.');
    
    return {
      // Return empty data - manual entry fallback
      provider: undefined,
      policyNumber: undefined,
      coverageAmount: undefined,
      expirationDate: undefined,
      insuredName: undefined,
      coverageTypes: [],
    };
  }

  /**
   * Get insurance status for a contractor
   */
  static async getInsuranceStatus(contractorId: string): Promise<InsuranceStatus> {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        insuranceCertificateUrl: true,
        insuranceProvider: true,
        insuranceCoverageAmount: true,
        insuranceExpiry: true,
      },
    });

    if (!contractor) {
      throw new Error('Contractor not found');
    }

    const now = new Date();
    const expiresAt = contractor.insuranceExpiry;
    
    let isExpired = false;
    let daysUntilExpiration: number | null = null;
    let needsRenewal = false;

    if (expiresAt) {
      isExpired = expiresAt < now;
      daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Requirement 2.3: Send reminder 14 days before expiration
      needsRenewal = daysUntilExpiration <= 14 && daysUntilExpiration > 0;
    }

    return {
      isVerified: !!contractor.insuranceCertificateUrl && !isExpired,
      certificateUrl: contractor.insuranceCertificateUrl,
      provider: contractor.insuranceProvider,
      coverageAmount: contractor.insuranceCoverageAmount 
        ? Number(contractor.insuranceCoverageAmount) 
        : null,
      expiresAt,
      isExpired,
      daysUntilExpiration,
      needsRenewal,
    };
  }

  /**
   * Check expiration status for a contractor's insurance
   * Requirement 2.3: Track expiration and send reminders
   */
  static async checkExpiration(contractorId: string): Promise<ExpirationStatus> {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        insuranceExpiry: true,
      },
    });

    if (!contractor) {
      throw new Error('Contractor not found');
    }

    const expiresAt = contractor.insuranceExpiry;
    
    if (!expiresAt) {
      return {
        isExpired: false,
        expiresAt: null,
        daysUntilExpiration: null,
        needsRenewal: false,
      };
    }

    const now = new Date();
    const isExpired = expiresAt < now;
    const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Requirement 2.3: 14-day renewal window
    const needsRenewal = daysUntilExpiration <= 14 && daysUntilExpiration > 0;

    return {
      isExpired,
      expiresAt,
      daysUntilExpiration,
      needsRenewal,
    };
  }

  /**
   * Remove expired insurance badge
   * Requirement 2.4: Remove badge when insurance expires
   */
  static async removeExpiredInsurance(contractorId: string): Promise<void> {
    const status = await this.checkExpiration(contractorId);
    
    if (status.isExpired) {
      // Note: Badge display is handled in the UI layer
      // This method is here for future automated cleanup if needed
      console.log(`Insurance expired for contractor ${contractorId}`);
    }
  }

  /**
   * Get all contractors with expiring insurance (for reminder cron job)
   * Returns contractors whose insurance expires within the specified days
   */
  static async getExpiringInsurance(daysAhead: number = 14): Promise<Array<{
    id: string;
    email: string;
    businessName: string;
    insuranceExpiresAt: Date;
    daysUntilExpiration: number;
  }>> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const contractors = await prisma.contractorProfile.findMany({
      where: {
        insuranceExpiry: {
          gte: new Date(),
          lte: futureDate,
        },
        insuranceCertificateUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        businessName: true,
        insuranceExpiry: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const now = new Date();
    
    return contractors
      .filter(c => c.insuranceExpiry && c.user?.email)
      .map(c => ({
        id: c.id,
        email: c.user!.email,
        businessName: c.businessName || 'Your Business',
        insuranceExpiresAt: c.insuranceExpiry!,
        daysUntilExpiration: Math.ceil(
          (c.insuranceExpiry!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));
  }
}
