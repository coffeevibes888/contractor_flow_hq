/**
 * Documents — list + upload metadata for the mobile Documents page.
 *
 * GET  /api/mobile/pm/documents?category=&relatedToType=&relatedToId=
 *      List documents owned by the calling landlord. Filterable.
 *
 * POST /api/mobile/pm/documents
 *      Body: { name, category, fileUrl, mimeType, sizeBytes,
 *              relatedToType?, relatedToId?, notes? }
 *      Creates a Document record. The actual file upload happens via the
 *      existing /api/mobile/upload endpoint — the URL is what we persist here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

const ALLOWED_CATEGORIES = ['lease', 'insurance', 'inspection', 'receipt', 'tax', 'misc'];
const ALLOWED_RELATIONS = ['property', 'unit', 'lease', 'tenant', 'expense', 'maintenance'];

async function landlordFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  return prisma.landlord.findFirst({
    where: { ownerUserId: payload.userId },
    select: { id: true },
  }).then((l) => (l ? { ...l, payload } : null));
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? undefined;
    const relatedToType = searchParams.get('relatedToType') ?? undefined;
    const relatedToId = searchParams.get('relatedToId') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

    const where: any = { landlordId: ctx.id };
    if (category) where.category = category;
    if (relatedToType) where.relatedToType = relatedToType;
    if (relatedToId) where.relatedToId = relatedToId;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        category: true,
        fileUrl: true,
        mimeType: true,
        sizeBytes: true,
        relatedToType: true,
        relatedToId: true,
        notes: true,
        createdAt: true,
      },
    });

    // Counts per category for the UI tab strip
    const countsByCategory = await prisma.document.groupBy({
      by: ['category'],
      where: { landlordId: ctx.id },
      _count: true,
    });

    return NextResponse.json({
      documents,
      counts: Object.fromEntries(countsByCategory.map((c) => [c.category, c._count])),
    });
  } catch (e) {
    console.error('list documents', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, category, fileUrl, mimeType, sizeBytes, relatedToType, relatedToId, notes } = body;

    if (!name || typeof name !== 'string' || name.length < 1) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `category must be one of ${ALLOWED_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 });
    }
    if (relatedToType && !ALLOWED_RELATIONS.includes(relatedToType)) {
      return NextResponse.json({ error: `relatedToType must be one of ${ALLOWED_RELATIONS.join(', ')}` }, { status: 400 });
    }

    const doc = await prisma.document.create({
      data: {
        landlordId: ctx.id,
        name,
        category,
        fileUrl,
        mimeType: mimeType ?? null,
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
        relatedToType: relatedToType ?? null,
        relatedToId: relatedToId ?? null,
        notes: notes ?? null,
        uploadedById: ctx.payload.userId,
      },
    });

    return NextResponse.json({ document: doc });
  } catch (e) {
    console.error('create document', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
