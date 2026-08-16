/**
 * Contractor Contract Signing Service
 * Generates PDFs from HTML, stamps signatures, uploads to Cloudinary.
 * Adapted from lib/services/signing.ts (lease signing).
 */

import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { htmlToPdfBuffer } from './pdf';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function generateContractPdf(contractHtml: string): Promise<Buffer> {
  return htmlToPdfBuffer(contractHtml);
}

export async function stampSignatureOnContractPdf(opts: {
  basePdf: Buffer;
  signerName: string;
  signerEmail: string;
  role: 'customer' | 'contractor';
  signatureDataUrl: string;
  signedAt: Date;
  audit: Record<string, any>;
  contractId?: string;
}) {
  if (!opts.signatureDataUrl || !opts.signatureDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Invalid signature format. Expected PNG data URL.');
  }

  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(opts.basePdf);
  } catch (pdfLoadError: any) {
    console.error('Failed to load PDF:', pdfLoadError);
    throw new Error('Failed to load contract document for signing.');
  }

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];

  let sigPng;
  try {
    const base64Data = opts.signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');
    sigPng = await pdfDoc.embedPng(signatureBuffer);
  } catch (embedError: any) {
    console.error('Failed to embed signature image:', embedError);
    throw new Error('Failed to process signature image. Please try drawing your signature again.');
  }

  const { width, height } = lastPage.getSize();
  const imgWidth = 200;
  const imgHeight = (sigPng.height / sigPng.width) * imgWidth;

  const textY = 120;
  const imgY = 60;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  lastPage.drawText('Signature', {
    x: 50,
    y: textY + 20,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  lastPage.drawImage(sigPng, {
    x: 50,
    y: imgY,
    width: imgWidth,
    height: imgHeight,
  });

  const signedAtStr = opts.signedAt.toISOString();
  const roleLabel = opts.role === 'customer' ? 'Customer' : 'Contractor';

  const textBlock = [
    `${roleLabel} Name: ${opts.signerName}`,
    `Email: ${opts.signerEmail}`,
    `Signed At: ${signedAtStr}`,
  ].join('\n');

  lastPage.drawText(textBlock, {
    x: 270,
    y: imgY + imgHeight - 10,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 14,
  });

  // Add audit log page
  const auditPage = pdfDoc.addPage([width, height]);
  auditPage.drawText('Audit Log', {
    x: 50,
    y: height - 70,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  });
  const auditText = JSON.stringify(opts.audit, null, 2);
  auditPage.drawText(auditText, {
    x: 50,
    y: height - 100,
    size: 10,
    font,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 12,
    maxWidth: width - 100,
  });

  const finalPdf = await pdfDoc.save();
  const hash = crypto.createHash('sha256').update(finalPdf).digest('hex');

  let signedPdfUrl = '';
  let auditLogUrl = '';

  try {
    const [signedUpload, auditUpload] = await Promise.all([
      uploadToCloudinary(Buffer.from(finalPdf), {
        folder: `signed-contracts/${opts.contractId || 'unknown'}`,
        resource_type: 'raw',
        public_id: `${opts.contractId || 'contract'}-signed-${Date.now()}`,
        format: 'pdf',
        type: 'upload',
      }),
      uploadToCloudinary(Buffer.from(JSON.stringify(opts.audit, null, 2)), {
        folder: `signed-contracts/${opts.contractId || 'unknown'}`,
        resource_type: 'raw',
        public_id: `${opts.contractId || 'contract'}-audit-${Date.now()}`,
        format: 'txt',
        type: 'upload',
      }),
    ]);
    signedPdfUrl = signedUpload.secure_url;
    auditLogUrl = auditUpload.secure_url;
  } catch (uploadError: any) {
    console.error('Cloudinary upload failed:', uploadError);
    throw new Error(`Failed to upload signed document: ${uploadError?.message || 'Unknown error'}`);
  }

  return {
    signedPdfUrl,
    auditLogUrl,
    documentHash: hash,
  };
}
