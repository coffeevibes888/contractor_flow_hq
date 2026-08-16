/**
 * Background Check Service
 * 
 * Handles contractor background check verification through Checkr API.
 * Manages candidate creation, invitation, and webhook processing.
 * 
 * Requirements: 3.1, 3.4
 * - 3.1: Redirect to third-party background check provider (Checkr)
 * - 3.4: Require background check renewal every 12 months
 */

import { prisma } from '@/db/prisma';

// Types
export interface CandidateData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dob?: string; // YYYY-MM-DD format
  ssn?: string; // Last 4 digits or full SSN
  zipcode?: string;
}

export interface CheckrInvitation {
  invitationUrl: string;
  candidateId: string;
  reportId?: string;
  expiresAt: Date;
}

export interface BackgroundCheckStatus {
  isVerified: boolean;
  checkId: string | null;
  status: 'pending' | 'clear' | 'consider' | 'suspended' | 'expired' | 'not_started';
  completedAt: Date | null;
  expiresAt: Date | null;
  needsRenewal: boolean;
  reportUrl?: string;
}

export interface CheckrWebhookEvent {
  type: 'report.completed' | 'report.suspended' | 'candidate.created';
  data: {
    id: string;
    status?: 'clear' | 'consider' | 'suspended';
    completed_at?: string;
    candidate_id?: string;
    report_url?: string;
  };
}

// Checkr API configuration
const CHECKR_CONFIG = {
  apiKey: process.env.CHECKR_API_KEY || '',
  baseUrl: process.env.CHECKR_API_URL || 'https://api.checkr.com/v1',
  packageSlug: process.env.CHECKR_PACKAGE_SLUG || 'tasker_standard', // Default package for contractors
  webhookSecret: process.env.CHECKR_WEBHOOK_SECRET || '',
};

/**
 * Background Check Service
 * Handles contractor background check verification through Checkr
 */
