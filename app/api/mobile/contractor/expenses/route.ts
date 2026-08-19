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
      if (!db.contractorExpense) return NextResponse.json({ expenses: [] });

      const expenses = await db.contractorExpense.findMany({
        where: { contractorId: contractorProfile.id },
        orderBy: { date: 'desc' },
        take: 100,
        include: { job: { select: { title: true } } },
      });

      return NextResponse.json({
        expenses: expenses.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          category: e.category || 'Other',
          date: e.date?.toISOString() || e.createdAt?.toISOString(),
          jobTitle: e.job?.title || null,
          receiptUrl: e.receiptUrl || null,
          createdAt: e.createdAt?.toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({ expenses: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/expenses GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { description, amount, category, date, jobId, receiptUrl } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 });
    }

    try {
      const db = prisma as any;
      if (!db.contractorExpense) {
        return NextResponse.json({ error: 'Expenses feature not available' }, { status: 501 });
      }

      const expense = await db.contractorExpense.create({
        data: {
          contractorId: contractorProfile.id,
          description,
          amount,
          category: category || 'Other',
          date: date ? new Date(date) : new Date(),
          jobId: jobId || null,
          receiptUrl: receiptUrl || null,
        },
      });

      return NextResponse.json({ success: true, id: expense.id });
    } catch {
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
  } catch (error) {
    console.error('[mobile/contractor/expenses POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
