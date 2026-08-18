/**
 * POST /api/employee/safety
 *
 * Handles safety-related actions:
 * - complete_checklist: Record a completed safety checklist
 * - report_incident: Submit an incident/near-miss report
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, employeeId, contractorId } = body;

    if (!employeeId || !contractorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const employee = await prisma.contractorEmployee.findFirst({
      where: { id: employeeId, userId: session.user.id, status: 'active', contractorId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const db = prisma as any;

    switch (action) {
      case 'complete_checklist': {
        const { checklistId, responses, notes, jobId } = body;
        if (!checklistId) return NextResponse.json({ error: 'Checklist ID required' }, { status: 400 });

        const completion = await db.contractorSafetyChecklistCompletion.create({
          data: {
            contractorId,
            checklistId,
            employeeId,
            jobId: jobId || null,
            responses: responses || {},
            notes: notes || null,
            completedAt: new Date(),
          },
        });

        return NextResponse.json({ success: true, id: completion.id });
      }

      case 'report_incident': {
        const { type, severity, description, location, photos } = body;
        if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 });

        const report = await db.contractorIncidentReport.create({
          data: {
            contractorId,
            employeeId,
            type: type || 'other',
            severity: severity || 'medium',
            description: description.trim(),
            location: location || null,
            photos: photos || [],
            status: 'open',
            reportedBy: `${employee.firstName} ${employee.lastName}`.trim(),
          },
        });

        // Notify contractor
        try {
          const contractor = await prisma.contractorProfile.findUnique({
            where: { id: contractorId },
            select: { userId: true },
          });
          if (contractor?.userId) {
            await db.notification.create({
              data: {
                userId: contractor.userId,
                type: 'alert',
                title: `⚠️ Incident report: ${type} (${severity})`,
                message: `${employee.firstName} ${employee.lastName} reported: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
                actionUrl: '/contractor-dashboard/safety',
              },
            });
          }
        } catch {}

        return NextResponse.json({ success: true, id: report.id });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/employee/safety error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
