import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

type Params = { params: { id: string } };

// GET - List photos for a job
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const db = prisma as any;
    const photos = await db.contractorJobPhoto.findMany({
      where: {
        jobId: params.id,
        contractorId: contractorAuth.contractorId,
      },
      orderBy: { takenAt: 'desc' },
    });

    // Group by category
    const grouped = {
      before: photos.filter((p: any) => p.category === 'before'),
      during: photos.filter((p: any) => p.category === 'during'),
      after: photos.filter((p: any) => p.category === 'after'),
      issue: photos.filter((p: any) => p.category === 'issue'),
      inspection: photos.filter((p: any) => p.category === 'inspection'),
      general: photos.filter((p: any) => p.category === 'general'),
    };

    return NextResponse.json({ photos, grouped });
  } catch (error) {
    console.error('GET /api/contractor/jobs/[id]/photos', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

// POST - Add photos to a job
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const db = prisma as any;

    // Verify job belongs to contractor
    const job = await db.contractorJob.findFirst({
      where: {
        id: params.id,
        contractorId: contractorAuth.contractorId,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await req.json();
    const { files, category, caption, milestoneId, visibleToCustomer } = body as {
      files: { url: string; thumbnail?: string }[];
      category: string;
      caption?: string;
      milestoneId?: string;
      visibleToCustomer?: boolean;
    };

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    const validCategories = ['before', 'during', 'after', 'issue', 'completion', 'inspection', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Create photo records
    const photos = await Promise.all(
      files.map((file) =>
        db.contractorJobPhoto.create({
          data: {
            contractorId: contractorAuth.contractorId,
            jobId: params.id,
            url: file.url,
            thumbnail: file.thumbnail || null,
            caption: caption || null,
            category,
            milestoneId: milestoneId || null,
            visibleToCustomer: visibleToCustomer !== false,
            takenBy: contractorAuth.employeeId || null,
          },
        })
      )
    );

    // Also update the job's photo arrays for backward compatibility
    const photoUrls = files.map((f) => f.url);
    if (category === 'before') {
      await db.contractorJob.update({
        where: { id: params.id },
        data: { beforePhotos: { push: photoUrls } },
      });
    } else if (category === 'after') {
      await db.contractorJob.update({
        where: { id: params.id },
        data: { afterPhotos: { push: photoUrls } },
      });
    } else {
      await db.contractorJob.update({
        where: { id: params.id },
        data: { photos: { push: photoUrls } },
      });
    }

    return NextResponse.json({ success: true, photos, count: photos.length });
  } catch (error) {
    console.error('POST /api/contractor/jobs/[id]/photos', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  }
}
