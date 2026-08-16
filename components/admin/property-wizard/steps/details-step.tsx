'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bed, Bath, Square, Calendar, Dog, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';

const detailsSchema = z.object({
  bedrooms: z.number().min(0, 'Bedrooms must be 0 or more').max(20),
  bathrooms: z.number().min(0.5, 'At least 0.5 bathrooms required').max(10),
  sizeSqFt: z.number().min(100, 'Size must be at least 100 sq ft').optional().nullable(),
  yearBuilt: z.number().min(1800).max(new Date().getFullYear()).optional().nullable(),
  lotSize: z.number().min(0).optional().nullable(),
  petPolicy: z.enum(['allowed', 'not_allowed', 'case_by_case']),
  amenities: z.array(z.string()),
});

type DetailsFormData = z.infer<typeof detailsSchema>;

interface DetailsStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

const COMMON_AMENITIES = [
  'Air Conditioning', 'Heating', 'Washer/Dryer', 'Dishwasher', 'Parking',
  'Garage', 'Pool', 'Gym', 'Balcony', 'Patio', 'Fireplace', 'Storage',
  'Hardwood Floors', 'Carpet', 'Stainless Steel Appliances', 'Granite Counters',
  'Walk-in Closet', 'High Ceilings', 'Natural Light', 'City View',
];

export function DetailsStep({ setValidate }: DetailsStepProps) {
  const { state, updateFormData } = useWizard();
  const [customAmenity, setCustomAmenity] = useState('');
  const isInitialMount = useRef(true);

  const form = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      bedrooms: state.formData.bedrooms ?? 1,
      bathrooms: state.formData.bathrooms ?? 1,
      sizeSqFt: state.formData.sizeSqFt ?? null,
      yearBuilt: state.formData.yearBuilt ?? null,
      lotSize: state.formData.lotSize ?? null,
      petPolicy: state.formData.petPolicy ?? 'case_by_case',
      amenities: state.formData.amenities ?? [],
    },
  });

  const { register, watch, setValue, formState: { errors }, getValues } = form;
  
  // Watch individual fields
  const bedrooms = watch('bedrooms');
  const bathrooms = watch('bathrooms');
  const sizeSqFt = watch('sizeSqFt');
  const yearBuilt = watch('yearBuilt');
  const lotSize = watch('lotSize');
  const petPolicy = watch('petPolicy');
  const amenities = watch('amenities');

  // Update wizard state when form values change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    updateFormData({
      bedrooms,
      bathrooms,
      sizeSqFt: sizeSqFt ?? undefined,
      yearBuilt: yearBuilt ?? undefined,
      lotSize: lotSize ?? undefined,
      petPolicy,
      amenities,
    });
  }, [bedrooms, bathrooms, sizeSqFt, yearBuilt, lotSize, petPolicy, amenities, updateFormData]);

  const validate = useCallback(() => {
    const formState = getValues();
    return formState.bedrooms !== undefined && formState.bathrooms !== undefined;
  }, [getValues]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const toggleAmenity = (amenity: string) => {
    const current = amenities || [];
    if (current.includes(amenity)) {
      setValue('amenities', current.filter(a => a !== amenity));
    } else {
      setValue('amenities', [...current, amenity]);
    }
  };

  const addCustomAmenity = () => {
    if (customAmenity.trim() && !amenities?.includes(customAmenity.trim())) {
      setValue('amenities', [...(amenities || []), customAmenity.trim()]);
      setCustomAmenity('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Property Details</h2>
        <p className="text-gray-700 mt-2">
          Tell us more about the property features
        </p>
      </div>

      {/* Bedrooms & Bathrooms */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center gap-2">
            <Bed className="h-4 w-4 text-violet-400" />
            Bedrooms
          </Label>
          <Input
            type="number"
            min={0}
            max={20}
            className="bg-white border-gray-200 text-gray-900"
            {...register('bedrooms', { valueAsNumber: true })}
          />
          {errors.bedrooms && (
            <p className="text-sm text-red-400">{errors.bedrooms.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center gap-2">
            <Bath className="h-4 w-4 text-violet-400" />
            Bathrooms
          </Label>
          <Input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            className="bg-white border-gray-200 text-gray-900"
            {...register('bathrooms', { valueAsNumber: true })}
          />
          {errors.bathrooms && (
            <p className="text-sm text-red-400">{errors.bathrooms.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center gap-2">
            <Square className="h-4 w-4 text-violet-400" />
            Size (sq ft)
          </Label>
          <Input
            type="number"
            min={100}
            placeholder="Optional"
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            {...register('sizeSqFt', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-400" />
            Year Built
          </Label>
          <Input
            type="number"
            min={1800}
            max={new Date().getFullYear()}
            placeholder="Optional"
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            {...register('yearBuilt', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Pet Policy */}
      <div className="space-y-3">
        <Label className="text-gray-700 flex items-center gap-2">
          <Dog className="h-4 w-4 text-violet-400" />
          Pet Policy
        </Label>
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'allowed', label: 'Pets Allowed', icon: '🐾' },
            { value: 'not_allowed', label: 'No Pets', icon: '🚫' },
            { value: 'case_by_case', label: 'Case by Case', icon: '🤔' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('petPolicy', option.value as DetailsFormData['petPolicy'])}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all',
                petPolicy === option.value
                  ? 'border-violet-500 bg-violet-500/20 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300'
              )}
            >
              <span>{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-4">
        <Label className="text-gray-700">Amenities</Label>
        
        {/* Selected amenities */}
        {amenities && amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            {amenities.map((amenity) => (
              <Badge
                key={amenity}
                variant="secondary"
                className="bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1"
              >
                {amenity}
                <button
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className="ml-2 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Common amenities grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {COMMON_AMENITIES.map((amenity) => {
            const isSelected = amenities?.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm transition-all text-left',
                  isSelected
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300 hover:text-gray-900'
                )}
              >
                {amenity}
              </button>
            );
          })}
        </div>

        {/* Custom amenity input */}
        <div className="flex gap-2">
          <Input
            placeholder="Add custom amenity..."
            value={customAmenity}
            onChange={(e) => setCustomAmenity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustomAmenity}
            className="border-gray-300 text-gray-900 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