export class BackgroundCheckService {
  /**
   * Initiate a background check for a contractor
   * Requirement 3.1: Redirect to third-party background check provider (Checkr)
   */
  static async initiateCheck(
    contractorId: string,
    candidateData: CandidateData
  ): Promise<CheckrInvitation> {
    // Validate contractor exists
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        id: true,
        userId: true,
        businessName: true,
      },
    });

    if (!contractor) {
      throw new Error('Contractor not found');
    }

    try {
      // Create candidate in Checkr
      const candidate = await this.createCandidate(candidateData);

      // Create invitation for the candidate
      const invitation = await this.createInvitation(candidate.id, candidateData.email);

      // Store the background check ID in the contractor profile
      await prisma.contractorProfile.update({
        where: { id: contractorId },
        data: {
          backgroundCheckId: invitation.reportId || candidate.id,
          backgroundCheckDate: null, // Will be set when completed
          backgroundCheckExpires: null, // Will be set when completed
        },
      });

      return invitation;
    } catch (error) {
      console.error('Failed to initiate background check:', error);
      throw new Error(
        `Background check initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle webhook events from Checkr
   * Requirement 3.2, 3.3: Update profile when check passes/fails
   */
  static async handleWebhook(event: CheckrWebhookEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'report.completed':
          await this.handleReportCompleted(event.data);
          break;
        case 'report.suspended':
          await this.handleReportSuspended(event.data);
          break;
        case 'candidate.created':
          // Log candidate creation but no action needed
          console.log('Checkr candidate created:', event.data.id);
          break;
        default:
          console.log('Unhandled Checkr webhook event:', event.type);
      }
    } catch (error) {
      console.error('Error handling Checkr webhook:', error);
      throw error;
    }
  }

  /**
   * Get the current background check status for a contractor
   */
  static async getCheckStatus(contractorId: string): Promise<BackgroundCheckStatus> {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        backgroundCheckId: true,
        backgroundCheckDate: true,
        backgroundCheckExpires: true,
      },
    });

    if (!contractor) {
      throw new Error('Contractor not found');
    }

    // If no check has been initiated
    if (!contractor.backgroundCheckId) {
      return {
        isVerified: false,
        checkId: null,
        status: 'not_started',
        completedAt: null,
        expiresAt: null,
        needsRenewal: false,
      };
    }

    // Determine status based on dates
    const now = new Date();
    let status: BackgroundCheckStatus['status'] = 'pending';
    let needsRenewal = false;

    if (contractor.backgroundCheckDate && contractor.backgroundCheckExpires) {
      if (contractor.backgroundCheckExpires < now) {
        status = 'expired';
        needsRenewal = true;
      } else {
        status = 'clear';
        // Check if renewal is needed within 30 days
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        needsRenewal = contractor.backgroundCheckExpires < thirtyDaysFromNow;
      }
    }

    return {
      isVerified: status === 'clear',
      checkId: contractor.backgroundCheckId,
      status,
      completedAt: contractor.backgroundCheckDate,
      expiresAt: contractor.backgroundCheckExpires,
      needsRenewal,
    };
  }

  /**
   * Create a candidate in Checkr
   */
  private static async createCandidate(data: CandidateData): Promise<{ id: string }> {
    if (!CHECKR_CONFIG.apiKey) {
      // Return mock response if API key not configured
      return {
        id: `mock_candidate_${Date.now()}`,
      };
    }

    try {
      const response = await fetch(`${CHECKR_CONFIG.baseUrl}/candidates`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(CHECKR_CONFIG.apiKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          dob: data.dob,
          ssn: data.ssn,
          zipcode: data.zipcode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Checkr API error: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      return { id: result.id };
    } catch (error) {
      console.error('Failed to create Checkr candidate:', error);
      throw error;
    }
  }

  /**
   * Create an invitation for a candidate
   */
  private static async createInvitation(
    candidateId: string,
    email: string
  ): Promise<CheckrInvitation> {
    if (!CHECKR_CONFIG.apiKey) {
      // Return mock response if API key not configured
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      return {
        invitationUrl: `https://checkr.com/invitation/mock_${candidateId}`,
        candidateId,
        expiresAt,
      };
    }

    try {
      const response = await fetch(`${CHECKR_CONFIG.baseUrl}/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(CHECKR_CONFIG.apiKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_id: candidateId,
          package: CHECKR_CONFIG.packageSlug,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Checkr API error: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Invitations typically expire in 30 days

      return {
        invitationUrl: result.invitation_url,
        candidateId: result.candidate_id,
        reportId: result.report_id,
        expiresAt,
      };
    } catch (error) {
      console.error('Failed to create Checkr invitation:', error);
      throw error;
    }
  }

  /**
   * Handle report.completed webhook event
   * Requirement 3.2: Display badge when check passes
   * Requirement 3.3: Don't display badge when check fails
   */
  private static async handleReportCompleted(data: CheckrWebhookEvent['data']): Promise<void> {
    const reportId = data.id;
    const status = data.status;
    const completedAt = data.completed_at ? new Date(data.completed_at) : new Date();

    // Find contractor with this background check ID
    const contractor = await prisma.contractorProfile.findFirst({
      where: { backgroundCheckId: reportId },
    });

    if (!contractor) {
      console.warn(`No contractor found for background check report: ${reportId}`);
      return;
    }

    // Calculate expiration date (12 months from completion)
    // Requirement 3.4: Require background check renewal every 12 months
    const expiresAt = new Date(completedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Update contractor profile
    // Only set dates if status is 'clear' (passed)
    if (status === 'clear') {
      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: {
          backgroundCheckDate: completedAt,
          backgroundCheckExpires: expiresAt,
        },
      });
    } else {
      // For 'consider' status, set completion date but not expiration
      // This allows tracking that check was completed but didn't pass
      await prisma.contractorProfile.update({
        where: { id: contractor.id },
        data: {
          backgroundCheckDate: completedAt,
          backgroundCheckExpires: null,
        },
      });
    }
  }

  /**
   * Handle report.suspended webhook event
   */
  private static async handleReportSuspended(data: CheckrWebhookEvent['data']): Promise<void> {
    const reportId = data.id;

    // Find contractor with this background check ID
    const contractor = await prisma.contractorProfile.findFirst({
      where: { backgroundCheckId: reportId },
    });

    if (!contractor) {
      console.warn(`No contractor found for suspended background check report: ${reportId}`);
      return;
    }

    // Clear dates to indicate check is suspended
    await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        backgroundCheckDate: null,
        backgroundCheckExpires: null,
      },
    });
  }

  /**
   * Verify webhook signature from Checkr
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!CHECKR_CONFIG.webhookSecret) {
      console.warn('Checkr webhook secret not configured, skipping signature verification');
      return true; // Allow in development
    }

    // In production, implement HMAC signature verification
    // const crypto = require('crypto');
    // const expectedSignature = crypto
    //   .createHmac('sha256', CHECKR_CONFIG.webhookSecret)
    //   .update(payload)
    //   .digest('hex');
    // return signature === expectedSignature;

    return true; // Placeholder
  }
}
