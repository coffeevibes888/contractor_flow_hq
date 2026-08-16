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
    const signatureFile = formData.get('signature') as File;
    const signerRole = formData.get('signerRole') as string;
    const signerName = formData.get('signerName') as string;

    if (!signatureFile) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    if (!signerRole || !['contractor', 'customer'].includes(signerRole)) {
      return NextResponse.json(
        { error: 'Invalid signer role' },
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
                },
                customer: {
                  select: { id: true }
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

    // Verify user is authorized to sign
    const isContractor = milestone.escrow.contractorJob.contractor.userId === session.user.id;
    const isCustomer = milestone.escrow.contractorJob.customerId === session.user.id;

    if (!isContractor && !isCustomer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify role matches user
    if (signerRole === 'contractor' && !isContractor) {
      return NextResponse.json(
        { error: 'You are not the contractor for this job' },
        { status: 403 }
      );
    }

    if (signerRole === 'customer' && !isCustomer) {
      return NextResponse.json(
        { error: 'You are not the customer for this job' },
        { status: 403 }
      );
    }

    // Check if signature is required
    if (!milestone.requireSignature) {
      return NextResponse.json(
        { error: 'Signature not required for this milestone' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await signatureFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'milestone-signatures',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 400, crop: 'limit' },
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

    // Update milestone with signature
    const updateData: any = {};
    
    if (signerRole === 'contractor') {
      updateData.contractorSignature = uploadResult.secure_url;
      updateData.contractorSignedAt = new Date();
      updateData.contractorSignedBy = signerName;
    } else {
      updateData.customerSignature = uploadResult.secure_url;
      updateData.customerSignedAt = new Date();
      updateData.customerSignedBy = signerName;
    }

    const updatedMilestone = await prisma.jobMilestone.update({
      where: { id: milestoneId },
      data: updateData
    });

    // Send notification to the other party
    const notifyUserId = signerRole === 'contractor' 
      ? milestone.escrow.contractorJob.customerId
      : milestone.escrow.contractorJob.contractor.userId;

    if (notifyUserId) {
      try {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: 'milestone_signed',
            title: 'Milestone Signed',
            message: `${signerName} has signed milestone "${milestone.title}".`,
            actionUrl: `/customer/jobs/${milestone.escrow.contractorJobId}/milestones/${milestoneId}`
          }
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      signatureUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      signedAt: updateData.contractorSignedAt || updateData.customerSignedAt,
      signedBy: signerName
    });
  } catch (error) {
    console.error('Error saving signature:', error);
    return NextResponse.json(
      { error: 'Failed to save signature' },
      { status: 500 }
    );
  }
}
