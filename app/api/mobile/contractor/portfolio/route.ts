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

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    try {
      const db = prisma as any;
      if (!db.contractorPortfolioProject) return NextResponse.json({ photos: [] });

      const projects = await db.contractorPortfolioProject.findMany({
        where: { contractorId: contractorProfile.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({
        photos: projects.map((p: any) => ({
          id: p.id,
          title: p.title || null,
          description: p.description || null,
          url: p.imageUrl || p.beforeImage || p.coverImage || null,
          thumbnail: p.thumbnail || p.imageUrl || null,
          beforeImage: p.beforeImage || null,
          afterImage: p.afterImage || null,
          createdAt: p.createdAt?.toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({ photos: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/portfolio GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
