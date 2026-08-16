import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'superAdmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const role = searchParams.get('role') || 'all';
  const status = searchParams.get('status') || 'all'; // all, complete, incomplete
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where: any = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (role !== 'all') {
    where.role = role;
  }

  // Status filter: "complete" = onboarded + verified, "incomplete" = hasn't finished setup
  if (status === 'complete') {
    where.onboardingCompleted = true;
    where.emailVerified = { not: null };
  } else if (status === 'incomplete') {
    where.OR = [
      ...(where.OR || []),
      { onboardingCompleted: false },
      { emailVerified: null },
    ];
    // If we already have OR from search, merge them
    if (q) {
      where.AND = [
        { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ]},
        { OR: [
          { onboardingCompleted: false },
          { emailVerified: null },
        ]},
      ];
      delete where.OR;
    }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        onboardingCompleted: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map(u => ({
      ...u,
      isBlocked: u.isBlocked || false,
      onboardingCompleted: u.onboardingCompleted || false,
      emailVerified: !!u.emailVerified,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
