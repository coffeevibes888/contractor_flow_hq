'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Thermometer, Truck, Car } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';

const commercialSchema = z.object({
  zoningType: z.string().min(1, 'Zoning type is required'),
  permittedUses: z.array(z.string()),
  leaseType: z.enum(['nnn', 'gross', 'modified_gross']).optional(),
  camCharges: z.number().min(0).optional().nullable(),
  tenantImprovement: z.number().min(0).optional().nullable(),
  electricalCapacity: z.string().optional(),
  hvacType: z.string().optional(),
  loadingDock: z.boolean(),
  parkingSpaces: z.number().min(0).optional().nullable(),
});

type CommercialFormData = z.infer<typeof commercialSchema>;

interface CommercialDetailsStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

const ZONING_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'flex', label: 'Flex Space' },
];

const PERMITTED_USES = [
  'Retail Store', 'Restaurant', 'Office', 'Medical Office', 'Warehouse',
  'Manufacturing', 'Distribution', 'Showroom', 'Service Business', 'Gym/Fitness',
];

const LEASE_TYPES = [
  { value: 'nnn', label: 'Triple Net (NNN)', description: 'Tenant pays taxes, insurance, maintenance' },
  { value: 'gross', label: 'Gross Lease', description: 'Landlord pays all operating expenses' },
  { value: 'modified_gross', label: 'Modified Gross', description: 'Shared operating expenses' },
];

export function CommercialDetailsStep({ setValidate }: CommercialDetailsStepProps) {
  const { state, updateFormData } = useWizard();
  const isInitialMount = useRef(true);

  const form = useForm<CommercialFormData>({
    resolver: zodResolver(commercialSchema),
    defaultValues: {
      zoningType: state.formData.zoningType || '',
      permittedUses: state.formData.permittedUses || [],
      leaseType: state.formData.leaseType || undefined,
      camCharges: state.formData.camCharges ?? null,
      tenantImprovement: state.formData.tenantImprovement ?? null,
      electricalCapacity: state.formData.electricalCapacity || '',
      hvacType: state.formData.hvacType || '',
      loadingDock: state.formData.loadingDock ?? false,
      parkingSpaces: state.formData.parkingSpaces ?? null,
    },
  });

  const { register, watch, setValue, formState: { errors } } = form;
  
  // Watch individual fields
  const zoningType = watch('zoningType');
  const permittedUses = watch('permittedUses');
  const leaseType = watch('leaseType');
  const camCharges = watch('camCharges');
  const tenantImprovement = watch('tenantImprovement');
  const electricalCapacity = watch('electricalCapacity');
  const hvacType = watch('hvacType');
  const loadingDock = watch('loadingDock');
  const parkingSpaces = watch('parkingSpaces');

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    updateFormData({
      zoningType,
      permittedUses,
      leaseType,
      camCharges: camCharges ?? undefined,
      tenantImprovement: tenantImprovement ?? undefined,
      electricalCapacity,
      hvacType,
      loadingDock,
      parkingSpaces: parkingSpaces ?? undefined,
    });
  }, [zoningType, permittedUses, leaseType, camCharges, tenantImprovement, electricalCapacity, hvacType, loadingDock, parkingSpaces, updateFormData]);

  const validate = useCallback((): boolean => {
    return !!zoningType;
  }, [zoningType]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const togglePermittedUse = (use: string) => {
    const current = permittedUses || [];
    if (current.includes(use)) {
      setValue('permittedUses', current.filter(u => u !== use));
    } else {
      setValue('permittedUses', [...current, use]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Commercial Details</h2>
        <p className="text-gray-500 mt-2">
          Provide details specific to commercial properties
        </p>
      </div>

      {/* Zoning & Lease Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-700">Zoning Type</Label>
          <Select
            value={zoningType}
            onValueChange={(v) => setValue('zoningType', v)}
          >
            <SelectTrigger className="bg-white border-gray-200 text-gray-900">
              <SelectValue placeholder="Select zoning..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {ZONING_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-gray-900">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.zoningType && (
            <p className="text-sm text-red-400">{errors.zoningType.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Lease Type</Label>
          <Select
            value={leaseType || ''}
            onValueChange={(v) => setValue('leaseType', v as CommercialFormData['leaseType'])}
          >
            <SelectTrigger className="bg-white border-gray-200 text-gray-900">
              <SelectValue placeholder="Select lease type..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {LEASE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-gray-900">
                  <div>
                    <p>{type.label}</p>
                    <p className="text-xs text-gray-400">{type.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Permitted Uses */}
      <div className="space-y-3">
        <Label className="text-gray-700">Permitted Uses</Label>
        <div className="flex flex-wrap gap-2">
          {PERMITTED_USES.map((use) => {
            const isSelected = permittedUses?.includes(use);
            return (
              <button
                key={use}
                type="button"
                onClick={() => togglePermittedUse(use)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-all',
                  isSelected
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                )}
              >
                {use}
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-700">CAM Charges ($/sq ft/year)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="e.g., 8.50"
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            {...register('camCharges', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Tenant Improvement Allowance ($)</Label>
          <Input
            type="number"
            min={0}
            placeholder="e.g., 25000"
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            {...register('tenantImprovement', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Utilities & Infrastructure */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Utilities & Infrastructure</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Electrical Capacity
            </Label>
            <Input
              placeholder="e.g., 200 amp, 3-phase"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('electricalCapacity')}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-blue-400" />
              HVAC Type
            </Label>
            <Input
              placeholder="e.g., Central, Rooftop units"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('hvacType')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <Car className="h-4 w-4 text-gray-400" />
              Parking Spaces
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="Number of spaces"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register('parkingSpaces', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="font-medium text-gray-900">Loading Dock</p>
                <p className="text-xs text-gray-400">Truck loading/unloading area</p>
              </div>
            </div>
            <Switch
              checked={loadingDock}
              onCheckedChange={(checked) => setValue('loadingDock', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
