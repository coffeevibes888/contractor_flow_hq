'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentLandlord } from './landlord.actions';

interface UploadDocumentParams {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export async function uploadDocument(params: UploadDocumentParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: 'Unable to determine landlord' };
    }

    const document = await prisma.scannedDocument.create({
      data: {
        landlordId: landlordResult.landlord.id,
        uploadedBy: session.user.id,
        originalFileName: params.fileName,
        fileUrl: params.fileUrl,
        fileType: params.fileType,
        fileSize: params.fileSize,
        classificationStatus: 'pending',
        conversionStatus: 'pending',
      },
    });

    revalidatePath('/admin/documents');
    return { success: true, document };
  } catch (error) {
    console.error('Upload document error:', error);
    return { success: false, message: 'Failed to upload document' };
  }
}

export async function processDocumentOCR(documentId: string, ocrText: string, confidence: number) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const document = await prisma.scannedDocument.update({
      where: { id: documentId },
      data: {
        ocrText,
        ocrConfidence: confidence,
        ocrProcessedAt: new Date(),
      },
    });

    // Auto-classify based on keywords
    const classification = await autoClassifyDocument(ocrText);
    if (classification) {
      await prisma.scannedDocument.update({
        where: { id: documentId },
        data: {
          documentType: classification.type,
          classificationStatus: 'classified',
          classifiedAt: new Date(),
          extractedData: classification.extractedData,
        },
      });
    }

    revalidatePath('/admin/documents');
    return { success: true, document };
  } catch (error) {
    console.error('Process OCR error:', error);
    return { success: false, message: 'Failed to process OCR' };
  }
}

async function autoClassifyDocument(text: string) {
  const lowerText = text.toLowerCase();
  
  // Lease detection
  if (
    lowerText.includes('lease agreement') ||
    lowerText.includes('rental agreement') ||
    (lowerText.includes('tenant') && lowerText.includes('landlord') && lowerText.includes('rent'))
  ) {
    return {
      type: 'lease',
      extractedData: extractLeaseData(text),
    };
  }
  
  // Receipt detection
  if (
    lowerText.includes('receipt') ||
    lowerText.includes('payment received') ||
    (lowerText.includes('paid') && lowerText.includes('amount'))
  ) {
    return {
      type: 'receipt',
      extractedData: extractReceiptData(text),
    };
  }
  
  // Application detection
  if (
    lowerText.includes('rental application') ||
    lowerText.includes('tenant application') ||
    (lowerText.includes('applicant') && lowerText.includes('monthly income'))
  ) {
    return {
      type: 'application',
      extractedData: extractApplicationData(text),
    };
  }

  return null;
}

function extractLeaseData(text: string) {
  const data: any = {};
  
  // Extract dates (simple regex patterns)
  const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g;
  const dates = text.match(datePattern);
  if (dates && dates.length >= 2) {
    data.startDate = dates[0];
    data.endDate = dates[1];
  }
  
  // Extract rent amount
  const rentPattern = /\$?\s*(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)\s*(?:per month|\/month|monthly)/i;
  const rentMatch = text.match(rentPattern);
  if (rentMatch) {
    data.rentAmount = rentMatch[1].replace(/,/g, '');
  }
  
  // Extract names (look for "Tenant:" or "Landlord:")
  const tenantPattern = /tenant[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
  const tenantMatch = text.match(tenantPattern);
  if (tenantMatch) {
    data.tenantName = tenantMatch[1];
  }
  
  return data;
}

function extractReceiptData(text: string) {
  const data: any = {};
  
  // Extract amount
  const amountPattern = /(?:amount|total|paid)[:\s]*\$?\s*(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)/i;
  const amountMatch = text.match(amountPattern);
  if (amountMatch) {
    data.amount = amountMatch[1].replace(/,/g, '');
  }
  
  // Extract date
  const datePattern = /(?:date|paid on)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    data.date = dateMatch[1];
  }
  
  // Extract payment method
  if (text.toLowerCase().includes('cash')) {
    data.paymentMethod = 'cash';
  } else if (text.toLowerCase().includes('check')) {
    data.paymentMethod = 'check';
  }
  
  return data;
}

function extractApplicationData(text: string) {
  const data: any = {};
  
  // Extract name
  const namePattern = /(?:name|applicant)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
  const nameMatch = text.match(namePattern);
  if (nameMatch) {
    data.applicantName = nameMatch[1];
  }
  
  // Extract email
  const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const emailMatch = text.match(emailPattern);
  if (emailMatch) {
    data.email = emailMatch[1];
  }
  
  // Extract phone
  const phonePattern = /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/;
  const phoneMatch = text.match(phonePattern);
  if (phoneMatch) {
    data.phone = phoneMatch[1];
  }
  
  return data;
}

export async function getDocuments() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: 'Unable to determine landlord' };
    }

    const documents = await prisma.scannedDocument.findMany({
      where: { landlordId: landlordResult.landlord.id },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { name: true, email: true },
        },
      },
    });

    // Cast classificationStatus and conversionStatus to match ScannedDocument type
    const typedDocuments = documents.map(doc => ({
      ...doc,
      classificationStatus: doc.classificationStatus as 'pending' | 'classified' | 'manual_review',
      conversionStatus: doc.conversionStatus as 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped',
      ocrConfidence: doc.ocrConfidence?.toNumber?.() ?? null
    }));

    return { success: true, documents: typedDocuments };
  } catch (error) {
    console.error('Get documents error:', error);
    return { success: false, message: 'Failed to fetch documents' };
  }
}

