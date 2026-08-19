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

    try {
      const db = prisma as any;
      if (!db.contractorSubcontractor) return NextResponse.json({ subcontractors: [] });

      const where: any = { contractorId: contractorProfile.id };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { businessName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const subs = await db.contractorSubcontractor.findMany({
        where,
        orderBy: { name: 'asc' },
        take: 100,
      });

      return NextResponse.json({
        subcontractors: subs.map((s: any) => ({
          id: s.id,
          name: s.name || s.businessName,
          businessName: s.businessName || null,
          phone: s.phone || null,
          email: s.email || null,
          specialty: s.specialty || null,
          rating: s.rating ? Number(s.rating) : null,
        })),
      });
    } catch {
      return NextResponse.json({ subcontractors: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/subcontractors GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
