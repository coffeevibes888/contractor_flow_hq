'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TenantDetectionModal } from './tenant-detection-modal';
import type { TenantInfo } from '@/types/tenant-lifecycle';

interface UnitAvailabilityToggleProps {
  unitId: string;
  unitName: string;
  isAvailable: boolean;
  hasActiveLease?: boolean;
  tenantName?: string;
  leaseId?: string;
  onToggle?: (newValue: boolean) => void;
}

export function UnitAvailabilityToggle({
  unitId,
  unitName,
  isAvailable,
  hasActiveLease = false,
  tenantName,
  leaseId,
  onToggle,
}: UnitAvailabilityToggleProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(isAvailable);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [pendingAvailability, setPendingAvailability] = useState<boolean | null>(null);

  // Create tenant and unit objects for the modal
  const tenantInfo: TenantInfo = {
    tenantId: '',
    tenantName: tenantName || 'Unknown Tenant',
    tenantEmail: '',
    unitId,
    unitName,
    leaseId: leaseId || '',
  };

  const unitInfo = {
    id: unitId,
    name: unitName,
    isAvailable: available,
  };

  const handleToggle = async (checked: boolean) => {
    // If trying to make available and there's an active lease, show tenant detection modal
    if (checked && hasActiveLease) {
      setPendingAvailability(checked);
      setShowTenantModal(true);
      return;
    }

    await updateAvailability(checked);
  };

  const updateAvailability = async (newValue: boolean, forceTerminate = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/units/${unitId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAvailable: newValue,
          forceTerminate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check if lease is required
        if (data.requiresLease) {
          toast({
            title: 'Lease Required',
            description: 'You must assign a lease template to this property before listing units.',
            variant: 'destructive',
            action: (
              <button
                onClick={() => router.push('/admin/legal-documents')}
                className="bg-white text-slate-900 px-3 py-1 rounded text-sm font-medium hover:bg-slate-100"
              >
                Add Lease
              </button>
            ),
          });
          return;
        }
        
        // If there's an active tenant and we didn't force terminate
        if (data.hasTenant && !forceTerminate) {
          setPendingAvailability(newValue);
          setShowTenantModal(true);
          return;
        }
        throw new Error(data.error || data.message || 'Failed to update availability');
      }

      setAvailable(newValue);
      onToggle?.(newValue);

      if (!newValue) {
        toast({
          title: 'Unit marked occupied',
          description: `${unitName} is now hidden from listings`,
        });
      } else if (data.autoPublished) {
        toast({
          title: '✓ Unit available — property now live',
          description: `${unitName} is available and your property is now visible in public listings.`,
        });
      } else if (newValue) {
        // Available but property may still be a draft (no photos yet)
        toast({
          title: 'Unit marked available',
          description: data.propertyNeedsPhotos
            ? `${unitName} is available, but your property needs photos before it will appear in listings.`
            : `${unitName} is now available for listing.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update availability',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTenantModalClose = () => {
    setShowTenantModal(false);
    setPendingAvailability(null);
  };

  const handleConfirmDeparture = (departed: boolean) => {
    if (!departed) {
      // Tenant hasn't left, don't change availability
      setShowTenantModal(false);
      setPendingAvailability(null);
    }
    // If departed, the modal will continue to termination step
  };

  const handleConfirmTermination = async (terminate: boolean) => {
    setShowTenantModal(false);
    
    if (terminate && pendingAvailability !== null) {
      // After handling the tenant situation, update availability
      await updateAvailability(pendingAvailability, true);
    }
    setPendingAvailability(null);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <Switch
            checked={available}
            onCheckedChange={handleToggle}
            disabled={loading}
            className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-600"
          />
        )}
        <span className={`text-xs ${available ? 'text-emerald-400' : 'text-slate-400'}`}>
          {available ? 'Available' : 'Occupied'}
        </span>
      </div>

      {hasActiveLease && (
        <TenantDetectionModal
          isOpen={showTenantModal}
          onClose={handleTenantModalClose}
          tenant={tenantInfo}
          unit={unitInfo as any}
          onConfirmDeparture={handleConfirmDeparture}
          onConfirmTermination={handleConfirmTermination}
        />
      )}
    </>
  );
}
