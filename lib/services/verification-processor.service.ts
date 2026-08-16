import { prisma as db } from '@/db/prisma';
import { OCRService } from './ocr.service';
import { DocumentService } from './document.service';

const LOW_CONFIDENCE_THRESHOLD = 50;
const MAX_RETRY_ATTEMPTS = 3;

export class VerificationProcessorService {
  /**
   * Process a verification document through OCR pipeline
   */
  static async processDocument(documentId: string): Promise<void> {
    try {
      // Get document from database
      const document = await db.verificationDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Update status to processing
      await db.verificationDocument.update({
        where: { id: documentId },
        data: { verificationStatus: 'processing' },
      });

      // Generate secure URL for OCR processing
      const imageUrl = await DocumentService.getSecureUrl(documentId, 3600); // 1 hour for processing

      // Perform OCR based on document type
      let extractedData: any = {};
      let ocrConfidence = 0;

      try {
        if (document.category === 'identity') {
          const idData = await OCRService.extractIDData(imageUrl);
          extractedData = idData;
          ocrConfidence = idData.confidence;

          // Validate that this looks like an actual ID document
          const hasIdFields = idData.fullName || idData.idNumber || idData.dateOfBirth || idData.expirationDate || idData.issuingState;
          
          if (!hasIdFields) {
            // No ID-like fields found - likely not a valid ID
            await db.verificationDocument.update({
              where: { id: documentId },
              data: {
                verificationStatus: 'rejected',
                rejectionReason: 'This does not appear to be a valid government-issued ID. Please upload a driver\'s license, state ID, passport, or other official government ID.',
                ocrText: JSON.stringify(idData),
                ocrConfidence,
                ocrProcessedAt: new Date(),
                extractedData,
              },
            });
            return;
          }

          // Check if ID is expired
          if (idData.expirationDate) {
            const expDate = new Date(idData.expirationDate);
            if (expDate < new Date()) {
              await db.verificationDocument.update({
                where: { id: documentId },
                data: {
                  verificationStatus: 'rejected',
                  rejectionReason: `This ID appears to be expired (${idData.expirationDate}). Please upload a valid, unexpired government ID.`,
                  ocrText: JSON.stringify(idData),
                  ocrConfidence,
                  ocrProcessedAt: new Date(),
                  extractedData,
                },
              });
              return;
            }
          }
        } else if (document.category === 'employment') {
          // Check document recency before processing
          if (document.docType === 'pay_stub') {
            const payStubData = await OCRService.extractPayStubData(imageUrl);
            extractedData = payStubData;
            ocrConfidence = payStubData.confidence;

            // Validate recency (90 days)
            if (payStubData.payPeriodEnd) {
              const docDate = new Date(payStubData.payPeriodEnd);
              const daysSince = Math.floor((new Date().getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysSince > 90) {
                await db.verificationDocument.update({
                  where: { id: documentId },
                  data: {
                    verificationStatus: 'rejected',
                    rejectionReason: `Document is ${daysSince} days old. Employment documents must be dated within the last 90 days.`,
                    ocrText: JSON.stringify(payStubData),
                    ocrConfidence,
                    ocrProcessedAt: new Date(),
                    extractedData,
                  },
                });
                return;
              }
            }
          } else if (document.docType === 'bank_statement') {
            const bankData = await OCRService.extractBankStatementData(imageUrl);
            extractedData = bankData;
            ocrConfidence = bankData.confidence;

            // Validate recency (90 days)
            if (bankData.statementPeriodEnd) {
              const docDate = new Date(bankData.statementPeriodEnd);
              const daysSince = Math.floor((new Date().getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysSince > 90) {
                await db.verificationDocument.update({
                  where: { id: documentId },
                  data: {
                    verificationStatus: 'rejected',
                    rejectionReason: `Document is ${daysSince} days old. Employment documents must be dated within the last 90 days.`,
                    ocrText: JSON.stringify(bankData),
                    ocrConfidence,
                    ocrProcessedAt: new Date(),
                    extractedData,
                  },
                });
                return;
              }
            }
          } else {
            // Generic text extraction for other document types
            const ocrResult = await OCRService.extractText(imageUrl);
            extractedData = { text: ocrResult.text };
            ocrConfidence = ocrResult.confidence;
          }
        }

        // Store OCR results
        await db.verificationDocument.update({
          where: { id: documentId },
          data: {
            ocrText: extractedData.text || JSON.stringify(extractedData),
            ocrConfidence,
            ocrProcessedAt: new Date(),
            extractedData,
          },
        });

        // Check confidence level
        if (ocrConfidence < LOW_CONFIDENCE_THRESHOLD) {
          // Flag for manual review
          await db.verificationDocument.update({
            where: { id: documentId },
            data: {
              verificationStatus: 'needs_review',
              rejectionReason: `Low OCR confidence (${ocrConfidence.toFixed(1)}%). Manual review required.`,
            },
          });

          // TODO: Send notification to landlord (Task 23)
          return;
        }

        // Run fraud detection
        const { FraudDetectionService } = await import('./fraud-detection.service');
        const fraudResult = await FraudDetectionService.analyzeDocument(documentId);

        // Update document with fraud detection results
        await db.verificationDocument.update({
          where: { id: documentId },
          data: {
            fraudScore: fraudResult.fraudScore,
            fraudIndicators: fraudResult.indicators,
          },
        });

        // Check fraud detection results
        if (!fraudResult.passed) {
          if (fraudResult.indicators.length >= 3) {
            // Auto-reject if 3+ fraud indicators
            await db.verificationDocument.update({
              where: { id: documentId },
              data: {
                verificationStatus: 'rejected',
                rejectionReason: `Document rejected due to multiple fraud indicators: ${fraudResult.indicators.join(', ')}`,
              },
            });
          } else {
            // Flag for manual review if fraud score is high
            await db.verificationDocument.update({
              where: { id: documentId },
              data: {
                verificationStatus: 'needs_review',
                rejectionReason: `Document flagged for manual review. Fraud score: ${fraudResult.fraudScore.toFixed(1)}. Indicators: ${fraudResult.indicators.join(', ')}`,
              },
            });

            // TODO: Send notification to landlord (Task 23)
          }
          return;
        }

        // Set status to needs_review for landlord to manually approve
        await db.verificationDocument.update({
          where: { id: documentId },
          data: {
            verificationStatus: 'needs_review',
            verificationMethod: 'ocr',
            ocrProcessedAt: new Date(),
          },
        });

        // Update application verification status (Task 8)
        await this.updateApplicationVerificationStatus(document.applicationId);

        // Calculate income if this is an employment document
        if (document.category === 'employment') {
          const { IncomeCalculatorService } = await import('./income-calculator.service');
          const monthlyIncome = await IncomeCalculatorService.calculateMonthlyIncome(document.applicationId);
          
          // Update application verification with calculated income
          await db.applicationVerification.update({
            where: { applicationId: document.applicationId },
            data: { monthlyIncome },
          });

          // Track employment verification usage for billing
          const { EmploymentVerificationUsageService } = await import('./employment-verification-usage.service');
          const usageResult = await EmploymentVerificationUsageService.trackUsage({
            landlordId: document.landlordId,
            applicationId: document.applicationId,
            verificationDocumentId: documentId,
            method: 'ocr',
          });

          console.log(`[BILLING] Employment verification tracked: ${usageResult.wasFree ? 'FREE' : `$${usageResult.cost}`}`);
        }
      } catch (ocrError: any) {
        console.error('OCR processing error:', ocrError);
        
        // Retry logic
        const retryCount = (document.extractedData as any)?.retryCount || 0;
        
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          // Schedule retry
          await db.verificationDocument.update({
            where: { id: documentId },
            data: {
              extractedData: { ...extractedData, retryCount: retryCount + 1 },
              verificationStatus: 'pending',
            },
          });
          
          // TODO: Implement exponential backoff retry (can use a job queue)
          return;
        }

        // Max retries reached, flag for manual review
        await db.verificationDocument.update({
          where: { id: documentId },
          data: {
            verificationStatus: 'needs_review',
            rejectionReason: `OCR processing failed after ${MAX_RETRY_ATTEMPTS} attempts. Manual review required.`,
          },
        });

        // TODO: Send notification to landlord (Task 23)
      }
    } catch (error: any) {
      console.error('Document processing error:', error);
      
      // Update document status to failed
      await db.verificationDocument.update({
        where: { id: documentId },
        data: {
          verificationStatus: 'needs_review',
          rejectionReason: `Processing error: ${error?.message || 'Unknown error'}`,
        },
      });
    }
  }

  /**
   * Update application verification status based on documents
   */
  private static async updateApplicationVerificationStatus(
    applicationId: string
  ): Promise<void> {
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
    const verifiedIdentityDocs = identityDocs.filter(d => d.verificationStatus === 'verified');
    
    let identityStatus = 'pending';
    if (verifiedIdentityDocs.length > 0) {
      identityStatus = 'verified';
    } else if (identityDocs.some(d => d.verificationStatus === 'rejected')) {
      identityStatus = 'rejected';
    } else if (identityDocs.some(d => d.verificationStatus === 'needs_review')) {
      identityStatus = 'needs_review';
    }

    // Check employment verification status
    const employmentDocs = documents.filter(d => d.category === 'employment');
    const verifiedEmploymentDocs = employmentDocs.filter(d => d.verificationStatus === 'verified');
    
    let employmentStatus = 'pending';
    if (verifiedEmploymentDocs.length >= 3) {
      employmentStatus = 'verified';
    } else if (employmentDocs.some(d => d.verificationStatus === 'rejected')) {
      employmentStatus = 'rejected';
    } else if (employmentDocs.some(d => d.verificationStatus === 'needs_review')) {
      employmentStatus = 'needs_review';
    }

    // Determine overall status
    let overallStatus = 'incomplete';
    if (identityStatus === 'verified' && employmentStatus === 'verified') {
      overallStatus = 'complete';
    }

    // Update application verification
    await db.applicationVerification.update({
      where: { applicationId },
      data: {
        identityStatus,
        employmentStatus,
        overallStatus,
        identityVerifiedAt: identityStatus === 'verified' ? new Date() : appVerification.identityVerifiedAt,
        employmentVerifiedAt: employmentStatus === 'verified' ? new Date() : appVerification.employmentVerifiedAt,
        completedAt: overallStatus === 'complete' ? new Date() : null,
      },
    });
  }

  /**
   * Process all pending documents (for cron job or batch processing)
   */
  static async processPendingDocuments(): Promise<number> {
    const pendingDocuments = await db.verificationDocument.findMany({
      where: {
        verificationStatus: 'pending',
      },
      take: 10, // Process 10 at a time
    });

    let processedCount = 0;

    for (const document of pendingDocuments) {
      try {
        await this.processDocument(document.id);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process document ${document.id}:`, error);
        // Continue with other documents
      }
    }

    return processedCount;
  }
}
