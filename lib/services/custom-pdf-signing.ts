import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import { uploadToCloudinary } from '@/lib/cloudinary';

export interface SignatureFieldPosition {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'name' | 'text';
  role: 'tenant' | 'landlord';
  page: number;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage
  height: number; // percentage
  required: boolean;
}

export interface SigningData {
  signerName: string;
  signerEmail: string;
  signatureDataUrl: string;
  initialsDataUrl?: string;
  signedAt: Date;
}

/**
 * Fetch a PDF from URL and return as buffer
 */
export async function fetchPdfBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Apply signatures and other fields to a PDF document
 */
export async function applySignaturesToPdf(opts: {
  pdfBuffer: Buffer;
  fields: SignatureFieldPosition[];
  signingData: SigningData;
  role: 'tenant' | 'landlord';
  audit: Record<string, any>;
  landlordId?: string;
  leaseId?: string;
}): Promise<{
  signedPdfUrl: string;
  auditLogUrl: string;
  documentHash: string;
}> {
  const { pdfBuffer, fields, signingData, role, audit, landlordId, leaseId } = opts;

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Filter fields for this role
  const roleFields = fields.filter(f => f.role === role);

  // Embed signature image
  let signatureImage;
  if (signingData.signatureDataUrl) {
    const base64Data = signingData.signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');
    signatureImage = await pdfDoc.embedPng(signatureBuffer);
  }

  // Embed initials image if provided
  let initialsImage;
  if (signingData.initialsDataUrl) {
    const base64Data = signingData.initialsDataUrl.replace(/^data:image\/png;base64,/, '');
    const initialsBuffer = Buffer.from(base64Data, 'base64');
    initialsImage = await pdfDoc.embedPng(initialsBuffer);
  }

  // Apply each field
  for (const field of roleFields) {
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Convert percentage positions to actual coordinates
    // Note: PDF coordinates start from bottom-left, but our fields are from top-left
    const x = (field.x / 100) * pageWidth;
    const y = pageHeight - ((field.y / 100) * pageHeight) - ((field.height / 100) * pageHeight);
    const fieldWidth = (field.width / 100) * pageWidth;
    const fieldHeight = (field.height / 100) * pageHeight;

    switch (field.type) {
      case 'signature':
        if (signatureImage) {
          // Scale signature to fit field while maintaining aspect ratio
          const sigAspect = signatureImage.width / signatureImage.height;
          let drawWidth = fieldWidth;
          let drawHeight = fieldWidth / sigAspect;
          if (drawHeight > fieldHeight) {
            drawHeight = fieldHeight;
            drawWidth = fieldHeight * sigAspect;
          }
          page.drawImage(signatureImage, {
            x,
            y: y + (fieldHeight - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
          });
        }
        break;

      case 'initial':
        if (initialsImage) {
          const initAspect = initialsImage.width / initialsImage.height;
          let drawWidth = fieldWidth;
          let drawHeight = fieldWidth / initAspect;
          if (drawHeight > fieldHeight) {
            drawHeight = fieldHeight;
            drawWidth = fieldHeight * initAspect;
          }
          page.drawImage(initialsImage, {
            x,
            y: y + (fieldHeight - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
          });
        } else if (signatureImage) {
          // Use signature as initials if no separate initials provided
          const initAspect = signatureImage.width / signatureImage.height;
          let drawWidth = fieldWidth * 0.8;
          let drawHeight = drawWidth / initAspect;
          if (drawHeight > fieldHeight * 0.8) {
            drawHeight = fieldHeight * 0.8;
            drawWidth = drawHeight * initAspect;
          }
          page.drawImage(signatureImage, {
            x: x + (fieldWidth - drawWidth) / 2,
            y: y + (fieldHeight - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
          });
        }
        break;

      case 'date':
        const dateStr = signingData.signedAt.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        page.drawText(dateStr, {
          x: x + 2,
          y: y + fieldHeight / 3,
          size: Math.min(12, fieldHeight * 0.6),
          font,
          color: rgb(0, 0, 0),
        });
        break;

      case 'name':
        page.drawText(signingData.signerName, {
          x: x + 2,
          y: y + fieldHeight / 3,
          size: Math.min(12, fieldHeight * 0.6),
          font,
          color: rgb(0, 0, 0),
        });
        break;

      case 'text':
        // Text fields would need additional input - skip for now
        break;
    }
  }

  // Add audit page
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();
  const auditPage = pdfDoc.addPage([width, height]);

  auditPage.drawText('Electronic Signature Audit Log', {
    x: 50,
    y: height - 70,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  });

  const auditText = [
    `Signer: ${signingData.signerName}`,
    `Email: ${signingData.signerEmail}`,
    `Role: ${role}`,
    `Signed At: ${signingData.signedAt.toISOString()}`,
    `IP Address: ${audit.ip || 'Unknown'}`,
    `User Agent: ${audit.userAgent || 'Unknown'}`,
    '',
    'This document was electronically signed using Property Flow HQ.',
    'The signer agreed that their electronic signature is legally binding.',
  ].join('\n');

  auditPage.drawText(auditText, {
    x: 50,
    y: height - 120,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 16,
    maxWidth: width - 100,
  });

  // Save the PDF
  const finalPdf = await pdfDoc.save();
  const hash = crypto.createHash('sha256').update(finalPdf).digest('hex');

  // Upload to Cloudinary
  let signedPdfUrl = '';
  let auditLogUrl = '';

  try {
    const [signedUpload, auditUpload] = await Promise.all([
      uploadToCloudinary(Buffer.from(finalPdf), {
        folder: `signed-leases/${landlordId || 'unknown'}`,
        resource_type: 'raw',
        public_id: `${leaseId || 'lease'}-signed-${Date.now()}`,
        format: 'pdf',
        type: 'upload', // Public access - no authentication required
      }),
      uploadToCloudinary(Buffer.from(JSON.stringify(audit, null, 2)), {
        folder: `signed-leases/${landlordId || 'unknown'}`,
        resource_type: 'raw',
        public_id: `${leaseId || 'lease'}-audit-${Date.now()}`,
        format: 'txt',
        type: 'upload', // Public access
      }),
    ]);
    signedPdfUrl = signedUpload.secure_url;
    auditLogUrl = auditUpload.secure_url;
  } catch (uploadError: any) {
    console.error('Cloudinary upload failed:', uploadError);
    if (uploadError?.http_code === 401) {
      throw new Error('Document storage authentication failed.');
    }
    throw new Error(`Failed to upload signed document: ${uploadError?.message || 'Unknown error'}`);
  }

  return {
    signedPdfUrl,
    auditLogUrl,
    documentHash: hash,
  };
}
