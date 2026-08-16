/**
 * GET  /api/contractor/subcontractors/[id]/payments  — list payments to a sub
 * POST /api/contractor/subcontractors/[id]/payments  — record a payment to a sub
 *
 * "Payments" here are money flowing OUT from the GC to the subcontractor.
 * Net 15/30/60/90 terms are tracked via dueDate on each assignment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;

    // Verify sub belongs to this contractor
    const sub = await db.contractorSubcontractor.findFirst({
      where: { id, contractorId: profile.id },
      select: { id: true },
    });
    if (!sub) return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 });

    const payments = await db.contractorSubcontractorPayment.findMany({
      where: { subcontractorId: id, contractorId: profile.id },
      orderBy: { paidAt: 'desc' },
    }).catch(() => []);

    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const ytdTotal = payments
      .filter((p: any) => new Date(p.paidAt) >= yearStart)
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    return NextResponse.json({ payments, ytdTotal });
  } catch (error) {
    console.error('[GET sub payments]', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;

    const sub = await db.contractorSubcontractor.findFirst({
      where: { id, contractorId: profile.id },
      select: { id: true, companyName: true },
    });
    if (!sub) return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 });

    const body = await req.json();
    const { amount, method, assignmentId, referenceNumber, notes, paidAt } = body as {
      amount: number;
      method: string; // check, ach, wire, zelle, cash, wallet
      assignmentId?: string;
      referenceNumber?: string;
      notes?: string;
      paidAt?: string;
    };

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Use ContractorSubcontractorPayment if it exists, otherwise fall back to raw insert
    let payment: any;
    try {
      payment = await db.contractorSubcontractorPayment.create({
        data: {
          contractorId: profile.id,
          subcontractorId: id,
          assignmentId: assignmentId || null,
          amount,
          method,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
      });
    } catch {
      // Model may not exist yet — use raw insert
      const payId = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "ContractorSubcontractorPayment"
          (id, "contractorId", "subcontractorId", "assignmentId", amount, method,
           "referenceNumber", notes, "paidAt", "createdAt", "updatedAt")
        VALUES (
          ${payId}::uuid, ${profile.id}::uuid, ${id}::uuid,
          ${assignmentId ?? null}::uuid, ${amount}, ${method},
          ${referenceNumber ?? null}, ${notes ?? null},
          ${paidAt ? new Date(paidAt) : new Date()},
          NOW(), NOW()
        )
      `;
      payment = { id: payId, amount, method };
    }

    // If linked to an assignment, update its paymentStatus
    if (assignmentId) {
      const assignment = await db.contractorSubcontractorAssignment.findUnique({
        where: { id: assignmentId },
        select: { agreedPrice: true, paidAmount: true },
      });
      if (assignment) {
        const newPaid = Number(assignment.paidAmount ?? 0) + amount;
        const agreed = Number(assignment.agreedPrice);
        await db.contractorSubcontractorAssignment.update({
          where: { id: assignmentId },
          data: {
            paidAmount: newPaid,
            paidDate: newPaid >= agreed ? new Date() : undefined,
            paymentStatus: newPaid >= agreed ? 'paid' : 'invoiced',
          },
        });
      }
    }

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    console.error('[POST sub payment]', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
