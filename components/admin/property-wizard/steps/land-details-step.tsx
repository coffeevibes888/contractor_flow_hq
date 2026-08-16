'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TreePine, Droplets, Zap, Route, Mountain, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';

const landSchema = z.object({
  lotSize: z.number().min(0.01, 'Lot size is required'),
  lotSizeUnit: z.enum(['acres', 'sqft']),
  zoningType: z.string().optional(),
  topography: z.string().optional(),
  roadAccess: z.boolean(),
  waterAvailable: z.boolean(),
  sewerAvailable: z.boolean(),
  electricAvailable: z.boolean(),
  gasAvailable: z.boolean(),
  improvements: z.string().optional(),
});

type LandFormData = z.infer<typeof landSchema>;

interface LandDetailsStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

const ZONING_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'unzoned', label: 'Unzoned' },
];

const TOPOGRAPHY_OPTIONS = [
  { value: 'flat', label: 'Flat/Level' },
  { value: 'gentle_slope', label: 'Gentle Slope' },
  { value: 'moderate_slope', label: 'Moderate Slope' },
  { value: 'steep', label: 'Steep' },
  { value: 'varied', label: 'Varied Terrain' },
];

export function LandDetailsStep({ setValidate }: LandDetailsStepProps) {
  const { state, updateFormData } = useWizard();
  const isInitialMount = useRef(true);

  const form = useForm<LandFormData>({
    resolver: zodResolver(landSchema),
    defaultValues: {
      lotSize: state.formData.lotSize ?? undefined,
      lotSizeUnit: 'acres',
      zoningType: state.formData.zoningType || '',
      topography: '',
      roadAccess: true,
      waterAvailable: false,
      sewerAvailable: false,
      electricAvailable: false,
      gasAvailable: false,
      improvements: '',
    },
  });

  const { register, watch, setValue, formState: { errors }, getValues } = form;
  
  // Watch individual fields
  const lotSize = watch('lotSize');
  const lotSizeUnit = watch('lotSizeUnit');
  const zoningType = watch('zoningType');
  const topography = watch('topography');
  const roadAccess = watch('roadAccess');
  const waterAvailable = watch('waterAvailable');
  const sewerAvailable = watch('sewerAvailable');
  const electricAvailable = watch('electricAvailable');
  const gasAvailable = watch('gasAvailable');

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    updateFormData({
      lotSize,
      zoningType,
    });
  }, [lotSize, zoningType, updateFormData]);

  const validate = useCallback((): boolean => {
    const values = getValues();
    return values.lotSize > 0;
  }, [getValues]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const utilities = [
    { key: 'roadAccess', label: 'Road Access', icon: Route, color: 'text-gray-400', value: roadAccess },
    { key: 'waterAvailable', label: 'Water', icon: Droplets, color: 'text-blue-400', value: waterAvailable },
    { key: 'sewerAvailable', label: 'Sewer', icon: Building2, color: 'text-amber-400', value: sewerAvailable },
    { key: 'electricAvailable', label: 'Electric', icon: Zap, color: 'text-yellow-400', value: electricAvailable },
    { key: 'gasAvailable', label: 'Natural Gas', icon: Zap, color: 'text-orange-400', value: gasAvailable },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Land Details</h2>
        <p className="text-gray-500 mt-2">
          Provide details about the land parcel
        </p>
      </div>

      {/* Lot Size */}
      <div className="space-y-2">
        <Label className="text-gray-700 flex items-center gap-2">
          <TreePine className="h-4 w-4 text-green-400" />
          Lot Size
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0.01}
            step={0.01}
            placeholder="e.g., 2.5"
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 flex-1"
            {...register('lotSize', { valueAsNumber: true })}
          />
          <Select
            value={lotSizeUnit}
            onValueChange={(v) => setValue('lotSizeUnit', v as 'acres' | 'sqft')}
          >
            <SelectTrigger className="w-32 bg-white border-gray-200 text-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="acres" className="text-gray-900">Acres</SelectItem>
              <SelectItem value="sqft" className="text-gray-900">Sq Ft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {errors.lotSize && (
          <p className="text-sm text-red-400">{errors.lotSize.message}</p>
        )}
      </div>

      {/* Zoning & Topography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-700">Zoning</Label>
          <Select
            value={zoningType || ''}
            onValueChange={(v) => setValue('zoningType', v)}
          >
            <SelectTrigger className="bg-white border-gray-200 text-gray-900">
              <SelectValue placeholder="Select zoning..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {ZONING_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-gray-900">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center gap-2">
            <Mountain className="h-4 w-4 text-emerald-400" />
            Topography
          </Label>
          <Select
            value={topography || ''}
            onValueChange={(v) => setValue('topography', v)}
          >
            <SelectTrigger className="bg-white border-gray-200 text-gray-900">
              <SelectValue placeholder="Select terrain..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {TOPOGRAPHY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-gray-900">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Utilities */}
      <div className="space-y-3">
        <Label className="text-gray-700">Utilities & Access</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {utilities.map((utility) => {
            const Icon = utility.icon;

            return (
              <div
                key={utility.key}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all',
                  utility.value
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-gray-200 bg-gray-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', utility.color)} />
                  <span className="text-sm text-gray-700">{utility.label}</span>
                </div>
                <Switch
                  checked={utility.value}
                  onCheckedChange={(checked) => setValue(utility.key as keyof LandFormData, checked)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Improvements */}
      <div className="space-y-2">
        <Label className="text-gray-700">Existing Improvements (Optional)</Label>
        <Textarea
          placeholder="Describe any existing structures, fencing, wells, septic systems, etc."
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 min-h-[100px]"
          {...register('improvements')}
        />
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-3">Land Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Size</p>
            <p className="text-gray-900 font-medium">
              {lotSize ? `${lotSize} ${lotSizeUnit}` : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Zoning</p>
            <p className="text-gray-900 font-medium">
              {ZONING_OPTIONS.find(z => z.value === zoningType)?.label || 'Not set'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500">Available Utilities</p>
            <p className="text-gray-900 font-medium">
              {utilities.filter(u => u.value).map(u => u.label).join(', ') || 'None specified'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
