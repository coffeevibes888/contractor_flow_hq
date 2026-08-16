import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET - Get contractor's portfolio items
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const items = await prisma.contractorPortfolioItem.findMany({
      where: { contractorId: contractorProfile.id },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new portfolio item
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const dataStr = formData.get('data') as string;
    const data = JSON.parse(dataStr);

    // Upload images to Cloudinary
    const imageUrls: string[] = [];
    let imageIndex = 0;

    while (formData.has(`image${imageIndex}`)) {
      const file = formData.get(`image${imageIndex}`) as File;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: `contractor-portfolio/${contractorProfile.id}`,
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      });

      imageUrls.push(result.secure_url);
      imageIndex++;
    }

    // Create portfolio item
    const portfolioItem = await prisma.contractorPortfolioItem.create({
      data: {
        contractorId: contractorProfile.id,
        title: data.title,
        description: data.description,
        category: data.category,
        images: imageUrls,
        videoUrl: data.videoUrl || null,
        projectDate: data.projectDate ? new Date(data.projectDate) : null,
        location: data.location || null,
        budget: data.budget ? parseFloat(data.budget) : null,
        duration: data.duration ? parseInt(data.duration) : null,
        tags: data.tags || [],
        featured: data.featured || false,
        isPublic: data.isPublic !== false,
      },
    });

    return NextResponse.json({
      portfolioItem,
      message: 'Portfolio item created successfully',
    });
  } catch (error) {
    console.error('Error creating portfolio item:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio item' },
      { status: 500 }
    );
  }
}
