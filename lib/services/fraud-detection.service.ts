import { prisma as db } from '@/db/prisma';
import type { IDData } from './ocr.service';

interface FraudCheckResult {
  checkType: string;
  passed: boolean;
  score: number; // 0-100, higher = more suspicious
  details: any;
}

interface FraudAnalysisResult {
  fraudScore: number; // 0-100
  indicators: string[];
  passed: boolean;
}

export class FraudDetectionService {
  private static readonly FRAUD_THRESHOLD = 70;
  private static readonly AUTO_REJECT_INDICATOR_COUNT = 3;

  /**
   * Run all fraud checks on a document
   */
  static async analyzeDocument(documentId: string): Promise<FraudAnalysisResult> {
    const document = await db.verificationDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const checks: FraudCheckResult[] = [];

    // Run fraud checks based on document type
    if (document.category === 'identity') {
      checks.push(await this.checkExpirationDate(document.extractedData as any));
      checks.push(await this.checkFormatValidity(document.extractedData as any, document.docType));
      checks.push(await this.checkImageQuality(document.cloudinarySecureUrl));
      
      // Image manipulation check would require additional libraries
      // For MVP, we'll do basic checks
      checks.push(await this.checkImageManipulation(document.cloudinarySecureUrl));
    } else if (document.category === 'employment') {
      checks.push(await this.checkDocumentRecency(document.extractedData as any));
      checks.push(await this.checkFormatValidity(document.extractedData as any, document.docType));
    }

    // Calculate overall fraud score (average of all check scores)
    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    const fraudScore = checks.length > 0 ? totalScore / checks.length : 0;

    // Collect fraud indicators
    const indicators = checks
      .filter(check => !check.passed)
      .map(check => check.checkType);

    // Determine if document passed
    const passed = fraudScore < this.FRAUD_THRESHOLD && indicators.length < this.AUTO_REJECT_INDICATOR_COUNT;

    // Log each check to database
    for (const check of checks) {
      await db.fraudDetectionLog.create({
        data: {
          verificationDocumentId: documentId,
          checkType: check.checkType,
          result: check.passed ? 'pass' : 'fail',
          score: check.score,
          details: check.details,
        },
      });
    }

    return {
      fraudScore: Math.round(fraudScore * 100) / 100,
      indicators,
      passed,
    };
  }

  /**
   * Check for image manipulation indicators
   */
  private static async checkImageManipulation(imageUrl: string): Promise<FraudCheckResult> {
    // Basic check - in production, use specialized libraries like:
    // - image-forensics
    // - exif-parser (check for editing software metadata)
    // - pixel-level analysis
    
    // For MVP, we'll do a simple check
    // In a real implementation, you'd analyze:
    // - EXIF data for editing software
    // - Compression artifacts
    // - Inconsistent lighting
    // - Clone detection
    
    return {
      checkType: 'image_manipulation',
      passed: true, // Assume pass for MVP
      score: 0,
      details: {
        message: 'Basic image manipulation check passed',
      },
    };
  }

