import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/contractor/warranties - List all warranties
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = `
      SELECT w.*, c.name as customerName, j.title as jobTitle, j."jobNumber"
      FROM "ContractorWarranty" w
      LEFT JOIN "ContractorCustomer" c ON w."customerId" = c.id
      LEFT JOIN "ContractorJob" j ON w."jobId" = j.id
      WHERE w."contractorId" = '${contractorProfile.id}'
    `;

    if (status) {
      query += ` AND w.status = '${status}'`;
    }

    query += ` ORDER BY w."endDate" ASC`;

    const warranties = await prisma.$queryRawUnsafe(query);

    return NextResponse.json({ success: true, warranties: warranties || [] });
  } catch (error) {
    console.error('Error fetching warranties:', error);
    return NextResponse.json({ error: 'Failed to fetch warranties' }, { status: 500 });
  }
}

// POST /api/contractor/warranties - Create new warranty
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

    // Generate warranty number
    const year = new Date().getFullYear();
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "ContractorWarranty" 
      WHERE "contractorId" = ${contractorProfile.id} 
      AND EXTRACT(YEAR FROM "createdAt") = ${year}
    `;
    const warrantyNumber = `W-${year}-${String((count as any)[0].count + 1).padStart(4, '0')}`;

    // Calculate end date
    const startDate = new Date(data.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.durationMonths);

    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "ContractorWarranty" (
        id, "contractorId", "warrantyNumber", "warrantyType", status,
        "jobId", "customerId", "invoiceId", title, description, coverage, exclusions,
        "startDate", "endDate", "durationMonths", documents, notes, "internalNotes",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${contractorProfile.id}, ${warrantyNumber}, ${data.warrantyType}, 'active',
        ${data.jobId || null}, ${data.customerId}, ${data.invoiceId || null},
        ${data.title}, ${data.description || null}, ${data.coverage || null}, 
        ${data.exclusions || null}, ${startDate}, ${endDate}, ${data.durationMonths},
        ${data.documents || []}, ${data.notes || null}, ${data.internalNotes || null},
        ${new Date()}, ${new Date()}
      )
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Warranty created',
      id,
      warrantyNumber
    });
  } catch (error) {
    console.error('Error creating warranty:', error);
    return NextResponse.json({ error: 'Failed to create warranty' }, { status: 500 });
  }
}
