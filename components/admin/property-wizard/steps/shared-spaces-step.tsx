'use client';

import { useEffect, useCallback, useRef } from 'react';
import { UtensilsCrossed, Sofa, WashingMachine, Car, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';
import { SharedSpaceData } from '../types';
import { useState } from 'react';

interface SharedSpacesStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

const DEFAULT_SHARED_SPACES: SharedSpaceData = {
  hasKitchen: true,
  hasLivingRoom: true,
  hasLaundry: false,
  hasParking: false,
  parkingSpaces: undefined,
  additionalSpaces: [],
};

export function SharedSpacesStep({ setValidate }: SharedSpacesStepProps) {
  const { state, updateFormData } = useWizard();
  const [customSpace, setCustomSpace] = useState('');

  const sharedSpaces = state.formData.sharedSpaces || DEFAULT_SHARED_SPACES;

  const validate = useCallback(() => {
    // This step is always valid - shared spaces are optional
    return true;
  }, []);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const updateSharedSpaces = (updates: Partial<SharedSpaceData>) => {
    updateFormData({
      sharedSpaces: { ...sharedSpaces, ...updates },
    });
  };

  const addCustomSpace = () => {
    if (customSpace.trim() && !sharedSpaces.additionalSpaces.includes(customSpace.trim())) {
      updateSharedSpaces({
        additionalSpaces: [...sharedSpaces.additionalSpaces, customSpace.trim()],
      });
      setCustomSpace('');
    }
  };

  const removeCustomSpace = (space: string) => {
    updateSharedSpaces({
      additionalSpaces: sharedSpaces.additionalSpaces.filter(s => s !== space),
    });
  };

  const spaces = [
    {
      key: 'hasKitchen',
      label: 'Shared Kitchen',
      description: 'Tenants share a common kitchen',
      icon: UtensilsCrossed,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    },
    {
      key: 'hasLivingRoom',
      label: 'Living Room',
      description: 'Common living/lounge area',
      icon: Sofa,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      key: 'hasLaundry',
      label: 'Laundry',
      description: 'Washer/dryer available',
      icon: WashingMachine,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    },
    {
      key: 'hasParking',
      label: 'Parking',
      description: 'Parking spaces available',
      icon: Car,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Shared Spaces</h2>
        <p className="text-gray-500 mt-2">
          What common areas do tenants share?
        </p>
      </div>

      {/* Main Shared Spaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {spaces.map((space) => {
          const Icon = space.icon;
          const isEnabled = sharedSpaces[space.key as keyof SharedSpaceData] as boolean;

          return (
            <div
              key={space.key}
              className={cn(
                'rounded-xl border p-4 transition-all',
                isEnabled
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-gray-200 bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', space.bgColor)}>
                    <Icon className={cn('h-5 w-5', space.color)} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{space.label}</p>
                    <p className="text-xs text-gray-400">{space.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => updateSharedSpaces({ [space.key]: checked })}
                />
              </div>

              {/* Parking spaces input */}
              {space.key === 'hasParking' && isEnabled && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Label className="text-sm text-gray-600">Number of parking spaces</Label>
                  <Input
                    type="number"
                    min={1}
                    value={sharedSpaces.parkingSpaces || ''}
                    onChange={(e) => updateSharedSpaces({ parkingSpaces: parseInt(e.target.value) || undefined })}
                    placeholder="e.g., 2"
                    className="mt-1 bg-white border-gray-200 text-gray-900 h-9"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Spaces */}
      <div className="space-y-3">
        <Label className="text-gray-700">Additional Shared Spaces</Label>
        
        {sharedSpaces.additionalSpaces.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sharedSpaces.additionalSpaces.map((space) => (
              <Badge
                key={space}
                variant="secondary"
                className="bg-gray-100 text-gray-700 px-3 py-1"
              >
                {space}
                <button
                  type="button"
                  onClick={() => removeCustomSpace(space)}
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
            value={customSpace}
            onChange={(e) => setCustomSpace(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSpace())}
            placeholder="e.g., Backyard, Gym, Pool..."
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustomSpace}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/30 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-2">Shared Amenities Summary</h4>
        <div className="flex flex-wrap gap-2">
          {sharedSpaces.hasKitchen && (
            <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30">Kitchen</Badge>
          )}
          {sharedSpaces.hasLivingRoom && (
            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">Living Room</Badge>
          )}
          {sharedSpaces.hasLaundry && (
            <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Laundry</Badge>
          )}
          {sharedSpaces.hasParking && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Parking ({sharedSpaces.parkingSpaces || '?'} spaces)
            </Badge>
          )}
          {sharedSpaces.additionalSpaces.map((space) => (
            <Badge key={space} className="bg-gray-100 text-gray-600">{space}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
