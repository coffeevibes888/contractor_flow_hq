import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/contractor/safety/checklists - List all safety checklists
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const checklists = await prisma.$queryRaw`
      SELECT * FROM "ContractorSafetyChecklist"
      WHERE "contractorId" = ${contractorProfile.id} AND "isActive" = true
      ORDER BY "category" ASC, "name" ASC
    `;

    // Get items for each checklist
    const checklistsWithItems = await Promise.all(
      (Array.isArray(checklists) ? checklists : []).map(async (checklist: any) => {
        const items = await prisma.$queryRaw`
          SELECT * FROM "ContractorSafetyChecklistItem"
          WHERE "checklistId" = ${checklist.id}
          ORDER BY "order" ASC
        `;
        return { ...checklist, items: Array.isArray(items) ? items : [] };
      })
    );

    return NextResponse.json({ success: true, checklists: checklistsWithItems });
  } catch (error) {
    console.error('Error fetching safety checklists:', error);
    return NextResponse.json({ error: 'Failed to fetch safety checklists' }, { status: 500 });
  }
}

// POST /api/contractor/safety/checklists - Create new checklist
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const data = await req.json();
    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "ContractorSafetyChecklist" (
        id, "contractorId", name, description, category, "isActive", "isDefault",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${contractorProfile.id}, ${data.name}, ${data.description || null}, 
        ${data.category}, true, ${data.isDefault || false},
        ${new Date()}, ${new Date()}
      )
    `;

    // Insert items
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const itemId = crypto.randomUUID();
      
      await prisma.$executeRaw`
        INSERT INTO "ContractorSafetyChecklistItem" (
          id, "checklistId", "itemText", "isRequired", "order"
        ) VALUES (
          ${itemId}, ${id}, ${item.text}, ${item.isRequired !== false}, ${i}
        )
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Safety checklist created',
      id 
    });
  } catch (error) {
    console.error('Error creating safety checklist:', error);
    return NextResponse.json({ error: 'Failed to create safety checklist' }, { status: 500 });
  }
}

// POST /api/contractor/safety/checklists/complete - Complete a checklist
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const data = await req.json();
    const id = crypto.randomUUID();

    const issuesFound = data.responses.filter((r: any) => !r.checked && r.isRequired).length;

    await prisma.$executeRaw`
      INSERT INTO "ContractorSafetyChecklistCompletion" (
        id, "contractorId", "checklistId", "jobId", "employeeId",
        "completedAt", location, responses, "allItemsChecked", "issuesFound",
        "correctiveAction", "createdAt"
      ) VALUES (
        ${id}, ${contractorProfile.id}, ${data.checklistId}, ${data.jobId || null}, 
        ${data.employeeId || null}, ${new Date()}, ${data.location || null}, 
        ${JSON.stringify(data.responses)}, ${issuesFound === 0}, ${issuesFound},
        ${data.correctiveAction || null}, ${new Date()}
      )
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Checklist completed',
      id,
      issuesFound
    });
  } catch (error) {
    console.error('Error completing checklist:', error);
    return NextResponse.json({ error: 'Failed to complete checklist' }, { status: 500 });
  }
}