export async function classifyDocument(documentId: string, documentType: string, extractedData: any) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const document = await prisma.scannedDocument.update({
      where: { id: documentId },
      data: {
        documentType,
        extractedData,
        classificationStatus: 'classified',
        classifiedAt: new Date(),
      },
    });

    revalidatePath('/admin/documents');
    return { success: true, document };
  } catch (error) {
    console.error('Classify document error:', error);
    return { success: false, message: 'Failed to classify document' };
  }
}

export async function convertLeaseToDigital(documentId: string, leaseData: any) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: 'Unable to determine landlord' };
    }

    // Create or find tenant
    let tenant = await prisma.user.findUnique({
      where: { email: leaseData.tenantEmail },
    });

    if (!tenant) {
      tenant = await prisma.user.create({
        data: {
          email: leaseData.tenantEmail,
          name: leaseData.tenantName,
          role: 'tenant',
        },
      });
    }

    // Create lease
    const lease = await prisma.lease.create({
      data: {
        unitId: leaseData.unitId,
        tenantId: tenant.id,
        startDate: new Date(leaseData.startDate),
        endDate: leaseData.endDate ? new Date(leaseData.endDate) : null,
        rentAmount: leaseData.rentAmount,
        billingDayOfMonth: leaseData.billingDayOfMonth || 1,
        status: leaseData.status || 'active',
      },
    });

    // Update document
    await prisma.scannedDocument.update({
      where: { id: documentId },
      data: {
        conversionStatus: 'completed',
        convertedToLeaseId: lease.id,
        convertedToTenantId: tenant.id,
      },
    });

    revalidatePath('/admin/documents');
    revalidatePath('/admin/leases');
    return { success: true, lease, tenant };
  } catch (error) {
    console.error('Convert lease error:', error);
    return { success: false, message: 'Failed to convert lease to digital' };
  }
}

export async function convertReceiptToPayment(documentId: string, receiptData: any) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    // Create rent payment record
    const payment = await prisma.rentPayment.create({
      data: {
        leaseId: receiptData.leaseId,
        tenantId: receiptData.tenantId,
        amount: receiptData.amount,
        dueDate: new Date(receiptData.date),
        paidAt: new Date(receiptData.date),
        status: 'paid',
        paymentMethod: receiptData.paymentMethod || 'cash',
        metadata: {
          source: 'scanned_receipt',
          documentId,
        },
      },
    });

    // Update document
    await prisma.scannedDocument.update({
      where: { id: documentId },
      data: {
        conversionStatus: 'completed',
        convertedToPaymentId: payment.id,
      },
    });

    revalidatePath('/admin/documents');
    revalidatePath('/admin/payments');
    return { success: true, payment };
  } catch (error) {
    console.error('Convert receipt error:', error);
    return { success: false, message: 'Failed to convert receipt to payment' };
  }
}

export async function deleteDocument(documentId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    await prisma.scannedDocument.delete({
      where: { id: documentId },
    });

    revalidatePath('/admin/documents');
    return { success: true };
  } catch (error) {
    console.error('Delete document error:', error);
    return { success: false, message: 'Failed to delete document' };
  }
}

export async function updateDocumentNotes(documentId: string, notes: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const document = await prisma.scannedDocument.update({
      where: { id: documentId },
      data: { notes },
    });

    revalidatePath('/admin/documents');
    return { success: true, document };
  } catch (error) {
    console.error('Update document notes error:', error);
    return { success: false, message: 'Failed to update notes' };
  }
}

// Receipt expense categories live in `@/lib/constants/expense-categories`
// so they can be imported from client components. Server-side callers
// should import from there directly.

interface ReceiptExpenseData {
  propertyId: string;
  amount: number;
  category: string;
  description?: string;
  vendor?: string;
  date: string; // ISO date string
}

export async function createExpenseFromReceipt(
  documentId: string,
  expenseData: ReceiptExpenseData
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: 'Unable to determine landlord' };
    }

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: {
        id: expenseData.propertyId,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!property) {
      return { success: false, message: 'Property not found' };
    }

    // Create the expense record
    const expense = await prisma.expense.create({
      data: {
        landlordId: landlordResult.landlord.id,
        propertyId: expenseData.propertyId,
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description || `Receipt: ${expenseData.vendor || 'Unknown vendor'}`,
        incurredAt: new Date(expenseData.date),
        isRecurring: false,
      },
    });

    // Update the scanned document with property and expense link
    await prisma.scannedDocument.update({
      where: { id: documentId },
      data: {
        propertyId: expenseData.propertyId,
        documentType: 'receipt',
        classificationStatus: 'classified',
        classifiedAt: new Date(),
        conversionStatus: 'completed',
        convertedToExpenseId: expense.id,
        extractedData: {
          amount: expenseData.amount,
          category: expenseData.category,
          vendor: expenseData.vendor,
          date: expenseData.date,
          expenseId: expense.id,
        },
      },
    });

    revalidatePath('/admin/documents');
    revalidatePath('/admin/overview');
    return { success: true, expense };
  } catch (error) {
    console.error('Create expense from receipt error:', error);
    return { success: false, message: 'Failed to create expense from receipt' };
  }
}

export async function uploadReceiptWithProperty(params: {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  propertyId: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: 'Unable to determine landlord' };
    }

    const document = await prisma.scannedDocument.create({
      data: {
        landlordId: landlordResult.landlord.id,
        uploadedBy: session.user.id,
        propertyId: params.propertyId,
        originalFileName: params.fileName,
        fileUrl: params.fileUrl,
        fileType: params.fileType,
        fileSize: params.fileSize,
        documentType: 'receipt',
        classificationStatus: 'pending',
        conversionStatus: 'pending',
      },
    });

    revalidatePath('/admin/documents');
    return { success: true, document };
  } catch (error) {
    console.error('Upload receipt error:', error);
    return { success: false, message: 'Failed to upload receipt' };
  }
}
