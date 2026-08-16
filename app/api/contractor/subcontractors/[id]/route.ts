import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/contractor/subcontractors/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;

    const subcontractor = await db.contractorSubcontractor.findFirst({
      where: { id, contractorId: contractorProfile.id },
    });

    if (!subcontractor) return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 });

    // Assignments with job details
    const assignments = await db.contractorSubcontractorAssignment.findMany({
      where: { subcontractorId: id },
      include: {
        job: {
          select: {
            id: true, title: true, jobNumber: true, status: true,
            address: true, city: true, state: true,
            estimatedStartDate: true, estimatedEndDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Payments made to this sub
    const payments = await db.contractorSubcontractorPayment.findMany({
      where: { subcontractorId: id, contractorId: contractorProfile.id },
      orderBy: { paidAt: 'desc' },
    }).catch(() => []);

    // YTD payment total (for 1099 tracking)
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const ytdTotal = payments
      .filter((p: any) => new Date(p.paidAt) >= yearStart)
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    return NextResponse.json({
      success: true,
      subcontractor,
      assignments,
      payments,
      ytdTotal,
    });
  } catch (error) {
    console.error('[GET subcontractor]', error);
    return NextResponse.json({ error: 'Failed to fetch subcontractor' }, { status: 500 });
  }
}

// PUT /api/contractor/subcontractors/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;
    const data = await req.json();

    const updated = await db.contractorSubcontractor.update({
      where: { id, contractorId: contractorProfile.id },
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone || null,
        licenseNumber: data.licenseNumber || null,
        licenseState: data.licenseState || null,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
        taxId: data.taxId || null,
        specialties: data.specialties || [],
        status: data.status || 'active',
        paymentTerms: data.paymentTerms || 'net_30',
        preferredPayment: data.preferredPayment || 'check',
        bankAccountName: data.bankAccountName || null,
        bankName: data.bankName || null,
        notes: data.notes || null,
        rating: data.rating ? Number(data.rating) : null,
      },
    });

    return NextResponse.json({ success: true, subcontractor: updated });
  } catch (error) {
    console.error('[PUT subcontractor]', error);
    return NextResponse.json({ error: 'Failed to update subcontractor' }, { status: 500 });
  }
}

// DELETE /api/contractor/subcontractors/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;
    await db.contractorSubcontractor.delete({
      where: { id, contractorId: contractorProfile.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE subcontractor]', error);
    return NextResponse.json({ error: 'Failed to delete subcontractor' }, { status: 500 });
  }
}
