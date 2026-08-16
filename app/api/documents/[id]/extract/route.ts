import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * GET /api/documents/[id]/extract
 * 
 * Preview extracted receipt data from a scanned document's OCR text
 * without creating an expense. Used to pre-fill the expense form.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const doc = await prisma.scannedDocument.findFirst({
      where: { id, landlordId: landlord.id },
    });
    if (!doc) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
    }

    const existingData = (doc.extractedData as any) || {};
    const ocrText = doc.ocrText || '';

    // If we already have extracted data, return it
    if (existingData.amount && existingData.category) {
      return NextResponse.json({
        success: true,
        extracted: existingData,
        hasOcr: !!doc.ocrText,
        alreadyConverted: !!doc.convertedToExpenseId,
      });
    }

    // Otherwise extract from OCR text
    const extracted = {
      amount: extractAmount(ocrText),
      vendor: extractVendor(ocrText),
      date: extractDate(ocrText) || new Date().toISOString().split('T')[0],
      category: detectCategory(ocrText),
    };

    return NextResponse.json({
      success: true,
      extracted,
      hasOcr: !!doc.ocrText,
      alreadyConverted: !!doc.convertedToExpenseId,
    });
  } catch (error) {
    console.error('Extract preview error:', error);
    return NextResponse.json({ success: false, message: 'Failed to extract data' }, { status: 500 });
  }
}

// Same extraction helpers as the main route
function extractAmount(text: string): string | null {
  const totalPatterns = [
    /(?:total|amount\s*due|grand\s*total|balance\s*due|amount|subtotal)[:\s]*\$?\s*(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)/i,
  ];
  for (const p of totalPatterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].replace(/,/g, '');
  }
  const allAmounts = text.match(/\$\s*(\d{1,3}(?:,?\d{3})*\.\d{2})/g);
  if (allAmounts && allAmounts.length > 0) {
    const nums = allAmounts.map(a => parseFloat(a.replace(/[$,\s]/g, ''))).filter(a => !isNaN(a));
    if (nums.length > 0) return Math.max(...nums).toFixed(2);
  }
  return null;
}

function extractVendor(text: string): string | null {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 60);
  for (const line of lines.slice(0, 5)) {
    if (!/^\d/.test(line) && !/^\$/.test(line) && !/^(total|subtotal|tax|date|receipt)/i.test(line)) {
      return line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim().slice(0, 50);
    }
  }
  return null;
}

function extractDate(text: string): string | null {
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{1,2}-\d{1,2}-\d{4})/,
    /(\d{4}-\d{1,2}-\d{1,2})/,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  return null;
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  const categoryKeywords: Record<string, string[]> = {
    maintenance: ['home depot', 'lowes', 'hardware', 'plumbing', 'electrical', 'repair', 'tool', 'paint'],
    owner_paid_utilities: ['electric', 'utility', 'water', 'gas', 'sewer', 'trash', 'power', 'energy'],
    one_time_repairs: ['hvac', 'furnace', 'air condition', 'roof', 'appliance', 'washer', 'dryer'],
    recurring_expenses: ['insurance', 'hoa', 'lawn', 'landscap', 'pest control', 'cleaning'],
  };
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'other';
}
