import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';

// GET - Employee details
export async function GET(
  request: NextRequest,
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
    const db = prisma as any;
    const employee = await db.contractorEmployee.findUnique({
      where: {
        id,
        contractorId: contractorAuth.contractorId,
      },
      include: {
        assignedRole: true,
        assignments: true,
        timeEntries: {
          orderBy: { clockIn: 'desc' },
          take: 50,
        },
        employeeCertifications: true,
        timeOffRequests: true,
        paychecks: {
          include: {
            payroll: {
              select: { periodStart: true, periodEnd: true, payDate: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 24,
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

// PUT - Update employee
export async function PUT(
  request: NextRequest,
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
    if (!can(contractorAuth, 'team.edit')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Verify employee belongs to contractor
    const existingEmployee = await prisma.contractorEmployee.findUnique({
      where: { id, contractorId: contractorAuth.contractorId },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      firstName, lastName, email, phone, role, hourlyRate, status,
      roleId, employeeType, payType, paySchedule, skills, certifications,
      emergencyContact, emergencyPhone, photo,
    } = body;

    // If changing roleId, validate it belongs to this contractor
    if (roleId !== undefined && roleId !== null) {
      const roleRecord = await (prisma as any).contractorRole.findFirst({
        where: { id: roleId, contractorId: contractorAuth.contractorId, isActive: true },
      });
      if (!roleRecord) {
        return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 });
      }
    }

    const employee = await prisma.contractorEmployee.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(role && { role }),
        ...(hourlyRate && { payRate: parseFloat(hourlyRate) }),
        ...(status && { status }),
        ...(roleId !== undefined && { roleId }),
        ...(employeeType && { employeeType }),
        ...(payType && { payType }),
        ...(paySchedule !== undefined && { paySchedule }),
        ...(skills && { skills }),
        ...(certifications && { certifications }),
        ...(emergencyContact !== undefined && { emergencyContactName: emergencyContact }),
        ...(emergencyPhone !== undefined && { emergencyContactPhone: emergencyPhone }),
        ...(photo !== undefined && { photo }),
      },
      include: {
        assignedRole: { select: { id: true, name: true, permissions: true } },
      },
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

// DELETE - Terminate employee (soft delete + revoke access)
export async function DELETE(
  request: NextRequest,
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
    if (!can(contractorAuth, 'team.remove')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Parse optional termination reason from body
    let terminationReason = 'involuntary';
    try {
      const body = await request.json();
      if (body.reason) terminationReason = body.reason;
    } catch {
      // No body is fine — default reason
    }

    const existingEmployee = await prisma.contractorEmployee.findUnique({
      where: { id, contractorId: contractorAuth.contractorId },
      select: { id: true, userId: true, status: true },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (existingEmployee.status === 'terminated') {
      return NextResponse.json({ error: 'Employee is already terminated' }, { status: 400 });
    }

    // Soft-terminate the employee
    await prisma.contractorEmployee.update({
      where: { id },
      data: {
        status: 'terminated',
        terminationDate: new Date(),
        terminationReason,
        inviteToken: null,
        inviteExpiry: null,
      },
    });

    // Revoke access: if the employee had a linked User account, reset their role
    // so they can no longer access /contractor/* routes
    if (existingEmployee.userId) {
      // Check if this user is an employee at any OTHER active contractor
      const otherActiveEmployment = await prisma.contractorEmployee.findFirst({
        where: {
          userId: existingEmployee.userId,
          status: 'active',
          id: { not: id },
        },
      });

      // Only downgrade role if they have no other active employment
      if (!otherActiveEmployment) {
        await prisma.user.update({
          where: { id: existingEmployee.userId },
          data: { role: 'user' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Employee terminated and access revoked',
    });
  } catch (error) {
    console.error('Error terminating employee:', error);
    return NextResponse.json({ error: 'Failed to terminate employee' }, { status: 500 });
  }
}
