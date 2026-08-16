/**
 * License Verification Service
 * 
 * Handles contractor license verification through state licensing board APIs.
 * Supports CA, TX, FL, NY with extensible architecture for additional states.
 * 
 * Requirements: 1.1, 1.5
 * - 1.1: Query state licensing database API to validate license
 * - 1.5: Re-verify licenses automatically every 30 days
 */

import { prisma } from '@/db/prisma';

// Types
export interface LicenseResult {
  isValid: boolean;
  expirationDate: Date | null;
  licenseType: string;
  holderName: string;
  status: 'active' | 'expired' | 'suspended' | 'revoked' | 'not_found';
  verifiedAt: Date;
  rawResponse?: Record<string, unknown>;
}

export interface LicenseStatus {
  isVerified: boolean;
  licenseNumber: string | null;
  licenseState: string | null;
  licenseType: string | null;
  expiresAt: Date | null;
  verifiedAt: Date | null;
  status: 'active' | 'expired' | 'suspended' | 'revoked' | 'not_found' | 'pending';
  needsReverification: boolean;
}

// State license API configurations
// Note: These are placeholder URLs - in production, these would be actual state API endpoints
const STATE_LICENSE_APIS = {
  CA: {
    name: 'California Contractors State License Board',
    baseUrl: process.env.CA_LICENSE_API_URL || 'https://www.cslb.ca.gov/api',
    apiKey: process.env.CA_LICENSE_API_KEY,
  },
  TX: {
    name: 'Texas Department of Licensing and Regulation',
    baseUrl: process.env.TX_LICENSE_API_URL || 'https://www.tdlr.texas.gov/api',
    apiKey: process.env.TX_LICENSE_API_KEY,
  },
  FL: {
    name: 'Florida Department of Business and Professional Regulation',
    baseUrl: process.env.FL_LICENSE_API_URL || 'https://www.myfloridalicense.com/api',
    apiKey: process.env.FL_LICENSE_API_KEY,
  },
  NY: {
    name: 'New York Department of State',
    baseUrl: process.env.NY_LICENSE_API_URL || 'https://www.dos.ny.gov/api',
    apiKey: process.env.NY_LICENSE_API_KEY,
  },
} as const;

type SupportedState = keyof typeof STATE_LICENSE_APIS;

/**
 * License Verification Service
 * Handles contractor license verification and re-verification
 */
export class LicenseVerificationService {
  /**
   * Verify a contractor's license with the state licensing board
   * Requirement 1.1: Query state licensing database API to validate license
   */
  static async verifyLicense(
    licenseNumber: string,
    state: string,
    type: string
  ): Promise<LicenseResult> {
    const normalizedState = state.toUpperCase();
    
    // Check if state is supported
    if (!this.isSupportedState(normalizedState)) {
      return {
        isValid: false,
        expirationDate: null,
        licenseType: type,
        holderName: '',
        status: 'not_found',
        verifiedAt: new Date(),
        rawResponse: { error: 'State not supported for automated verification' },
      };
    }

    try {
      // Call the appropriate state API
      const result = await this.callStateAPI(normalizedState as SupportedState, licenseNumber, type);
      return result;
    } catch (error) {
      console.error(`License verification failed for ${state} license ${licenseNumber}:`, error);
      
      // Return a pending result on API failure
      return {
        isValid: false,
        expirationDate: null,
        licenseType: type,
        holderName: '',
        status: 'not_found',
        verifiedAt: new Date(),
        rawResponse: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Get the current license verification status for a contractor
   */
  static async getLicenseStatus(contractorId: string): Promise<LicenseStatus> {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        licenseNumber: true,
        licenseState: true,
        licenseVerifiedAt: true,
        licenseExpiresAt: true,
        licenseVerificationData: true,
      },
    });

    if (!contractor) {
      throw new Error('Contractor not found');
    }

    // Determine if license needs reverification (30 days since last verification)
    const needsReverification = contractor.licenseVerifiedAt
      ? this.needsReverification(contractor.licenseVerifiedAt)
      : false;

    // Determine current status
    let status: LicenseStatus['status'] = 'pending';
    if (contractor.licenseVerifiedAt && contractor.licenseExpiresAt) {
      const now = new Date();
      if (contractor.licenseExpiresAt < now) {
        status = 'expired';
      } else {
        status = 'active';
      }
    } else if (contractor.licenseVerificationData) {
      const data = contractor.licenseVerificationData as { status?: string };
      status = (data.status as LicenseStatus['status']) || 'pending';
    }

    return {
      isVerified: !!contractor.licenseVerifiedAt && status === 'active',
      licenseNumber: contractor.licenseNumber,
      licenseState: contractor.licenseState,
      licenseType: contractor.licenseVerificationData 
        ? (contractor.licenseVerificationData as { licenseType?: string }).licenseType || null
        : null,
      expiresAt: contractor.licenseExpiresAt,
      verifiedAt: contractor.licenseVerifiedAt,
      status,
      needsReverification,
    };
  }

