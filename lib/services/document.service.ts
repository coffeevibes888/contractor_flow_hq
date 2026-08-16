import { uploadToCloudinary, getSignedCloudinaryUrl, cloudinary } from '@/lib/cloudinary';
import { prisma as db } from '@/db/prisma';
import { VerificationService } from './verification.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

export interface UploadDocumentParams {
  file: Buffer;
  fileName: string;
  mimeType: string;
  applicationId: string;
  landlordId: string;
  uploadedById: string;
  category: 'identity' | 'employment';
  docType: string;
}

export interface UploadDocumentResult {
  id: string;
  cloudinaryPublicId: string;
  cloudinarySecureUrl: string;
  verificationStatus: string;
}

export class DocumentService {
  /**
   * Validate file before upload
   */
  private static validateFile(params: {
    fileName: string;
    mimeType: string;
    fileSize: number;
  }): { valid: boolean; error?: string } {
    // Check file size
    if (params.fileSize > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File size exceeds 10MB limit',
      };
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(params.mimeType)) {
      return {
        valid: false,
        error: 'Only JPEG, PNG, and PDF files are accepted',
      };
    }

    // Check file extension
    const extension = params.fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: 'Only JPEG, PNG, and PDF files are accepted',
      };
    }

    return { valid: true };
  }

  /**
   * Upload document to Cloudinary with encryption
   */
  static async uploadDocument(
    params: UploadDocumentParams
  ): Promise<UploadDocumentResult> {
    // Validate file
    const validation = this.validateFile({
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileSize: params.file.length,
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // Upload to Cloudinary with encryption
      const uploadResult = await uploadToCloudinary(params.file, {
        folder: `verification-documents/${params.landlordId}/${params.applicationId}`,
        resource_type: 'raw',
        type: 'authenticated', // Requires signed URLs for access
        access_mode: 'authenticated', // Server-side encryption
        format: params.mimeType === 'application/pdf' ? 'pdf' : undefined,
      });

      // Calculate data retention expiration (90 days from now)
      const dataRetentionExpiresAt = new Date();
      dataRetentionExpiresAt.setDate(dataRetentionExpiresAt.getDate() + 90);

      // Create database record
      const document = await db.verificationDocument.create({
        data: {
          applicationId: params.applicationId,
          landlordId: params.landlordId,
          uploadedById: params.uploadedById,
          category: params.category,
          docType: params.docType,
          originalFileName: params.fileName,
          mimeType: params.mimeType,
          fileSize: params.file.length,
          cloudinaryPublicId: uploadResult.public_id,
          cloudinaryResourceType: uploadResult.resource_type,
          cloudinarySecureUrl: uploadResult.secure_url,
          verificationStatus: 'pending',
          dataRetentionExpiresAt,
        },
      });

      // Update the ApplicationVerification status after document upload
      await VerificationService.updateVerificationStatus(params.applicationId);

      return {
        id: document.id,
        cloudinaryPublicId: document.cloudinaryPublicId,
        cloudinarySecureUrl: document.cloudinarySecureUrl,
        verificationStatus: document.verificationStatus,
      };
    } catch (error: any) {
      console.error('Document upload failed:', error);
      
      if (error?.http_code === 401) {
        throw new Error(
          'Document storage authentication failed. Please check Cloudinary credentials.'
        );
      }
      
      throw new Error(`Upload failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate secure signed URL for document access
   */
  static async getSecureUrl(
    documentId: string,
    expiresIn: number = 900, // 15 minutes default
    userId?: string,
    purpose?: string
  ): Promise<string> {
    // Get document from database
    const document = await db.verificationDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Generate signed URL
    const signedUrl = getSignedCloudinaryUrl({
      publicId: document.cloudinaryPublicId,
      resourceType: document.cloudinaryResourceType as 'image' | 'raw' | 'video',
      expiresInSeconds: expiresIn,
    });

    // Log access for audit trail
    if (userId) {
      const { AccessLogService } = await import('./access-log.service');
      await AccessLogService.logAccess({
        userId,
        documentId,
        purpose: purpose || 'document_access',
      });
    }
    
    return signedUrl;
  }

  /**
   * Delete document (GDPR compliance)
   */
  static async deleteDocument(documentId: string): Promise<void> {
    // Get document from database
    const document = await db.verificationDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    try {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(document.cloudinaryPublicId, {
        resource_type: document.cloudinaryResourceType,
        invalidate: true, // Invalidate CDN cache
      });

      // Delete from database
      await db.verificationDocument.delete({
        where: { id: documentId },
      });
    } catch (error: any) {
      console.error('Document deletion failed:', error);
      throw new Error(`Failed to delete document: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Auto-delete expired documents (cron job)
   */
  static async cleanupExpiredDocuments(): Promise<number> {
    const now = new Date();

    // Find expired documents
    const expiredDocuments = await db.verificationDocument.findMany({
      where: {
        dataRetentionExpiresAt: {
          lte: now,
        },
      },
    });

    let deletedCount = 0;

    // Delete each document
    for (const document of expiredDocuments) {
      try {
        await this.deleteDocument(document.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete expired document ${document.id}:`, error);
        // Continue with other documents
      }
    }

    return deletedCount;
  }
}
