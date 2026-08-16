import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
        where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
        return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;
    const propertyId = formData.get('propertyId') as string | null;

    // Support both single file and multiple files
    const filesToProcess = file ? [file] : files;

    if (!filesToProcess || filesToProcess.length === 0) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate propertyId if provided
    if (propertyId) {
        const property = await prisma.property.findFirst({
            where: { id: propertyId, landlordId: landlord.id },
        });
        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }
    }

    const uploadedFiles = [];

    for (const f of filesToProcess) {
        const buffer = Buffer.from(await f.arrayBuffer());
        const result = await uploadToCloudinary(buffer, {
            folder: 'documents',
        });

        const newFile = await prisma.scannedDocument.create({
            data: {
                originalFileName: f.name,
                fileUrl: result.secure_url,
                fileType: f.type.split('/')[1] || f.type,
                fileSize: f.size,
                landlordId: landlord.id,
                uploadedBy: session.user.id,
                propertyId: propertyId || null,
                documentType: category || null,
                classificationStatus: category ? 'classified' : 'pending',
            },
        });

        uploadedFiles.push(newFile);
    }

    return NextResponse.json({ documents: uploadedFiles });
}

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
        where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
        return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const documents = await prisma.scannedDocument.findMany({
        where: { landlordId: landlord.id },
        orderBy: { createdAt: 'desc' },
        include: {
            property: {
                select: { id: true, name: true },
            },
        },
    });

    return NextResponse.json({ documents });
}
