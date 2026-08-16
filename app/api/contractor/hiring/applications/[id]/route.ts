import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';
import { seedContractorRoles } from '@/lib/services/contractor-role-seeder';
import { eventBus } from '@/lib/event-system';
import crypto from 'crypto';

const db = prisma as any;

/**
 * GET /api/contractor/hiring/applications/[id]
 * Get a single application with full details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'team.view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const application = await db.contractorHiringApplication.findUnique({
      where: { id, contractorId: contractorAuth.contractorId },
      include: {
        post: { select: { id: true, title: true, roleId: true, employeeType: true, payType: true, payRangeMin: true, payRangeMax: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('GET /api/contractor/hiring/applications/[id]', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

/**
 * PATCH /api/contractor/hiring/applications/[id]
 * Update application status: under_review, interview, approved, rejected, hired
 *
 * When status = 'hired':
 *   - Creates a ContractorEmployee record
 *   - Sends invite token so the new hire can link their account
 *   - Updates the hiring post's hiredCount
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'team.invite')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, reviewNotes, rejectionReason, payRate, roleId } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['under_review', 'interview', 'approved', 'rejected', 'hired', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const application = await db.contractorHiringApplication.findUnique({
      where: { id, contractorId: contractorAuth.contractorId },
      include: {
        post: { select: { id: true, title: true, roleId: true, employeeType: true, payType: true, payRangeMin: true, hiredCount: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {
      status,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    };
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;

    // If hiring, create the employee record
    let employee = null;
    if (status === 'hired') {
      // Seed roles if needed
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorAuth.contractorId },
        select: { specialties: true },
      });
      await seedContractorRoles(contractorAuth.contractorId, contractor?.specialties?.[0]);

      // Determine the role to assign
      const assignRoleId = roleId || application.post.roleId || null;

      // Generate invite token
      const inviteToken = crypto.randomUUID();
      const inviteExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

      employee = await prisma.contractorEmployee.create({
        data: {
          contractorId: contractorAuth.contractorId,
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          phone: application.phone,
          role: application.post.title || 'technician',
          roleId: assignRoleId,
          employeeType: application.post.employeeType || 'w2',
          status: 'invited',
          hireDate: new Date(),
          payRate: payRate ? parseFloat(payRate) : Number(application.post.payRangeMin || 0),
          payType: application.post.payType || 'hourly',
          skills: application.skills || [],
          certifications: application.certifications || [],
          licenseNumber: application.licenseNumber,
          documents: [
            ...(application.governmentIdUrl ? [application.governmentIdUrl] : []),
            ...(application.governmentIdBackUrl ? [application.governmentIdBackUrl] : []),
            ...(application.resumeUrl ? [application.resumeUrl] : []),
            ...(application.additionalDocs || []),
          ],
          inviteToken,
          inviteExpiry,
          invitedAt: new Date(),
        },
      });

      updateData.employeeId = employee.id;

      // Increment hired count on the post
      await db.contractorHiringPost.update({
        where: { id: application.post.id },
        data: { hiredCount: { increment: 1 } },
      });

      await eventBus.emit('contractor.employee.created', {
        employeeId: employee.id,
        contractorId: contractorAuth.contractorId,
        employeeName: `${application.firstName} ${application.lastName}`,
        role: application.post.title,
        employeeType: application.post.employeeType,
        source: 'hiring_application',
      });
    }

    const updated = await db.contractorHiringApplication.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      application: updated,
      employee,
      ...(employee && {
        inviteLink: `/contractor/invite?token=${employee.inviteToken}`,
        message: `${application.firstName} has been hired! Send them the invite link to set up their account.`,
      }),
    });
  } catch (error) {
    console.error('PATCH /api/contractor/hiring/applications/[id]', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
