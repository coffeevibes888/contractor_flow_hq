/**
 * POST /api/documents/scan-receipt
 *
 * NOTE — DISABLED.
 * The OCR-driven receipt scanner was retired in favor of a simpler
 * manual-entry flow (see ReceiptUploadDialog). This route now no-ops so
 * any stale clients still hitting it get a clean 200 instead of an error
 * page, and no OCR work happens server-side.
 *
 * The original implementation (Tesseract → OpenAI Vision pipeline that
 * called `extractReceipt` and persisted structured fields) is preserved
 * below in a commented-out block so it can be re-enabled later without
 * recovering it from git history. To re-enable: delete the no-op return,
 * uncomment the full handler body, and put back the imports at the top.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  // Always succeed — no extraction is performed. The expense flow now
  // collects amount / vendor / category / date directly from the user.
  return NextResponse.json({
    success: true,
    disabled: true,
    extracted: { amount: null, vendor: null, date: null, category: 'other' },
    ocrText: '',
    source: 'manual',
    warning: 'OCR is disabled — please enter receipt details manually.',
  });
}

/*
// ─── ARCHIVED OCR HANDLER ─────────────────────────────────────────────────
// Uncomment + add the imports back to re-enable automated receipt OCR.
//
// import { auth } from '@/auth';
// import { prisma } from '@/db/prisma';
// import { extractReceipt } from '@/lib/services/receipt-extraction';
// export const maxDuration = 60;
//
// export async function POST(req: NextRequest) {
//   try {
//     const session = await auth();
//     if (!session?.user?.id) {
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
//     }
//
//     const landlord = await prisma.landlord.findFirst({
//       where: { ownerUserId: session.user.id },
//     });
//     if (!landlord) {
//       return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
//     }
//
//     let body: any;
//     try { body = await req.json(); } catch { body = {}; }
//     const { documentId } = body;
//
//     if (!documentId) {
//       return NextResponse.json({ success: false, message: 'documentId required' }, { status: 400 });
//     }
//
//     const doc = await prisma.scannedDocument.findFirst({
//       where: { id: documentId, landlordId: landlord.id },
//     });
//     if (!doc) {
//       return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
//     }
//
//     const cached = (doc.extractedData as any) || null;
//     if (cached && typeof cached === 'object' && (cached.amount || cached.vendor) && cached.scannedAt) {
//       return NextResponse.json({
//         success: true,
//         cached: true,
//         extracted: {
//           amount: cached.amount ?? null,
//           vendor: cached.vendor ?? null,
//           date: cached.date ?? null,
//           category: cached.category ?? 'other',
//         },
//         ocrText: doc.ocrText || '',
//         source: cached.source || 'cached',
//       });
//     }
//
//     let extracted;
//     try {
//       extracted = await extractReceipt(doc.fileUrl, doc.fileType);
//     } catch (err) {
//       console.error('[scan-receipt] extractReceipt threw:', err);
//       extracted = {
//         amount: null, vendor: null, date: null, category: 'other',
//         ocrText: '', confidence: 0, source: 'none' as const,
//         warning: 'Extraction service unavailable',
//       };
//     }
//
//     try {
//       await prisma.scannedDocument.update({
//         where: { id: documentId },
//         data: {
//           documentType: 'receipt',
//           classificationStatus: 'classified',
//           classifiedAt: new Date(),
//           ocrText: extracted.ocrText || doc.ocrText || '',
//           ocrConfidence: extracted.confidence ?? 0,
//           ocrProcessedAt: new Date(),
//           extractedData: {
//             ...(typeof doc.extractedData === 'object' && doc.extractedData ? doc.extractedData : {}),
//             amount: extracted.amount,
//             vendor: extracted.vendor,
//             date: extracted.date,
//             category: extracted.category,
//             source: extracted.source,
//             scannedAt: new Date().toISOString(),
//           },
//         },
//       });
//     } catch (dbErr) {
//       console.error('[scan-receipt] DB persist failed:', dbErr);
//     }
//
//     return NextResponse.json({
//       success: true,
//       extracted: {
//         amount: extracted.amount,
//         vendor: extracted.vendor,
//         date: extracted.date,
//         category: extracted.category,
//       },
//       ocrText: extracted.ocrText,
//       confidence: extracted.confidence,
//       source: extracted.source,
//       warning: extracted.warning,
//     });
//   } catch (error) {
//     console.error('[scan-receipt] Unhandled error:', error);
//     return NextResponse.json({
//       success: false,
//       message: 'OCR scan failed — please enter details manually',
//       extracted: { amount: null, vendor: null, date: null, category: 'other' },
//       ocrText: '',
//       source: 'none',
//     });
//   }
// }
*/