  /**
   * Schedule automatic reverification for a contractor's license
   * Requirement 1.5: Re-verify licenses automatically every 30 days
   */
  static async scheduleReverification(contractorId: string): Promise<void> {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        licenseNumber: true,
        licenseState: true,
        licenseVerificationData: true,
      },
    });

    if (!contractor?.licenseNumber || !contractor?.licenseState) {
      throw new Error('Contractor does not have license information');
    }

    const licenseType = contractor.licenseVerificationData
      ? (contractor.licenseVerificationData as { licenseType?: string }).licenseType || 'general'
      : 'general';

    // Perform reverification
    const result = await this.verifyLicense(
      contractor.licenseNumber,
      contractor.licenseState,
      licenseType
    );

    // Update contractor profile with reverification results
    await prisma.contractorProfile.update({
      where: { id: contractorId },
      data: {
        licenseVerifiedAt: result.verifiedAt,
        licenseExpiresAt: result.expirationDate,
        licenseVerificationData: result.rawResponse || {},
      },
    });
  }

  /**
   * Check if a license needs reverification (30 days since last check)
   */
  private static needsReverification(lastVerifiedAt: Date): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastVerifiedAt < thirtyDaysAgo;
  }

  /**
   * Check if a state is supported for automated verification
   */
  private static isSupportedState(state: string): state is SupportedState {
    return state in STATE_LICENSE_APIS;
  }

  /**
   * Call the appropriate state licensing API
   * This is where the actual API integration happens
   */
  private static async callStateAPI(
    state: SupportedState,
    licenseNumber: string,
    licenseType: string
  ): Promise<LicenseResult> {
    const apiConfig = STATE_LICENSE_APIS[state];

    // In a real implementation, this would make actual HTTP requests to state APIs
    // For now, we'll implement the structure with mock responses
    
    // Note: Each state has different API structures and authentication methods
    // This would need to be customized per state in production
    
    switch (state) {
      case 'CA':
        return this.verifyCaliforniaLicense(licenseNumber, licenseType, apiConfig);
      case 'TX':
        return this.verifyTexasLicense(licenseNumber, licenseType, apiConfig);
      case 'FL':
        return this.verifyFloridaLicense(licenseNumber, licenseType, apiConfig);
      case 'NY':
        return this.verifyNewYorkLicense(licenseNumber, licenseType, apiConfig);
      default:
        throw new Error(`Unsupported state: ${state}`);
    }
  }

  /**
   * California CSLB API integration
   */
  private static async verifyCaliforniaLicense(
    licenseNumber: string,
    licenseType: string,
    config: { baseUrl: string; apiKey?: string; name: string }
  ): Promise<LicenseResult> {
    // In production, this would make an actual API call:
    // const response = await fetch(`${config.baseUrl}/license/${licenseNumber}`, {
    //   headers: { 'Authorization': `Bearer ${config.apiKey}` }
    // });
    
    // For now, return a structured response that matches what we'd expect
    // This allows the rest of the system to work while API integrations are being set up
    
    return {
      isValid: false,
      expirationDate: null,
      licenseType,
      holderName: '',
      status: 'not_found',
      verifiedAt: new Date(),
      rawResponse: {
        state: 'CA',
        message: 'API integration pending - manual verification required',
        licenseNumber,
        apiEndpoint: config.baseUrl,
      },
    };
  }

  /**
   * Texas TDLR API integration
   */
  private static async verifyTexasLicense(
    licenseNumber: string,
    licenseType: string,
    config: { baseUrl: string; apiKey?: string; name: string }
  ): Promise<LicenseResult> {
    return {
      isValid: false,
      expirationDate: null,
      licenseType,
      holderName: '',
      status: 'not_found',
      verifiedAt: new Date(),
      rawResponse: {
        state: 'TX',
        message: 'API integration pending - manual verification required',
        licenseNumber,
        apiEndpoint: config.baseUrl,
      },
    };
  }

  /**
   * Florida DBPR API integration
   */
  private static async verifyFloridaLicense(
    licenseNumber: string,
    licenseType: string,
    config: { baseUrl: string; apiKey?: string; name: string }
  ): Promise<LicenseResult> {
    return {
      isValid: false,
      expirationDate: null,
      licenseType,
      holderName: '',
      status: 'not_found',
      verifiedAt: new Date(),
      rawResponse: {
        state: 'FL',
        message: 'API integration pending - manual verification required',
        licenseNumber,
        apiEndpoint: config.baseUrl,
      },
    };
  }

  /**
   * New York DOS API integration
   */
  private static async verifyNewYorkLicense(
    licenseNumber: string,
    licenseType: string,
    config: { baseUrl: string; apiKey?: string; name: string }
  ): Promise<LicenseResult> {
    return {
      isValid: false,
      expirationDate: null,
      licenseType,
      holderName: '',
      status: 'not_found',
      verifiedAt: new Date(),
      rawResponse: {
        state: 'NY',
        message: 'API integration pending - manual verification required',
        licenseNumber,
        apiEndpoint: config.baseUrl,
      },
    };
  }
}