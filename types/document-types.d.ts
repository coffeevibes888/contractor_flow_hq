import { User } from '@prisma/client';

type ScannedDocument = {
  id: string;
  landlordId: string;
  uploadedBy: string | null;
  originalFileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  documentType?: string | null;
  classificationStatus: 'pending' | 'classified' | 'manual_review';
  conversionStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  ocrText?: string | null;
  ocrConfidence?: number | null;
  ocrProcessedAt?: Date | null;
  classifiedAt?: Date | null;
  extractedData?: any;
  createdAt: Date;
  updatedAt: Date;
  uploader?: Pick<User, 'name' | 'email'> | null;
  notes?: string | null;
};

export type { ScannedDocument };
