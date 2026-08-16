/**
 * Background Check Webhook Handler
 * 
 * Handles webhook events from Checkr for background check status updates.
 * Processes report.completed and report.suspended events.
 * 
 * Requirements: 3.2, 3.3
 * - 3.2: Display badge when background check passes
 * - 3.3: Don't display badge when check fails, notify contractor privately
 */

import { NextRequest, NextResponse } from 'next/server';
import { BackgroundCheckService, CheckrWebhookEvent } from '@/lib/services/background-check';

/**
 * POST /api/contractor/verification/background-check/webhook
 * 
 * Webhook endpoint for Checkr to send background check status updates
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-checkr-signature') || '';

    // Verify webhook signature
    const isValid = BackgroundCheckService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('Invalid Checkr webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook event
    const event: CheckrWebhookEvent = JSON.parse(body);

    // Log the event for debugging
    console.log('Received Checkr webhook:', {
      type: event.type,
      id: event.data.id,
      status: event.data.status,
    });

    // Handle the webhook event
    await BackgroundCheckService.handleWebhook(event);

    // Send notification to contractor if check is completed
    if (event.type === 'report.completed') {
      await sendCompletionNotification(event.data);
    }

    // Return success response
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Checkr webhook:', error);
    
    // Return 500 to trigger Checkr retry
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Send notification to contractor when background check is completed
 * Requirement 3.3: Notify contractor privately when check fails
 */
async function sendCompletionNotification(data: CheckrWebhookEvent['data']): Promise<void> {
  try {
    const { prisma } = await import('@/db/prisma');
    
    // Find the contractor
    const contractor = await prisma.contractorProfile.findFirst({
      where: { backgroundCheckId: data.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!contractor || !contractor.user) {
      console.warn('Contractor not found for background check notification:', data.id);
      return;
    }

    const status = data.status;
    const passed = status === 'clear';

    // In production, send email notification
    // For now, just log
    console.log('Background check completed notification:', {
      contractorId: contractor.id,
      email: contractor.user.email,
      passed,
      status,
    });

    // TODO: Integrate with email service
    // if (passed) {
    //   await sendEmail({
    //     to: contractor.user.email,
    //     subject: 'Background Check Completed - Verified!',
    //     template: 'background-check-passed',
    //     data: { name: contractor.user.name },
    //   });
    // } else {
    //   await sendEmail({
    //     to: contractor.user.email,
    //     subject: 'Background Check Completed',
    //     template: 'background-check-failed',
    //     data: { 
    //       name: contractor.user.name,
    //       status,
    //       supportUrl: process.env.NEXT_PUBLIC_APP_URL + '/support',
    //     },
    //   });
    // }
  } catch (error) {
    console.error('Failed to send background check notification:', error);
    // Don't throw - notification failure shouldn't fail the webhook
  }
}

/**
 * GET /api/contractor/verification/background-check/webhook
 * 
 * Health check endpoint for webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'background-check-webhook',
    timestamp: new Date().toISOString(),
  });
}
