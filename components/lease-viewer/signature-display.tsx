'use client';

import { cn } from '@/lib/utils';
import { Check, Clock, User } from 'lucide-react';

export interface EmbeddedSignature {
  fieldId: string;
  type: 'signature' | 'initial';
  imageDataUrl: string;
  signedBy: string;
  signedAt: Date;
  role: 'tenant' | 'landlord';
}

export interface SignatureDisplayProps {
  signature: EmbeddedSignature;
  className?: string;
  variant?: 'inline' | 'block' | 'compact';
  showDetails?: boolean;
}

export function SignatureDisplay({
  signature,
  className,
  variant = 'inline',
  showDetails = true,
}: SignatureDisplayProps) {
  const formattedDate = new Date(signature.signedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(signature.signedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <img
          src={signature.imageDataUrl}
          alt={`${signature.type === 'signature' ? 'Signature' : 'Initials'} by ${signature.signedBy}`}
          className={cn(
            'object-contain',
            signature.type === 'signature' ? 'h-8' : 'h-5'
          )}
        />
        {showDetails && (
          <span className="text-xs text-gray-500">
            {signature.signedBy}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-2 px-2 py-1 rounded-md',
          'bg-emerald-50 border border-emerald-200',
          className
        )}
      >
        <img
          src={signature.imageDataUrl}
          alt={`${signature.type === 'signature' ? 'Signature' : 'Initials'} by ${signature.signedBy}`}
          className={cn(
            'object-contain',
            signature.type === 'signature' ? 'h-8 max-w-[150px]' : 'h-5 max-w-[50px]'
          )}
        />
        {showDetails && (
          <span className="text-xs text-emerald-700 whitespace-nowrap">
            <Check className="inline h-3 w-3 mr-0.5" />
            {formattedDate}
          </span>
        )}
      </span>
    );
  }

  // Block variant - full signature card
  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm',
        'border-emerald-200',
        className
      )}
    >
      {/* Signature image */}
      <div className="flex justify-center mb-3">
        <div
          className={cn(
            'bg-gray-50 rounded-lg p-3 border border-gray-200',
            signature.type === 'signature' ? 'min-w-[200px]' : 'min-w-[80px]'
          )}
        >
          <img
            src={signature.imageDataUrl}
            alt={`${signature.type === 'signature' ? 'Signature' : 'Initials'} by ${signature.signedBy}`}
            className={cn(
              'object-contain mx-auto',
              signature.type === 'signature' ? 'h-12 max-w-[250px]' : 'h-8 max-w-[60px]'
            )}
          />
        </div>
      </div>

      {/* Signature details */}
      {showDetails && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{signature.signedBy}</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                signature.role === 'tenant'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              )}
            >
              {signature.role === 'tenant' ? 'Tenant' : 'Landlord'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>
              {formattedDate} at {formattedTime}
            </span>
          </div>

          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="h-4 w-4" />
            <span className="font-medium">
              {signature.type === 'signature' ? 'Signature verified' : 'Initials verified'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Component to display a list of all signatures on a document
 */
export interface SignatureListProps {
  signatures: EmbeddedSignature[];
  className?: string;
}

export function SignatureList({ signatures, className }: SignatureListProps) {
  const tenantSignatures = signatures.filter(s => s.role === 'tenant');
  const landlordSignatures = signatures.filter(s => s.role === 'landlord');

  if (signatures.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-sm font-semibold text-gray-700">Document Signatures</h3>

      {tenantSignatures.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Tenant</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {tenantSignatures.map((sig) => (
              <SignatureDisplay
                key={sig.fieldId}
                signature={sig}
                variant="block"
              />
            ))}
          </div>
        </div>
      )}

      {landlordSignatures.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Landlord</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {landlordSignatures.map((sig) => (
              <SignatureDisplay
                key={sig.fieldId}
                signature={sig}
                variant="block"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
