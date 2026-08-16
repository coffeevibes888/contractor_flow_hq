import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const milestoneId = params.id;
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Get the milestone
    const milestone = await prisma.jobMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        escrow: {
          include: {
            contractorJob: {
              include: {
                contractor: {
                  select: { userId: true }
                }
              }
            }
          }
        }
      }
    });

    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Verify contractor owns this job
    if (milestone.escrow.contractorJob.contractor.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if photo upload is required
    if (!milestone.requirePhotos) {
      return NextResponse.json(
        { error: 'Photo upload not required for this milestone' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'milestone-photos',
          resource_type: 'image',
          transformation: [
            { width: 1920, height: 1920, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    // Update milestone with new photo
    const updatedMilestone = await prisma.jobMilestone.update({
      where: { id: milestoneId },
      data: {
        photoUrls: {
          push: uploadResult.secure_url
        },
        photoPublicIds: {
          push: uploadResult.public_id
        },
        photosUploaded: {
          increment: 1
        }
      }
    });

    // Send notification if minimum photos reached
    if (updatedMilestone.photosUploaded >= milestone.minPhotos && milestone.escrow.contractorJob.customerId) {
      try {
        await prisma.notification.create({
          data: {
            userId: milestone.escrow.contractorJob.customerId,
            type: 'milestone_photos_uploaded',
            title: 'Photos Uploaded',
            message: `The contractor has uploaded ${updatedMilestone.photosUploaded} photo(s) for milestone "${milestone.title}".`,
            actionUrl: `/customer/jobs/${milestone.escrow.contractorJobId}/milestones/${milestoneId}`
          }
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      photosUploaded: updatedMilestone.photosUploaded,
      minPhotos: milestone.minPhotos
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
