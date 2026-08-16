/**
 * Notifications API
 * 
 * GET /api/contractor/subscription/notifications
 * Fetches unread notifications for the authenticated contractor
 * 
 * PATCH /api/contractor/subscription/notifications
 * Marks one or more notifications as read
 * 
 * DELETE /api/contractor/subscription/notifications
 * Dismisses (deletes) one or more notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { runBackgroundOpsWithCleanup } from '@/lib/middleware/contractor-background-ops';

interface Notification {
  id: string;
  type: string;
  feature: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: Date;
}

interface GetNotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
}

interface UpdateNotificationsRequest {
  notificationIds: string[];
}

interface UpdateNotificationsResponse {
  success: boolean;
  message: string;
  updatedCount: number;
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * GET /api/contractor/subscription/notifications
 * 
 * Fetches unread notifications for the authenticated contractor
 * Returns notifications sorted by creation date (newest first)
 */
export async function GET() {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // 2. Get contractor profile
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Contractor profile not found',
        },
        { status: 404 }
      );
    }

    // Run background operations including cleanup
    await runBackgroundOpsWithCleanup(contractor.id);

    // 3. Fetch unread notifications
    const notifications = await prisma.contractorNotification.findMany({
      where: {
        contractorId: contractor.id,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        type: true,
        feature: true,
        message: true,
        actionUrl: true,
        read: true,
        createdAt: true,
      },
    });

    // 4. Count unread notifications
    const unreadCount = notifications.length;

    // 5. Return response
    return NextResponse.json<GetNotificationsResponse>(
      {
        success: true,
        notifications,
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        message: 'Failed to fetch notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contractor/subscription/notifications
 * 
 * Marks one or more notifications as read
 * Requires notificationIds array in request body
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // 2. Get contractor profile
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Contractor profile not found',
        },
        { status: 404 }
      );
    }

    // 3. Parse and validate request body
    let body: UpdateNotificationsRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const { notificationIds } = body;

    // Validate notificationIds parameter
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Missing or invalid "notificationIds" parameter. Must be an array of notification IDs.',
        },
        { status: 400 }
      );
    }

    if (notificationIds.length === 0) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'notificationIds array cannot be empty',
        },
        { status: 400 }
      );
    }

    // Validate all IDs are strings
    if (!notificationIds.every(id => typeof id === 'string')) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'All notification IDs must be strings',
        },
        { status: 400 }
      );
    }

    // 4. Mark notifications as read
    // Only update notifications that belong to this contractor
    const result = await prisma.contractorNotification.updateMany({
      where: {
        id: { in: notificationIds },
        contractorId: contractor.id,
      },
      data: {
        read: true,
      },
    });

    // 5. Return response
    return NextResponse.json<UpdateNotificationsResponse>(
      {
        success: true,
        message: `Successfully marked ${result.count} notification(s) as read`,
        updatedCount: result.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        message: 'Failed to mark notifications as read',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contractor/subscription/notifications
 * 
 * Dismisses (deletes) one or more notifications
 * Requires notificationIds array in request body
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // 2. Get contractor profile
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Contractor profile not found',
        },
        { status: 404 }
      );
    }

    // 3. Parse and validate request body
    let body: UpdateNotificationsRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const { notificationIds } = body;

    // Validate notificationIds parameter
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'Missing or invalid "notificationIds" parameter. Must be an array of notification IDs.',
        },
        { status: 400 }
      );
    }

    if (notificationIds.length === 0) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'notificationIds array cannot be empty',
        },
        { status: 400 }
      );
    }

    // Validate all IDs are strings
    if (!notificationIds.every(id => typeof id === 'string')) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: 'All notification IDs must be strings',
        },
        { status: 400 }
      );
    }

    // 4. Delete notifications
    // Only delete notifications that belong to this contractor
    const result = await prisma.contractorNotification.deleteMany({
      where: {
        id: { in: notificationIds },
        contractorId: contractor.id,
      },
    });

    // 5. Return response
    return NextResponse.json<UpdateNotificationsResponse>(
      {
        success: true,
        message: `Successfully dismissed ${result.count} notification(s)`,
        updatedCount: result.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error dismissing notifications:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        message: 'Failed to dismiss notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
