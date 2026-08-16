'use client';

import { Badge } from '@/components/ui/badge';
import { Shield, FileCheck, UserCheck, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgesProps {
  licenseVerifiedAt?: Date | null;
  licenseExpiresAt?: Date | null;
  insuranceCertificateUrl?: string | null;
  insuranceProvider?: string | null;
  backgroundCheckDate?: Date | null;
  backgroundCheckExpires?: Date | null;
  identityVerifiedAt?: Date | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export function VerificationBadges({
  licenseVerifiedAt,
  licenseExpiresAt,
  insuranceCertificateUrl,
  insuranceProvider,
  backgroundCheckDate,
  backgroundCheckExpires,
  identityVerifiedAt,
  className,
  size = 'md',
  showLabels = true,
}: VerificationBadgesProps) {
  const now = new Date();

  // Check if license is valid and not expired
  const isLicenseValid = licenseVerifiedAt && licenseExpiresAt && new Date(licenseExpiresAt) > now;

  // Check if insurance is valid (has certificate and provider)
  const isInsuranceValid = insuranceCertificateUrl && insuranceProvider;

  // Check if background check is valid and not expired
  const isBackgroundCheckValid =
    backgroundCheckDate && backgroundCheckExpires && new Date(backgroundCheckExpires) > now;

  // Check if identity is verified
  const isIdentityVerified = identityVerifiedAt;

  // If no badges to show, return null
  if (!isLicenseValid && !isInsuranceValid && !isBackgroundCheckValid && !isIdentityVerified) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {isLicenseValid && (
        <Badge
          variant="default"
          className={cn(
            'bg-blue-500 hover:bg-blue-600 text-white border-0',
            sizeClasses[size]
          )}
        >
          <Award className="mr-1" size={iconSizes[size]} />
          {showLabels && 'Licensed'}
        </Badge>
      )}

      {isInsuranceValid && (
        <Badge
          variant="default"
          className={cn(
            'bg-green-500 hover:bg-green-600 text-white border-0',
            sizeClasses[size]
          )}
        >
          <Shield className="mr-1" size={iconSizes[size]} />
          {showLabels && 'Insured'}
        </Badge>
      )}

      {isBackgroundCheckValid && (
        <Badge
          variant="default"
          className={cn(
            'bg-purple-500 hover:bg-purple-600 text-white border-0',
            sizeClasses[size]
          )}
        >
          <FileCheck className="mr-1" size={iconSizes[size]} />
          {showLabels && 'Background Checked'}
        </Badge>
      )}

      {isIdentityVerified && (
        <Badge
          variant="default"
          className={cn(
            'bg-amber-500 hover:bg-amber-600 text-white border-0',
            sizeClasses[size]
          )}
        >
          <UserCheck className="mr-1" size={iconSizes[size]} />
          {showLabels && 'Identity Verified'}
        </Badge>
      )}
    </div>
  );
}