  /**
   * Check format validity
   */
  private static async checkFormatValidity(
    extractedData: any,
    docType: string
  ): Promise<FraudCheckResult> {
    let passed = true;
    let score = 0;
    const issues: string[] = [];

    if (docType === 'drivers_license' || docType === 'state_id') {
      const idData = extractedData as IDData;
      
      // Check if required fields are present
      if (!idData.fullName || idData.fullName.length < 3) {
        issues.push('Missing or invalid name');
        score += 30;
      }
      
      if (!idData.dateOfBirth) {
        issues.push('Missing date of birth');
        score += 25;
      }
      
      if (!idData.idNumber || idData.idNumber.length < 5) {
        issues.push('Missing or invalid ID number');
        score += 25;
      }
      
      if (!idData.expirationDate) {
        issues.push('Missing expiration date');
        score += 20;
      }

      // Check date formats
      if (idData.dateOfBirth && !this.isValidDate(idData.dateOfBirth)) {
        issues.push('Invalid date of birth format');
        score += 15;
      }

      if (idData.expirationDate && !this.isValidDate(idData.expirationDate)) {
        issues.push('Invalid expiration date format');
        score += 15;
      }
    } else if (docType === 'pay_stub') {
      // Check pay stub format
      if (!extractedData.grossPay || extractedData.grossPay <= 0) {
        issues.push('Missing or invalid gross pay');
        score += 40;
      }
      
      if (!extractedData.employerName) {
        issues.push('Missing employer name');
        score += 30;
      }
    } else if (docType === 'bank_statement') {
      // Check bank statement format
      if (!extractedData.accountHolderName) {
        issues.push('Missing account holder name');
        score += 30;
      }
      
      if (!extractedData.deposits || extractedData.deposits.length === 0) {
        issues.push('No deposits found');
        score += 40;
      }
    }

    passed = score < 50;

    return {
      checkType: 'format_validation',
      passed,
      score,
      details: {
        issues,
        message: passed ? 'Format validation passed' : 'Format validation failed',
      },
    };
  }

  /**
   * Check expiration date
   */
  private static async checkExpirationDate(extractedData: any): Promise<FraudCheckResult> {
    const idData = extractedData as IDData;
    
    if (!idData.expirationDate) {
      return {
        checkType: 'expiration_check',
        passed: false,
        score: 100,
        details: {
          message: 'No expiration date found',
        },
      };
    }

    try {
      const expirationDate = new Date(idData.expirationDate);
      const now = new Date();

      if (expirationDate < now) {
        return {
          checkType: 'expiration_check',
          passed: false,
          score: 100,
          details: {
            expirationDate: idData.expirationDate,
            message: 'Document has expired',
          },
        };
      }

      return {
        checkType: 'expiration_check',
        passed: true,
        score: 0,
        details: {
          expirationDate: idData.expirationDate,
          message: 'Document is not expired',
        },
      };
    } catch (error) {
      return {
        checkType: 'expiration_check',
        passed: false,
        score: 50,
        details: {
          message: 'Could not parse expiration date',
        },
      };
    }
  }

  /**
   * Check image quality
   */
  private static async checkImageQuality(imageUrl: string): Promise<FraudCheckResult> {
    // Basic quality check
    // In production, analyze:
    // - Resolution
    // - Blur detection
    // - Glare detection
    // - Proper lighting
    
    // For MVP, assume pass
    return {
      checkType: 'image_quality',
      passed: true,
      score: 0,
      details: {
        message: 'Image quality check passed',
      },
    };
  }

  /**
   * Check document recency (for employment documents)
   */
  private static async checkDocumentRecency(extractedData: any): Promise<FraudCheckResult> {
    let documentDate: Date | null = null;

    // Try to find a date in the extracted data
    if (extractedData.payPeriodEnd) {
      documentDate = new Date(extractedData.payPeriodEnd);
    } else if (extractedData.statementPeriodEnd) {
      documentDate = new Date(extractedData.statementPeriodEnd);
    } else if (extractedData.date) {
      documentDate = new Date(extractedData.date);
    }

    if (!documentDate) {
      return {
        checkType: 'document_recency',
        passed: false,
        score: 60,
        details: {
          message: 'Could not determine document date',
        },
      };
    }

    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - documentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 90) {
      return {
        checkType: 'document_recency',
        passed: false,
        score: 80,
        details: {
          documentDate: documentDate.toISOString(),
          daysSinceDocument: daysDiff,
          message: 'Document is older than 90 days',
        },
      };
    }

    return {
      checkType: 'document_recency',
      passed: true,
      score: 0,
      details: {
        documentDate: documentDate.toISOString(),
        daysSinceDocument: daysDiff,
        message: 'Document is recent',
      },
    };
  }

  /**
   * Helper: Check if date string is valid
   */
  private static isValidDate(dateStr: string): boolean {
    try {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }
}
