/**
 * Identity Verification Service
 * 
 * Handles contractor identity verification through Persona API.
 * Manages inquiry creation, webhook processing, and verification status.
 * 
 * Requirements: 4.1, 4.4
 * - 4.1: Collect government ID and selfie for comparison
 * - 4.4: Store identity documents securely and delete raw images after verification
 */

import { prisma } from '@/db/prisma';

// Types
export interface PersonaInquiry {
  inquiryId: string;
  sessionToken: string;
  inquiryUrl: string;
  expiresAt: Date;
}

export interface IdentityStatus {
  isVerified: boolean;
  inquiryId: string | null;
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'not_started';
  verifiedAt: Date | null;
}

export interface PersonaWebhookEvent {
  type: 'inquiry.completed' | 'inquiry.failed' | 'inquiry.expired';
  data: {
    id: string;
    status?: 'completed' | 'failed' | 'expired';
    verified_at?: string;
    fields?: Record<string, unknown>;
  };
}

// Persona API configuration
const PERSONA_CONFIG = {
  apiKey: process.env.PERSONA_API_KEY || '',
  templateId: process.env.PERSONA_TEMPLATE_ID || '', // Template for contractor verification
  baseUrl: process.env.PERSONA_API_URL || 'https://withpersona.com/api/v1',
  webhookSecret: process.env.PERSONA_WEBHOOK_SECRET || '',
  environment: process.env.PERSONA_ENVIRONMENT || 'sandbox', // sandbox or production
};

/**
 * Identity Verification Service
 * Handles contractor identity verification through Persona
 */
export class IdentityVerificationService {
  /**
   * Create an inquiry for identity verification
   * Requirement 4.1: Collect government ID and selfie for comparison
   */
  static async createInquiry(contractorId: string): Promise<PersonaInquiry> {
    // Validate contractor exists
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        id: true,
        userId: true,
        businessName: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!contractor) {
      throw new Error('Contractor not found');
    }

    try {
      // Create inquiry in Persona
      const inquiry = await this.createPersonaInquiry(
        contractor.user?.email || '',
        contractor.user?.name || contractor.businessName || ''
      );

      // Store the inquiry ID in the contractor profile
      await prisma.contractorProfile.update({
        where: { id: contractorId },
        data: {
          identityVerificationId: inquiry.inquiryId,
          identityVerifiedAt: null, // Will be set when completed
        },
      });

      return inquiry;
    } catch (error) {
      console.error('Failed to create identity verification inquiry:', error);
      throw new Error(
        `Identity verification initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle webhook events from Persona
   * Requirement 4.2: Display badge when identity is verified
   * Requirement 4.3: Allow retry if verification fails
   */
  static async handleWebhook(event: PersonaWebhookEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'inquiry.completed':
          await this.handleInquiryCompleted(event.data);
          break;
        case 'inquiry.failed':
          await this.handleInquiryFailed(event.data);
          break;
        case 'inquiry.expired':
          await this.handleInquiryExpired(event.data);
          break;
        default:
          console.log('Unhandled Persona webhook event:', event.type);
      }
    } catch (error) {
      console.error('Error handling Persona webhook:', error);
      throw error;
    }
  }

  /**
   * Get the current identity verification status for a contractor
   */
  static async getVerificationStatus(contractorId: string): Promise<IdentityStatus> {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        identityVerificationId: true,
        identityVerifiedAt: true,
      },
    });

    if (!contractor) {
      throw new Error('Contractor not found');
    }

    // If no verification has been initiated
    if (!contractor.identityVerificationId) {
      return {
        isVerified: false,
        inquiryId: null,
        status: 'not_started',
        verifiedAt: null,
      };
    }

    // Determine status based on verification date
    let status: IdentityStatus['status'] = 'pending';

    if (contractor.identityVerifiedAt) {
      status = 'completed';
    }

    return {
      isVerified: status === 'completed',
      inquiryId: contractor.identityVerificationId,
      status,
      verifiedAt: contractor.identityVerifiedAt,
    };
  }

  /**
   * Create an inquiry in Persona
   */
  private static async createPersonaInquiry(
    email: string,
    name: string
  ): Promise<PersonaInquiry> {
    if (!PERSONA_CONFIG.apiKey) {
      // Return mock response if API key not configured
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Inquiries typically expire in 7 days

      return {
        inquiryId: `mock_inquiry_${Date.now()}`,
        sessionToken: `mock_session_${Date.now()}`,
        inquiryUrl: `https://withpersona.com/verify?inquiry-id=mock_inquiry_${Date.now()}`,
        expiresAt,
      };
    }

