import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  extractFromText,
  normalizeCategory,
} from '@/lib/services/receipt-extraction';

/**
 * POST /api/documents/extract-receipt
 *
 * Takes a scanned document ID + a property ID and creates an Expense record
 * for the selected property. Uses (in order of preference):
 *   1. User-supplied overrides (from the review-step form)
 *   2. Already-saved extractedData from the scan-receipt route
 *   3. Fresh extraction from the document's OCR text
 *
 * Body: { documentId, propertyId, overrides?: { amount?, category?, vendor?, description?, date? } }
 */
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json(
        { success: false, message: 'Landlord not found' },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { documentId, propertyId, overrides } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'Document ID required' },
        { status: 400 },
      );
    }
    if (!propertyId) {
      return NextResponse.json(
        { success: false, message: 'Property ID required' },
        { status: 400 },
      );
    }

    // Fetch the scanned document
    const doc = await prisma.scannedDocument.findFirst({
      where: { id: documentId, landlordId: landlord.id },
    });
    if (!doc) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 },
      );
    }

    // Verify property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId: landlord.id },
    });
    if (!property) {
      return NextResponse.json(
        { success: false, message: 'Property not found' },
        { status: 404 },
      );
    }

    // Pull fallbacks from existing extractedData or run a fresh text extraction
    const existingData =
      typeof doc.extractedData === 'object' && doc.extractedData
        ? (doc.extractedData as Record<string, any>)
        : {};
    const fromText = doc.ocrText ? extractFromText(doc.ocrText) : null;

    // Pick first non-empty value: user override → cached extraction → fresh text extraction
    const pick = (
      override: any,
      cached: any,
      fresh: any,
    ): any => {
      if (override !== undefined && override !== null && override !== '') return override;
      if (cached !== undefined && cached !== null && cached !== '') return cached;
      if (fresh !== undefined && fresh !== null && fresh !== '') return fresh;
      return null;
    };

    const ovr = overrides || {};
    const extracted = {
      amount: pick(ovr.amount, existingData.amount, fromText?.amount),
      vendor: pick(ovr.vendor, existingData.vendor, fromText?.vendor),
      date: pick(ovr.date, existingData.date, fromText?.date),
      category: pick(ovr.category, existingData.category, fromText?.category),
      description: pick(ovr.description, existingData.description, null),
    };

    const amount = parseFloat(String(extracted.amount ?? '').replace(/[$,\s]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Could not determine a valid amount. Please enter the receipt total manually.',
          extracted,
        },
        { status: 422 },
      );
    }

    const incurredAt = parseDate(extracted.date) ?? new Date();

    // Build a human-readable description
    const expenseDescription =
      extracted.description ||
      (extracted.vendor
        ? `${extracted.vendor} — scanned from receipt`
        : `Scanned receipt — ${doc.originalFileName}`);

    const canonicalCategory = normalizeCategory(extracted.category);

    // Create the expense — store the receipt URL and full OCR data on the
    // expense itself for the receipt audit trail.
    const expense = await prisma.expense.create({
      data: {
        landlordId: landlord.id,
        propertyId,
        amount,
        category: canonicalCategory,
        description: expenseDescription,
        incurredAt,
        isRecurring: false,
        receiptUrl: doc.fileUrl,
        vendor: extracted.vendor || null,
        receiptOcrData: {
          amount: amount,
          vendor: extracted.vendor,
          date: extracted.date,
          category: canonicalCategory,
          ocrConfidence: doc.ocrConfidence ? Number(doc.ocrConfidence) : null,
          source: existingData.source || 'manual',
          documentId: doc.id,
        } as any,
      },
    });

    // Best-effort GL post for Pro/Enterprise tiers. Idempotent by (expense, expense.id).
    try {
      const { postExpense } = await import('@/lib/accounting');
      await postExpense(
        landlord.id,
        expense.id,
        amount,
        canonicalCategory,
        incurredAt,
        { propertyId: propertyId ?? undefined },
      );
    } catch (glErr) {
      console.error('[accounting] receipt-expense GL post failed', expense.id, glErr);
    }

    // Update the scanned document to link it to the expense
    await prisma.scannedDocument.update({
      where: { id: documentId },
      data: {
        propertyId,
        convertedToExpenseId: expense.id,
        conversionStatus: 'completed',
        classificationStatus: 'classified',
        documentType: 'receipt',
        classifiedAt: new Date(),
        extractedData: {
          ...existingData,
          amount,
          vendor: extracted.vendor,
          date: extracted.date,
          category: canonicalCategory,
          description: expenseDescription,
          expenseId: expense.id,
          autoCreated: true,
        } as any,
      },
    });

    // Refresh the documents page and any pages that show expenses. The
    // property detail page lives at `/admin/products/[id]/details` (not
    // `/admin/properties/...`) — passing a path that doesn't resolve to a
    // real route makes Next throw out of `revalidatePath`, which in turn
    // bubbles up as a 500 to the client and the dialog shows "page can't
    // load".
    revalidatePath('/admin/documents');
    revalidatePath(`/admin/dashboard/properties/${propertyId}/details`);
    revalidatePath('/admin/overview');

    return NextResponse.json({
      success: true,
      expense: {
        id: expense.id,
        amount: Number(expense.amount),
        category: expense.category,
        description: expense.description,
        date: expense.incurredAt.toISOString(),
        propertyId,
        propertyName: property.name,
      },
      extracted: {
        amount,
        vendor: extracted.vendor,
        date: extracted.date,
        category: canonicalCategory,
      },
    });
  } catch (error) {
    console.error('[extract-receipt] Unhandled error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process receipt' },
      { status: 500 },
    );
  }
}

/** Parse YYYY-MM-DD as local time to avoid UTC offset shifting the day. */
function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const iso = String(raw).trim();
  if (!iso) return null;

  const localMatch = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (localMatch) {
    const d = new Date(
      parseInt(localMatch[1]),
      parseInt(localMatch[2]) - 1,
      parseInt(localMatch[3]),
    );
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
