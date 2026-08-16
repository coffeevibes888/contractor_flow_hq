'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Check } from 'lucide-react';

// Common property-level amenities
export const PROPERTY_AMENITIES = [
  'Swimming Pool',
  'Fitness Center',
  'Clubhouse',
  'Business Center',
  'Package Lockers',
  'Covered Parking',
  'Garage Parking',
  'EV Charging',
  'Laundry Facility',
  'Dog Park',
  'Playground',
  'BBQ Area',
  'Rooftop Deck',
  'Concierge',
  '24/7 Security',
  'Gated Community',
  'Storage Units',
  'Bike Storage',
  'Trash Valet',
  'On-Site Management',
];

// Common unit-level amenities
export const UNIT_AMENITIES = [
  'In-Unit Washer/Dryer',
  'Washer/Dryer Hookups',
  'Dishwasher',
  'Microwave',
  'Stainless Steel Appliances',
  'Granite Countertops',
  'Hardwood Floors',
  'Carpet',
  'Tile Floors',
  'Walk-In Closet',
  'Balcony',
  'Patio',
  'Fireplace',
  'Central A/C',
  'Central Heat',
  'Ceiling Fans',
  'High Ceilings',
  'Large Windows',
  'City View',
  'Garden View',
  'Pet Friendly',
  'Furnished',
  'Smart Home Features',
  'USB Outlets',
];

interface AmenitiesSelectorProps {
  value: string[];
  onChange: (amenities: string[]) => void;
  type: 'property' | 'unit';
  label?: string;
}

export function AmenitiesSelector({ value, onChange, type, label }: AmenitiesSelectorProps) {
  const [customAmenity, setCustomAmenity] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  const suggestions = type === 'property' ? PROPERTY_AMENITIES : UNIT_AMENITIES;
  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, 12);

  const toggleAmenity = (amenity: string) => {
    if (value.includes(amenity)) {
      onChange(value.filter(a => a !== amenity));
    } else {
      onChange([...value, amenity]);
    }
  };

  const addCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setCustomAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    onChange(value.filter(a => a !== amenity));
  };

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-200">{label}</label>
      )}
      
      {/* Selected amenities */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((amenity) => (
            <Badge
              key={amenity}
              variant="secondary"
              className="bg-violet-500/20 text-violet-200 border-violet-400/30 pr-1"
            >
              {amenity}
              <button
                type="button"
                onClick={() => removeAmenity(amenity)}
                className="ml-1 p-0.5 rounded hover:bg-violet-500/30"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Quick select suggestions */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400">Quick add:</p>
        <div className="flex flex-wrap gap-2">
          {displayedSuggestions.map((amenity) => {
            const isSelected = value.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                  isSelected
                    ? 'bg-violet-500/30 text-violet-200 border border-violet-400/50'
                    : 'bg-slate-800 text-slate-300 border border-white/10 hover:border-white/20'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                {amenity}
              </button>
            );
          })}
        </div>
        {suggestions.length > 12 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            {showAll ? 'Show less' : `Show ${suggestions.length - 12} more...`}
          </button>
        )}
      </div>

      {/* Custom amenity input */}
      <div className="flex gap-2">
        <Input
          value={customAmenity}
          onChange={(e) => setCustomAmenity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
          placeholder="Add custom amenity..."
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400 text-sm"
        />
        <Button
          type="button"
          onClick={addCustomAmenity}
          disabled={!customAmenity.trim()}
          size="sm"
          className="bg-violet-600 hover:bg-violet-500"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
