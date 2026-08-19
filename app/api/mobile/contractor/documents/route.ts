import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Try to fetch from ContractorDocument model if it exists, otherwise return empty
    try {
      const db = prisma as any;
      if (!db.contractorDocument) return NextResponse.json({ documents: [] });

      const where: any = { contractorId: contractorProfile.id };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { filename: { contains: search, mode: 'insensitive' } },
        ];
      }

      const documents = await db.contractorDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({
        documents: documents.map((d: any) => ({
          id: d.id,
          name: d.name || d.filename,
          filename: d.filename,
          type: d.mimeType || d.type || 'application/octet-stream',
          size: d.size || 0,
          url: d.url,
          createdAt: d.createdAt?.toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({ documents: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/documents GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
