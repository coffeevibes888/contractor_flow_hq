import { prisma as db } from '@/db/prisma';
import { IncomeCalculatorService } from './income-calculator.service';

export interface VerificationStatus {
  identityStatus: string;
  employmentStatus: string;
  overallStatus: string;
  canSubmit: boolean;
  identityVerifiedAt: Date | null;
  employmentVerifiedAt: Date | null;
  completedAt: Date | null;
  monthlyIncome: number | null;
  requiredDocuments: {
    identity: {
      required: boolean;
      uploaded: boolean;
      verified: boolean;
      count: number;
      verifiedCount: number;
    };
    employment: {
      required: boolean;
      uploaded: boolean;
      verified: boolean;
      count: number;
      verifiedCount: number;
      requiredCount: number;
    };
  };
}

export class VerificationService {
  /**
   * Get verification status for an application
   */
  static async getVerificationStatus(applicationId: string): Promise<VerificationStatus> {
    // Get or create ApplicationVerification record
    let appVerification = await db.applicationVerification.findUnique({
      where: { applicationId },
    });

    if (!appVerification) {
      appVerification = await db.applicationVerification.create({
        data: {
          applicationId,
          identityStatus: 'pending',
          employmentStatus: 'pending',
          overallStatus: 'incomplete',
        },
      });
    }

    // Get document counts
    const identityDocs = await db.verificationDocument.findMany({
      where: {
        applicationId,
        category: 'identity',
      },
    });

    const employmentDocs = await db.verificationDocument.findMany({
      where: {
        applicationId,
        category: 'employment',
      },
    });

    const verifiedIdentityDocs = identityDocs.filter(d => d.verificationStatus === 'verified');
    const verifiedEmploymentDocs = employmentDocs.filter(d => d.verificationStatus === 'verified');
    
    // Count all uploaded docs (not rejected) for progress tracking
    const uploadedIdentityDocs = identityDocs.filter(d => d.verificationStatus !== 'rejected');
    const uploadedEmploymentDocs = employmentDocs.filter(d => d.verificationStatus !== 'rejected');

    // Determine if application can be submitted
    // Allow submission with at least 1 identity doc and 1 employment doc (any number)
    const canSubmit = 
      uploadedIdentityDocs.length >= 1 &&
      uploadedEmploymentDocs.length >= 1;

    // Determine identity status based on uploads
    let identityStatus = appVerification.identityStatus;
    if (uploadedIdentityDocs.length > 0 && identityStatus === 'pending') {
      identityStatus = 'uploaded';
    }
    if (verifiedIdentityDocs.length > 0) {
      identityStatus = 'verified';
    }

    // Determine employment status based on uploads
    let employmentStatus = appVerification.employmentStatus;
    if (uploadedEmploymentDocs.length > 0 && employmentStatus === 'pending') {
      employmentStatus = 'uploaded';
    }
    if (verifiedEmploymentDocs.length > 0) {
      employmentStatus = 'verified';
    }

    // Determine overall status
    let overallStatus = appVerification.overallStatus;
    if (canSubmit && overallStatus === 'incomplete') {
      overallStatus = 'documents_submitted';
    }

    return {
      identityStatus,
      employmentStatus,
      overallStatus,
      canSubmit,
      identityVerifiedAt: appVerification.identityVerifiedAt,
      employmentVerifiedAt: appVerification.employmentVerifiedAt,
      completedAt: appVerification.completedAt,
      monthlyIncome: appVerification.monthlyIncome ? parseFloat(appVerification.monthlyIncome.toString()) : null,
      requiredDocuments: {
        identity: {
          required: true,
          uploaded: uploadedIdentityDocs.length > 0,
          verified: verifiedIdentityDocs.length > 0,
          count: uploadedIdentityDocs.length,
          verifiedCount: verifiedIdentityDocs.length,
        },
        employment: {
          required: true,
          uploaded: uploadedEmploymentDocs.length > 0,
          verified: verifiedEmploymentDocs.length > 0, // Changed: any verified doc counts
          count: uploadedEmploymentDocs.length,
          verifiedCount: verifiedEmploymentDocs.length,
          requiredCount: 1, // Changed from 3 to 1 - minimum required
        },
      },
    };
  }

  /**
   * Check if application can be submitted
   */
  static async canSubmitApplication(applicationId: string): Promise<boolean> {
    const status = await this.getVerificationStatus(applicationId);
    return status.canSubmit;
  }

  /**
   * Check if income meets minimum requirements
   */
  static async meetsIncomeRequirements(
    applicationId: string,
    rentAmount: number
  ): Promise<boolean> {
    return await IncomeCalculatorService.meetsIncomeRequirements(
      applicationId,
      rentAmount,
      3 // 3x rent multiplier
    );
  }

