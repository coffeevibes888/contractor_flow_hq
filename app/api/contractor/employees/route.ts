import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';
import { seedContractorRoles } from '@/lib/services/contractor-role-seeder';
import { eventBus } from '@/lib/event-system';

/**
 * GET /api/contractor/employees
 * List all employees for the current contractor.
 * Employees with team.view can see the list; others only see themselves.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // If user can view team, show all employees; otherwise show only themselves
    const canViewTeam = can(contractorAuth, 'team.view');

    const whereClause: any = {
      contractorId: contractorAuth.contractorId,
      ...(status && { status }),
    };

    if (!canViewTeam && !contractorAuth.isOwner) {
      // Non-owner without team.view can only see their own record
      whereClause.userId = session.user.id;
    }

    const employees = await prisma.contractorEmployee.findMany({
      where: whereClause,
      include: {
        assignedRole: {
          select: { id: true, name: true, permissions: true },
        },
        _count: {
          select: { assignments: true, timeEntries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

/**
 * POST /api/contractor/employees
 * Create a new employee directly (without invite flow).
 * For adding team members who are already on-site / don't need account access.
 */
export async function POST(request: NextRequest) {
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

    // Seed default roles if needed
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorAuth.contractorId },
      select: { specialties: true },
    });
    await seedContractorRoles(contractorAuth.contractorId, contractor?.specialties?.[0]);

    const body = await request.json();
    const {
      firstName, lastName, email, phone, role, roleId,
      employeeType, payRate, payType, paySchedule,
      skills, certifications, licenseNumber, licenseExpiry,
      emergencyContactName, emergencyContactPhone, hireDate,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
    }

    // Validate roleId if provided
    let validRoleId: string | null = null;
    if (roleId) {
      const roleRecord = await (prisma as any).contractorRole.findFirst({
        where: { id: roleId, contractorId: contractorAuth.contractorId, isActive: true },
      });
      if (!roleRecord) {
        return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 });
      }
      validRoleId = roleRecord.id;
    }

    const employee = await prisma.contractorEmployee.create({
      data: {
        contractorId: contractorAuth.contractorId,
        firstName,
        lastName,
        email: email?.toLowerCase().trim() || null,
        phone: phone || null,
        role: role || 'technician',
        roleId: validRoleId,
        employeeType: employeeType || 'w2',
        status: 'active',
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        payRate: payRate ? parseFloat(payRate) : 0,
        payType: payType || 'hourly',
        paySchedule: paySchedule || null,
        skills: skills || [],
        certifications: certifications || [],
        licenseNumber: licenseNumber || null,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
      },
      include: {
        assignedRole: { select: { id: true, name: true, permissions: true } },
      },
    });

    await eventBus.emit('contractor.employee.created', {
      employeeId: employee.id,
      contractorId: contractorAuth.contractorId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      role: employee.role,
      employeeType: employee.employeeType,
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
