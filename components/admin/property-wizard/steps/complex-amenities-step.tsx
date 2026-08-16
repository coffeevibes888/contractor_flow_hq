'use client';

import { useEffect, useCallback, useState } from 'react';
import { 
  Waves, Dumbbell, Car, Shield, Wifi, Trees, Dog, 
  Utensils, Package, Gamepad2, Baby, Briefcase, Plus, X 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';

interface ComplexAmenitiesStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

const COMPLEX_AMENITIES = [
  { id: 'pool', label: 'Swimming Pool', icon: Waves, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'gym', label: 'Fitness Center', icon: Dumbbell, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  { id: 'parking', label: 'Covered Parking', icon: Car, color: 'text-slate-400', bg: 'bg-slate-500/20' },
  { id: 'security', label: '24/7 Security', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  { id: 'wifi', label: 'Community WiFi', icon: Wifi, color: 'text-violet-400', bg: 'bg-violet-500/20' },
  { id: 'courtyard', label: 'Courtyard/Garden', icon: Trees, color: 'text-green-400', bg: 'bg-green-500/20' },
  { id: 'dog_park', label: 'Dog Park', icon: Dog, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { id: 'bbq', label: 'BBQ Area', icon: Utensils, color: 'text-red-400', bg: 'bg-red-500/20' },
  { id: 'package', label: 'Package Lockers', icon: Package, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  { id: 'game_room', label: 'Game Room', icon: Gamepad2, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  { id: 'playground', label: 'Playground', icon: Baby, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { id: 'business', label: 'Business Center', icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
];

export function ComplexAmenitiesStep({ setValidate }: ComplexAmenitiesStepProps) {
  const { state, updateFormData } = useWizard();
  const [customAmenity, setCustomAmenity] = useState('');

  const selectedAmenities = state.formData.complexAmenities || [];

  const validate = useCallback(() => {
    // This step is always valid - amenities are optional
    return true;
  }, []);

  useEffect(() => {
    setValidate(() => validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const toggleAmenity = (amenityId: string) => {
    const newAmenities = selectedAmenities.includes(amenityId)
      ? selectedAmenities.filter(a => a !== amenityId)
      : [...selectedAmenities, amenityId];
    updateFormData({ complexAmenities: newAmenities });
  };

  const addCustomAmenity = () => {
    if (customAmenity.trim() && !selectedAmenities.includes(customAmenity.trim())) {
      updateFormData({ complexAmenities: [...selectedAmenities, customAmenity.trim()] });
      setCustomAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    updateFormData({ complexAmenities: selectedAmenities.filter(a => a !== amenity) });
  };

  const getAmenityLabel = (id: string) => {
    const found = COMPLEX_AMENITIES.find(a => a.id === id);
    return found?.label || id;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Complex Amenities</h2>
        <p className="text-gray-500 mt-2">
          Select the amenities available at your apartment complex
        </p>
      </div>

      {/* Amenities Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {COMPLEX_AMENITIES.map((amenity) => {
          const Icon = amenity.icon;
          const isSelected = selectedAmenities.includes(amenity.id);

          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => toggleAmenity(amenity.id)}
              className={cn(
                'flex flex-col items-center p-4 rounded-xl border-2 transition-all',
                isSelected
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-2', amenity.bg)}>
                <Icon className={cn('h-6 w-6', amenity.color)} />
              </div>
              <span className={cn(
                'text-sm font-medium text-center',
                isSelected ? 'text-gray-900' : 'text-gray-600'
              )}>
                {amenity.label}
              </span>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Amenities */}
      <div className="space-y-3">
        <Label className="text-gray-700">Additional Amenities</Label>
        
        {/* Show custom amenities (ones not in the predefined list) */}
        {selectedAmenities.filter(a => !COMPLEX_AMENITIES.find(ca => ca.id === a)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedAmenities
              .filter(a => !COMPLEX_AMENITIES.find(ca => ca.id === a))
              .map((amenity) => (
                <Badge
                  key={amenity}
                  variant="secondary"
                  className="bg-gray-100 text-gray-700 px-3 py-1"
                >
                  {amenity}
                  <button
                    type="button"
                    onClick={() => removeAmenity(amenity)}
                    className="ml-2 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={customAmenity}
            onChange={(e) => setCustomAmenity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
            placeholder="e.g., Rooftop Deck, Concierge..."
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustomAmenity}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      {selectedAmenities.length > 0 && (
        <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/30 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3">Selected Amenities ({selectedAmenities.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedAmenities.map((amenity) => (
              <Badge
                key={amenity}
                className="bg-violet-500/20 text-violet-300 border border-violet-500/30"
              >
                {getAmenityLabel(amenity)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
