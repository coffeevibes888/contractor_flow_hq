import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get the landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord account not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;
    const isTemplate = formData.get('isTemplate') === 'true';

    if (!file || !name || !type) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Invalid file type. Only PDF and Word documents are allowed.' }, { status: 400 });
    }

    // Get file extension
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let fileUrl: string;
    try {
      const result = await uploadToCloudinary(buffer, {
        folder: `legal-documents/${landlord.id}`,
        resource_type: 'raw',
        public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
      });
      fileUrl = result.secure_url;
    } catch (uploadError) {
      console.error('Cloudinary upload failed:', uploadError);
      return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
    }

    // Create document record
    const document = await prisma.legalDocument.create({
      data: {
        landlordId: landlord.id,
        name,
        type,
        category: 'custom',
        fileUrl,
        fileType: fileExtension,
        fileSize: file.size,
        isTemplate,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('Failed to upload legal document:', error);
    return NextResponse.json({ message: 'Failed to upload document' }, { status: 500 });
  }
}
