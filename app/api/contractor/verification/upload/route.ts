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
    const file = formData.get('file') as File | null;
    const verificationType = formData.get('verificationType') as string;
    const dataStr = formData.get('data') as string;
    const data = JSON.parse(dataStr || '{}');

    // Get or create verification record
    let verification = await prisma.contractorVerification.findUnique({
      where: { contractorId: contractorProfile.id },
    });

    if (!verification) {
      verification = await prisma.contractorVerification.create({
        data: {
          contractorId: contractorProfile.id,
        },
      });
    }

    let documentUrl: string | undefined;

    // Upload file if provided
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: `contractor-verification/${contractorProfile.id}/${verificationType}`,
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      });

      documentUrl = result.secure_url;

      // Store document record
      await prisma.contractorVerificationDocument.create({
        data: {
          contractorId: contractorProfile.id,
          documentType: verificationType,
          documentName: file.name,
          documentUrl: result.secure_url,
          fileSize: file.size,
          mimeType: file.type,
          status: 'pending',
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
      });
    }

    // Update verification record based on type
    const updateData: any = {};

    switch (verificationType) {
      case 'identity':
        updateData.identityStatus = 'pending';
        updateData.identityDocumentUrl = documentUrl;
        break;

      case 'license':
        updateData.licenseStatus = 'pending';
        updateData.licenseNumber = data.licenseNumber;
        updateData.licenseState = data.licenseState;
        updateData.licenseType = data.licenseType;
        updateData.licenseDocumentUrl = documentUrl;
        updateData.licenseExpiresAt = data.expiresAt
          ? new Date(data.expiresAt)
          : null;
        break;

      case 'insurance':
        updateData.insuranceStatus = 'pending';
        updateData.insuranceProvider = data.insuranceProvider;
        updateData.insurancePolicyNumber = data.insurancePolicyNumber;
        updateData.insuranceCoverageAmount = data.insuranceCoverageAmount
          ? parseFloat(data.insuranceCoverageAmount)
          : null;
        updateData.insuranceCertificateUrl = documentUrl;
        updateData.insuranceExpiresAt = data.expiresAt
          ? new Date(data.expiresAt)
          : null;
        break;

      case 'background':
        updateData.backgroundCheckStatus = 'pending';
        break;

      case 'bank':
        // Bank account verification handled separately via Stripe Connect
        updateData.bankAccountStatus = 'pending';
        break;
    }

    // Update overall status to pending if not already verified
    if (verification.verificationStatus === 'unverified') {
      updateData.verificationStatus = 'pending';
    }

    await prisma.contractorVerification.update({
      where: { id: verification.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification documents uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading verification:', error);
    return NextResponse.json(
      { error: 'Failed to upload verification documents' },
      { status: 500 }
    );
  }
}
