import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

// GET — list all documents for contractor
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const db = prisma as any;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const isTemplate = searchParams.get('isTemplate');

    const where: any = { contractorId: contractorAuth.contractorId };
    if (category) where.category = category;
    if (isTemplate !== null) where.isTemplate = isTemplate === 'true';

    const documents = await db.contractorDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('GET /api/contractor/documents', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST — upload a document
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string;
    const category = formData.get('category') as string || 'other';
    const description = formData.get('description') as string;
    const isTemplate = formData.get('isTemplate') === 'true';
    const jobId = formData.get('jobId') as string;
    const amount = formData.get('amount') as string;
    const vendor = formData.get('vendor') as string;
    const expenseDate = formData.get('expenseDate') as string;
    const expenseCategory = formData.get('expenseCategory') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let fileUrl: string;
    try {
      const result = await uploadToCloudinary(buffer, {
        folder: `contractor-documents/${contractorAuth.contractorId}`,
        resource_type: 'raw',
        public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
      });
      fileUrl = result.secure_url;
    } catch (uploadError) {
      console.error('Cloudinary upload failed:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const db = prisma as any;
    const document = await db.contractorDocument.create({
      data: {
        contractorId: contractorAuth.contractorId,
        jobId: jobId || null,
        name: name || fileName.replace(/\.[^/.]+$/, ''),
        fileName,
        fileUrl,
        fileType: file.type || fileExtension,
        fileSize: file.size,
        category,
        description: description || null,
        isTemplate,
        amount: amount ? parseFloat(amount) : null,
        vendor: vendor || null,
        expenseDate: expenseDate ? new Date(expenseDate) : null,
        expenseCategory: expenseCategory || null,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contractor/documents', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
