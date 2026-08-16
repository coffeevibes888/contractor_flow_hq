import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { rentalApplicationSchema } from '@/lib/validators';
import { encryptField } from '@/lib/encrypt';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const existingApplication = await prisma.rentalApplication.findUnique({
      where: { id },
    });

    if (!existingApplication) {
      return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });
    }

    if (existingApplication.applicantId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (existingApplication.status !== 'draft') {
      return NextResponse.json(
        { success: false, message: 'This application has already been submitted' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;
    const idDocsCount = await prismaAny.applicationDocument.count({
      where: {
        applicationId: existingApplication.id,
        category: 'id_verification',
      },
    });

    if (!idDocsCount || Number(idDocsCount) < 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please upload a government-issued ID before submitting your application.',
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }

    const validationResult = rentalApplicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const encryptedSsn = data.ssn ? await encryptField(data.ssn) : null;

    const notesCombined = [
      data.notes,
      data.age ? `Age: ${data.age}` : undefined,
      data.currentAddress ? `Address: ${data.currentAddress}` : undefined,
      data.currentEmployer ? `Employer: ${data.currentEmployer}` : undefined,
      data.monthlySalary ? `Salary (monthly): ${data.monthlySalary}` : undefined,
      data.yearlySalary ? `Salary (yearly): ${data.yearlySalary}` : undefined,
      data.hasPets ? `Has pets: ${data.hasPets}` : undefined,
      data.petCount ? `Number of pets: ${data.petCount}` : undefined,
      data.hasPets && data.hasPets.toLowerCase().startsWith('y')
        ? 'Note: Applicant was informed that a $300 annual pet fee is added for pets.'
        : undefined,
      existingApplication.propertySlug ? `Property: ${existingApplication.propertySlug}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    const unit = existingApplication.propertySlug
      ? await prisma.unit.findFirst({
          where: {
            isAvailable: true,
            property: {
              slug: existingApplication.propertySlug,
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : null;

    await prisma.rentalApplication.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        notes: notesCombined,
        encryptedSsn,
        status: 'pending',
        unitId: unit?.id ?? existingApplication.unitId,
      },
    });

    revalidatePath('/admin/applications');
    revalidatePath('/user/dashboard');
    revalidatePath('/user/profile/application');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing application:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
