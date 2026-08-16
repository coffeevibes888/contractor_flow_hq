import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

/**
 * Cron job to automatically archive tenants who have been unassigned for 30+ days
 * This should be called daily via a cron service (e.g., Vercel Cron, GitHub Actions)
 * 
 * To set up in Vercel:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/archive-old-tenants",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find all unassigned tenants older than 30 days
    const oldLinks = await prisma.tenantLandlordLink.findMany({
      where: {
        status: 'pending',
        createdAt: {
          lt: thirtyDaysAgo
        }
      },
      include: {
        tenant: {
          select: {
            name: true,
            email: true
          }
        },
        landlord: {
          select: {
            ownerUserId: true
          }
        }
      }
    });

    if (oldLinks.length === 0) {
      return NextResponse.json({ 
        message: 'No old unassigned tenants found',
        archived: 0
      });
    }

    // Archive them
    const result = await prisma.tenantLandlordLink.updateMany({
      where: {
        id: {
          in: oldLinks.map(link => link.id)
        }
      },
      data: {
        status: 'archived',
        archivedAt: new Date()
      }
    });

    // Optionally notify landlords about auto-archived tenants
    // (You can enable this if you want notifications)
    /*
    for (const link of oldLinks) {
      if (link.landlord?.ownerUserId) {
        await NotificationService.createNotification({
          userId: link.landlord.ownerUserId,
          type: 'reminder',
          title: 'Tenant Auto-Archived',
          message: `${link.tenant.name} was automatically archived after 30 days without assignment.`,
          actionUrl: '/admin/tenants/unassigned'
        });
      }
    }
    */

    console.log(`Auto-archived ${result.count} old unassigned tenants`);

    return NextResponse.json({ 
      message: 'Successfully archived old tenants',
      archived: result.count,
      tenants: oldLinks.map(link => ({
        name: link.tenant.name,
        email: link.tenant.email,
        signedUpAt: link.createdAt
      }))
    });
  } catch (error) {
    console.error('Archive old tenants cron error:', error);
    return NextResponse.json(
      { message: 'Failed to archive old tenants', error: String(error) },
      { status: 500 }
    );
  }
}

// Made with Bob
