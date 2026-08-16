import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify user is a landlord
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Get the application and verify it belongs to this landlord
    const application = await prisma.rentalApplication.findUnique({
      where: { id },
      include: {
        unit: {
          include: { property: true },
        },
        verification: true,
      },
    });

    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    // Verify the application belongs to this landlord's property
    if (application.unit?.property?.landlordId !== landlord.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Get verification documents
    const documents = await prisma.verificationDocument.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        docType: true,
        originalFileName: true,
        verificationStatus: true,
        extractedData: true,
      },
    });

    // Extract verified data from documents
    const identityDoc = documents.find(d => d.category === 'identity' && d.extractedData);
    const employmentDocs = documents.filter(d => d.category === 'employment' && d.extractedData);

    const identityData = identityDoc?.extractedData as any;
    const incomeData = employmentDocs.map(d => d.extractedData as any).filter(Boolean);

    // Calculate average gross pay from pay stubs
    const payStubData = incomeData.filter((d: any) => d.grossPay);
    const avgGrossPay = payStubData.length > 0
      ? payStubData.reduce((sum: number, d: any) => sum + (d.grossPay || 0), 0) / payStubData.length
      : null;

    const verifiedData = {
      identity: identityData ? {
        fullName: identityData.fullName,
        dateOfBirth: identityData.dateOfBirth,
        issuingState: identityData.issuingState,
        expirationDate: identityData.expirationDate,
      } : null,
      income: {
        employerName: incomeData.find((d: any) => d.employerName)?.employerName,
        avgGrossPay,
        monthlyIncome: application.verification?.monthlyIncome 
          ? Number(application.verification.monthlyIncome) 
          : null,
      },
    };

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        category: doc.category,
        docType: doc.docType,
        originalFileName: doc.originalFileName,
        verificationStatus: doc.verificationStatus,
      })),
      verifiedData,
    });
  } catch (error) {
    console.error('Error fetching application documents:', error);
    return NextResponse.json(
      { message: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