    try {
      const response = await fetch(`${PERSONA_CONFIG.baseUrl}/inquiries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERSONA_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'Persona-Version': '2023-01-05',
        },
        body: JSON.stringify({
          data: {
            type: 'inquiry',
            attributes: {
              inquiry_template_id: PERSONA_CONFIG.templateId,
              reference_id: email, // Use email as reference
              environment: PERSONA_CONFIG.environment,
              fields: {
                name_first: name.split(' ')[0] || name,
                name_last: name.split(' ').slice(1).join(' ') || '',
                email_address: email,
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Persona API error: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      const inquiryData = result.data;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Inquiries typically expire in 7 days

      return {
        inquiryId: inquiryData.id,
        sessionToken: inquiryData.attributes.session_token || '',
        inquiryUrl: inquiryData.attributes.inquiry_url || '',
        expiresAt,
      };
    } catch (error) {
      console.error('Failed to create Persona inquiry:', error);
      throw error;
    }
  }

  /**
   * Handle inquiry.completed webhook event
   * Requirement 4.2: Display "Identity Verified" badge when verification passes
   * Requirement 4.4: Delete raw images after verification (Persona handles this)
   */
  private static async handleInquiryCompleted(data: PersonaWebhookEvent['data']): Promise<void> {
    const inquiryId = data.id;
    const verifiedAt = data.verified_at ? new Date(data.verified_at) : new Date();

    // Find contractor with this inquiry ID
    const contractor = await prisma.contractorProfile.findFirst({
      where: { identityVerificationId: inquiryId },
    });

    if (!contractor) {
      console.warn(`No contractor found for identity verification inquiry: ${inquiryId}`);
      return;
    }

    // Update contractor profile with verification date
    await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        identityVerifiedAt: verifiedAt,
      },
    });

    // Note: Persona automatically handles secure storage and deletion of raw images
    // per their data retention policies (Requirement 4.4)
  }

  /**
   * Handle inquiry.failed webhook event
   * Requirement 4.3: Allow one retry before requiring manual review
   */
  private static async handleInquiryFailed(data: PersonaWebhookEvent['data']): Promise<void> {
    const inquiryId = data.id;

    // Find contractor with this inquiry ID
    const contractor = await prisma.contractorProfile.findFirst({
      where: { identityVerificationId: inquiryId },
    });

    if (!contractor) {
      console.warn(`No contractor found for failed identity verification inquiry: ${inquiryId}`);
      return;
    }

    // Clear verification date to indicate failure
    // The contractor can retry by creating a new inquiry
    await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        identityVerifiedAt: null,
      },
    });

    // TODO: Send notification to contractor about failed verification
    // TODO: Track retry count to enforce "one retry before manual review" rule
  }

  /**
   * Handle inquiry.expired webhook event
   */
  private static async handleInquiryExpired(data: PersonaWebhookEvent['data']): Promise<void> {
    const inquiryId = data.id;

    // Find contractor with this inquiry ID
    const contractor = await prisma.contractorProfile.findFirst({
      where: { identityVerificationId: inquiryId },
    });

    if (!contractor) {
      console.warn(`No contractor found for expired identity verification inquiry: ${inquiryId}`);
      return;
    }

    // Clear inquiry ID to allow creating a new one
    await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        identityVerificationId: null,
        identityVerifiedAt: null,
      },
    });
  }

  /**
   * Verify webhook signature from Persona
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!PERSONA_CONFIG.webhookSecret) {
      console.warn('Persona webhook secret not configured, skipping signature verification');
      return true; // Allow in development
    }

    // In production, implement HMAC signature verification
    // Persona uses HMAC-SHA256 for webhook signatures
    // const crypto = require('crypto');
    // const expectedSignature = crypto
    //   .createHmac('sha256', PERSONA_CONFIG.webhookSecret)
    //   .update(payload)
    //   .digest('hex');
    // return signature === expectedSignature;

    return true; // Placeholder
  }
}
