/**
 * Legal documents — list + create from the mobile app.
 *
 *   GET  /api/mobile/pm/legal-documents
 *        Returns this PM's lease templates + signed legal documents.
 *        Mirrors the website's /api/legal-documents endpoint (which is
 *        session-auth only) but accepts mobile-token auth instead.
 *
 *   POST /api/mobile/pm/legal-documents
 *        Body: { name, type, fileUrl, fileType?, fileSize?, isTemplate?, description? }
 *        Creates a LegalDocument record. The actual file upload happens via
 *        /api/mobile/upload (PDF/DOCX support is enabled there).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

const ALLOWED_TYPES = [
  'lease',
  'addendum',
  'eviction',
  'disclosure',
  'notice',
  'move_in',
  'move_out',
  'other',
];

async function landlordFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: payload.userId },
    select: { id: true },
  });
  if (!landlord) return null;
  return { ...landlord, payload };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const documents = await prisma.legalDocument.findMany({
      where: { landlordId: ctx.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        state: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        pageCount: true,
        isTemplate: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        // Properties this is set as the default lease for.
        propertyDefaults: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ documents });
  } catch (e) {
    console.error('mobile legal-documents list', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

interface PostBody {
  name?: string;
  type?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  isTemplate?: boolean;
  description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as PostBody;

    if (!body.name || !body.type || !body.fileUrl) {
      return NextResponse.json(
        { error: 'name, type, and fileUrl are required' },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `type must be one of ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const doc = await prisma.legalDocument.create({
      data: {
        landlordId: ctx.id,
        name: body.name,
        type: body.type,
        category: 'custom',
        fileUrl: body.fileUrl,
        fileType: body.fileType ?? null,
        fileSize: typeof body.fileSize === 'number' ? body.fileSize : null,
        isTemplate: body.isTemplate ?? true,
        description: body.description ?? null,
      },
    });

    return NextResponse.json({ document: doc });
  } catch (e) {
    console.error('mobile legal-documents create', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
