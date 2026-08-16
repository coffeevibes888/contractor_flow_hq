/**
 * Verification Badge Display Service
 * Determines which verification badges should be displayed for a contractor
 */

export interface VerificationStatus {
  // License verification
  licenseVerifiedAt: Date | null;
  licenseExpiresAt: Date | null;
  
  // Insurance verification
  insuranceCertificateUrl: string | null;
  insuranceExpiry: Date | null;
  
  // Background check
  backgroundCheckDate: Date | null;
  backgroundCheckExpires: Date | null;
  
  // Identity verification
  identityVerifiedAt: Date | null;
}

export interface BadgeDisplay {
  showLicenseBadge: boolean;
  showInsuranceBadge: boolean;
  showBackgroundCheckBadge: boolean;
  showIdentityBadge: boolean;
}

/**
 * Determines which verification badges should be displayed
 * A badge is displayed if and only if:
 * 1. The verification is completed (has verification date/data)
 * 2. The verification is not expired (if it has an expiration date)
 */
export class VerificationBadgeService {
  /**
   * Check if a verification is valid (completed and not expired)
   */
  private isVerificationValid(
    verifiedAt: Date | null,
    expiresAt: Date | null,
    currentDate: Date = new Date()
  ): boolean {
    // Must have verification date
    if (!verifiedAt) {
      return false;
    }
    
    // If no expiration date, verification is valid
    if (!expiresAt) {
      return true;
    }
    
    // Check if not expired
    return expiresAt > currentDate;
  }

  /**
   * Determine which badges should be displayed for a contractor
   */
  getBadgeDisplay(
    status: VerificationStatus,
    currentDate: Date = new Date()
  ): BadgeDisplay {
    return {
      showLicenseBadge: this.isVerificationValid(
        status.licenseVerifiedAt,
        status.licenseExpiresAt,
        currentDate
      ),
      showInsuranceBadge: this.isVerificationValid(
        status.insuranceCertificateUrl ? new Date() : null, // If cert exists, consider it verified
        status.insuranceExpiry,
        currentDate
      ),
      showBackgroundCheckBadge: this.isVerificationValid(
        status.backgroundCheckDate,
        status.backgroundCheckExpires,
        currentDate
      ),
      showIdentityBadge: this.isVerificationValid(
        status.identityVerifiedAt,
        null, // Identity verification doesn't expire
        currentDate
      ),
    };
  }

  /**
   * Get all active badges (returns array of badge names)
   */
  getActiveBadges(
    status: VerificationStatus,
    currentDate: Date = new Date()
  ): string[] {
    const display = this.getBadgeDisplay(status, currentDate);
    const badges: string[] = [];
    
    if (display.showLicenseBadge) badges.push('Licensed');
    if (display.showInsuranceBadge) badges.push('Insured');
    if (display.showBackgroundCheckBadge) badges.push('Background Checked');
    if (display.showIdentityBadge) badges.push('Identity Verified');
    
    return badges;
  }
}
