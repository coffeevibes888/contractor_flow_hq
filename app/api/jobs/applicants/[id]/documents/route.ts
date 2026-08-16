import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';

const VALID_TYPES = ['id', 'resume', 'certification', 'other'];
const VALID_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

// POST /api/jobs/applicants/[id]/documents
// Uploads a document (resume, ID, cert) for a job application.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applicant = await prisma.jobApplicant.findUnique({ where: { id } });
    if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (applicant.userId && applicant.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const docType = (formData.get('docType') as string) || 'other';

    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 });
    if (!VALID_TYPES.includes(docType)) {
      return NextResponse.json({ success: false, error: 'Invalid docType' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 });
    }
    if (!VALID_MIME.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Use image or PDF.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isImage = file.type.startsWith('image/');
    const result = await uploadToCloudinary(buffer, {
      folder: `job-applications/${id}`,
      resource_type: isImage ? 'image' : 'raw',
    });

    const doc = {
      id: crypto.randomUUID(),
      type: docType,
      url: result.secure_url,
      publicId: result.public_id,
      name: file.name,
      mime: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    const existing = (applicant.documents as any[] | null) || [];
    await prisma.jobApplicant.update({
      where: { id },
      data: { documents: [...existing, doc] as any },
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (err) {
    console.error('Doc upload failed', err);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