  /**
   * Get detailed verification report for landlord
   */
  static async getVerificationReport(applicationId: string): Promise<{
    status: VerificationStatus;
    documents: any[];
    incomeDetails: any;
  }> {
    const status = await this.getVerificationStatus(applicationId);

    // Get all documents with details
    const documents = await db.verificationDocument.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        docType: true,
        originalFileName: true,
        verificationStatus: true,
        verificationCompletedAt: true,
        ocrConfidence: true,
        fraudScore: true,
        fraudIndicators: true,
        rejectionReason: true,
        extractedData: true,
        createdAt: true,
      },
    });

    // Get income details
    const incomeDetails = await IncomeCalculatorService.getIncomeVerificationDetails(applicationId);

    return {
      status,
      documents,
      incomeDetails,
    };
  }

  /**
   * Update verification status after document changes
   */
  static async updateVerificationStatus(applicationId: string): Promise<void> {
    // Get or create ApplicationVerification record
    let appVerification = await db.applicationVerification.findUnique({
      where: { applicationId },
    });

    if (!appVerification) {
      appVerification = await db.applicationVerification.create({
        data: {
          applicationId,
          identityStatus: 'pending',
          employmentStatus: 'pending',
          overallStatus: 'incomplete',
        },
      });
    }

    // Get all documents for this application
    const documents = await db.verificationDocument.findMany({
      where: { applicationId },
    });

    // Check identity verification status
    const identityDocs = documents.filter(d => d.category === 'identity');
    const uploadedIdentityDocs = identityDocs.filter(d => d.verificationStatus !== 'rejected');
    const verifiedIdentityDocs = identityDocs.filter(d => d.verificationStatus === 'verified');
    
    let identityStatus = 'pending';
    let identityDocumentId: string | null = null;
    
    if (verifiedIdentityDocs.length > 0) {
      identityStatus = 'verified';
      identityDocumentId = verifiedIdentityDocs[0].id;
    } else if (identityDocs.some(d => d.verificationStatus === 'rejected')) {
      identityStatus = 'rejected';
    } else if (identityDocs.some(d => d.verificationStatus === 'needs_review')) {
      identityStatus = 'needs_review';
    } else if (uploadedIdentityDocs.length > 0) {
      identityStatus = 'uploaded'; // Documents uploaded, awaiting review
    }

    // Check employment verification status
    const employmentDocs = documents.filter(d => d.category === 'employment');
    const uploadedEmploymentDocs = employmentDocs.filter(d => d.verificationStatus !== 'rejected');
    const verifiedEmploymentDocs = employmentDocs.filter(d => d.verificationStatus === 'verified');
    
    let employmentStatus = 'pending';
    
    // Changed: Any verified employment document counts as verified
    if (verifiedEmploymentDocs.length > 0) {
      employmentStatus = 'verified';
    } else if (employmentDocs.some(d => d.verificationStatus === 'rejected')) {
      employmentStatus = 'rejected';
    } else if (employmentDocs.some(d => d.verificationStatus === 'needs_review')) {
      employmentStatus = 'needs_review';
    } else if (uploadedEmploymentDocs.length > 0) {
      employmentStatus = 'uploaded'; // Documents uploaded, awaiting review
    }

    // Determine overall status
    let overallStatus = 'incomplete';
    let completedAt: Date | null = null;
    
    if (identityStatus === 'verified' && employmentStatus === 'verified') {
      overallStatus = 'complete';
      completedAt = new Date();
      
      // Set expiration date (90 days from completion)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      
      await db.applicationVerification.update({
        where: { applicationId },
        data: {
          identityStatus,
          employmentStatus,
          overallStatus,
          identityDocumentId,
          identityVerifiedAt: identityStatus === 'verified' ? new Date() : appVerification.identityVerifiedAt,
          employmentVerifiedAt: employmentStatus === 'verified' ? new Date() : appVerification.employmentVerifiedAt,
          completedAt,
          expiresAt,
        },
      });
    } else {
      // Check if documents have been uploaded (even if not verified yet)
      // Changed: Only need 1 of each type to be considered "documents_submitted"
      if (uploadedIdentityDocs.length >= 1 && uploadedEmploymentDocs.length >= 1) {
        overallStatus = 'documents_submitted';
      } else if (uploadedIdentityDocs.length > 0 || uploadedEmploymentDocs.length > 0) {
        overallStatus = 'in_progress';
      }
      
      await db.applicationVerification.update({
        where: { applicationId },
        data: {
          identityStatus,
          employmentStatus,
          overallStatus,
          identityDocumentId,
          identityVerifiedAt: identityStatus === 'verified' ? new Date() : appVerification.identityVerifiedAt,
          employmentVerifiedAt: employmentStatus === 'verified' ? new Date() : appVerification.employmentVerifiedAt,
        },
      });
    }
  }
}
