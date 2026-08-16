import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/contractor/subcontractors - List all subcontractors
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const subcontractors = await prisma.$queryRaw`
      SELECT * FROM "ContractorSubcontractor"
      WHERE "contractorId" = ${contractorProfile.id}
      ORDER BY "companyName" ASC
    `;

    return NextResponse.json({ success: true, subcontractors });
  } catch (error) {
    console.error('Error fetching subcontractors:', error);
    return NextResponse.json({ error: 'Failed to fetch subcontractors' }, { status: 500 });
  }
}

// POST /api/contractor/subcontractors - Create new subcontractor
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const data = await req.json();

    // Generate unique ID and subcontractor number
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const subNumber = `SUB-${new Date().getFullYear()}-${String(timestamp).slice(-4)}`;

    await prisma.$executeRaw`
      INSERT INTO "ContractorSubcontractor" (
        id, "contractorId", "companyName", "contactName", email, phone,
        "licenseNumber", "licenseState", "insuranceExpiry", "taxId",
        specialties, rating, status, "paymentTerms", "preferredPayment",
        notes, "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${contractorProfile.id}, ${data.companyName}, ${data.contactName}, 
        ${data.email}, ${data.phone || null}, ${data.licenseNumber || null}, 
        ${data.licenseState || null}, ${data.insuranceExpiry ? new Date(data.insuranceExpiry) : null}, 
        ${data.taxId || null}, ${data.specialties || []}, ${data.rating || null}, 
        ${data.status || 'active'}, ${data.paymentTerms || 'net_30'}, 
        ${data.preferredPayment || 'check'}, ${data.notes || null},
        ${new Date()}, ${new Date()}
      )
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Subcontractor created successfully',
      id 
    });
  } catch (error) {
    console.error('Error creating subcontractor:', error);
    return NextResponse.json({ error: 'Failed to create subcontractor' }, { status: 500 });
  }
}
