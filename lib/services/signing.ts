import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { htmlToPdfBuffer } from './pdf';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function generateLeasePdf(leaseHtml: string): Promise<Buffer> {
  return htmlToPdfBuffer(leaseHtml);
}

export async function stampSignatureOnPdf(opts: {
  basePdf: Buffer;
  signerName: string;
  signerEmail: string;
  role: 'tenant' | 'landlord';
  signatureDataUrl: string;
  signedAt: Date;
  audit: Record<string, any>;
  landlordId?: string;
  leaseId?: string;
}) {
  // Validate signature data URL
  if (!opts.signatureDataUrl || !opts.signatureDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Invalid signature format. Expected PNG data URL.');
  }

  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(opts.basePdf);
  } catch (pdfLoadError: any) {
    console.error('Failed to load PDF:', pdfLoadError);
    throw new Error('Failed to load lease document for signing.');
  }

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];

  // Convert data URL to Uint8Array for more reliable embedding
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
  const roleLabel = opts.role === 'tenant' ? 'Tenant' : 'Landlord';

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

  const auditPage = pdfDoc.addPage([width, height]);
  auditPage.drawText('Audit Log', {
    x: 50,
    y: height - 70,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  });
  const auditFont = font;
  const auditText = JSON.stringify(opts.audit, null, 2);
  auditPage.drawText(auditText, {
    x: 50,
    y: height - 100,
    size: 10,
    font: auditFont,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 12,
    maxWidth: width - 100,
  });

  const finalPdf = await pdfDoc.save();
  const hash = crypto.createHash('sha256').update(finalPdf).digest('hex');

  let signedPdfUrl = '';
  let auditLogUrl = '';

  console.log('Signing - Starting Cloudinary upload...');
  console.log('Signing - Final PDF size:', finalPdf.length, 'bytes');
  console.log('Signing - Landlord ID:', opts.landlordId);
  console.log('Signing - Lease ID:', opts.leaseId);

  try {
    const [signedUpload, auditUpload] = await Promise.all([
      uploadToCloudinary(Buffer.from(finalPdf), {
        folder: `signed-leases/${opts.landlordId || 'unknown'}`,
        resource_type: 'raw',
        public_id: `${opts.leaseId || 'lease'}-signed-${Date.now()}`,
        format: 'pdf',
        type: 'upload', // Public access - no authentication required
      }),
      uploadToCloudinary(Buffer.from(JSON.stringify(opts.audit, null, 2)), {
        folder: `signed-leases/${opts.landlordId || 'unknown'}`,
        resource_type: 'raw',
        public_id: `${opts.leaseId || 'lease'}-audit-${Date.now()}`,
        format: 'txt',
        type: 'upload', // Public access
      }),
    ]);
    signedPdfUrl = signedUpload.secure_url;
    auditLogUrl = auditUpload.secure_url;
    console.log('Signing - Cloudinary upload successful');
    console.log('Signing - PDF URL:', signedPdfUrl);
  } catch (uploadError: any) {
    console.error('Cloudinary upload failed:', uploadError);
    console.error('Cloudinary error details:', JSON.stringify(uploadError, null, 2));
    if (uploadError?.http_code === 401) {
      throw new Error('Document storage authentication failed. Please check Cloudinary credentials (CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET).');
    }
    throw new Error(`Failed to upload signed document: ${uploadError?.message || 'Unknown error'}`);
  }

  return {
    signedPdfUrl,
    auditLogUrl,
    documentHash: hash,
  };
}
