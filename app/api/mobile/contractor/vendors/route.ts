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
      if (!db.contractorVendor) return NextResponse.json({ vendors: [] });

      const where: any = { contractorId: contractorProfile.id };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const vendors = await db.contractorVendor.findMany({
        where,
        orderBy: { name: 'asc' },
        take: 100,
      });

      return NextResponse.json({
        vendors: vendors.map((v: any) => ({
          id: v.id,
          name: v.name || v.companyName,
          companyName: v.companyName || null,
          phone: v.phone || null,
          email: v.email || null,
          category: v.category || null,
          city: v.city || null,
          state: v.state || null,
        })),
      });
    } catch {
      return NextResponse.json({ vendors: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/vendors GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
