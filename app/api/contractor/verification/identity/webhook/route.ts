/**
 * Identity Verification Webhook Handler
 * 
 * Handles webhook events from Persona for identity verification status updates.
 * Processes inquiry.completed, inquiry.failed, and inquiry.expired events.
 * 
 * Requirements: 4.2, 4.3
 * - 4.2: Display "Identity Verified" badge when verification passes
 * - 4.3: Allow one retry before requiring manual review if verification fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { IdentityVerificationService, PersonaWebhookEvent } from '@/lib/services/identity-verification';

/**
 * POST /api/contractor/verification/identity/webhook
 * 
 * Webhook endpoint for Persona to send identity verification status updates
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('persona-signature') || '';

    // Verify webhook signature
    const isValid = IdentityVerificationService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('Invalid Persona webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook event
    const event: PersonaWebhookEvent = JSON.parse(body);

    // Log the event for debugging
    console.log('Received Persona webhook:', {
      type: event.type,
      id: event.data.id,
      status: event.data.status,
    });

    // Handle the webhook event
    await IdentityVerificationService.handleWebhook(event);

    // Send notification to contractor based on event type
    if (event.type === 'inquiry.completed') {
      await sendCompletionNotification(event.data, true);
    } else if (event.type === 'inquiry.failed') {
      await sendCompletionNotification(event.data, false);
    }

    // Return success response
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Persona webhook:', error);
    
    // Return 500 to trigger Persona retry
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
 * Send notification to contractor when identity verification is completed or failed
 * Requirement 4.3: Notify contractor about verification status and retry option
 */
async function sendCompletionNotification(
  data: PersonaWebhookEvent['data'],
  passed: boolean
): Promise<void> {
  try {
    const { prisma } = await import('@/db/prisma');
    
    // Find the contractor
    const contractor = await prisma.contractorProfile.findFirst({
      where: { identityVerificationId: data.id },
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
      console.warn('Contractor not found for identity verification notification:', data.id);
      return;
    }

    // In production, send email notification
    // For now, just log
    console.log('Identity verification completed notification:', {
      contractorId: contractor.id,
      email: contractor.user.email,
      passed,
      inquiryId: data.id,
    });

    // TODO: Integrate with email service
    // if (passed) {
    //   await sendEmail({
    //     to: contractor.user.email,
    //     subject: 'Identity Verification Completed - Verified!',
    //     template: 'identity-verification-passed',
    //     data: { name: contractor.user.name },
    //   });
    // } else {
    //   // Requirement 4.3: Allow one retry before requiring manual review
    //   await sendEmail({
    //     to: contractor.user.email,
    //     subject: 'Identity Verification - Action Required',
    //     template: 'identity-verification-failed',
    //     data: { 
    //       name: contractor.user.name,
    //       retryUrl: process.env.NEXT_PUBLIC_APP_URL + '/contractor/settings/verification',
    //       supportUrl: process.env.NEXT_PUBLIC_APP_URL + '/support',
    //     },
    //   });
    // }
  } catch (error) {
    console.error('Failed to send identity verification notification:', error);
    // Don't throw - notification failure shouldn't fail the webhook
  }
}

/**
 * GET /api/contractor/verification/identity/webhook
 * 
 * Health check endpoint for webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'identity-verification-webhook',
    timestamp: new Date().toISOString(),
  });
}
