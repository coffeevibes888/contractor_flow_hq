'use client';

import { useState, useTransition } from 'react';
import { updateContractorSpecialties } from '@/lib/actions/contractor-profile.actions';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const SPECIALTIES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Carpentry',
  'Painting',
  'Roofing',
  'Landscaping',
  'General Repairs',
  'Appliance Repair',
  'Flooring',
  'Drywall',
  'Tile Work',
  'Concrete',
  'Fencing',
  'Gutters',
  'Windows & Doors',
  'Pest Control',
  'Cleaning',
  'Moving',
  'Locksmith',
];

interface ContractorSpecialtiesSelectorProps {
  currentSpecialties: string[];
}

export function ContractorSpecialtiesSelector({ currentSpecialties }: ContractorSpecialtiesSelectorProps) {
  const [selected, setSelected] = useState<string[]>(currentSpecialties);
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);

  const toggleSpecialty = (specialty: string) => {
    setSelected(prev => {
      const newSelected = prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty];
      setHasChanges(true);
      return newSelected;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateContractorSpecialties(selected);
      setHasChanges(false);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SPECIALTIES.map((specialty) => (
          <button
            key={specialty}
            type="button"
            onClick={() => toggleSpecialty(specialty)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selected.includes(specialty)
                ? 'bg-violet-500 text-white'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            {specialty}
          </button>
        ))}
      </div>
      {hasChanges && (
        <Button 
          onClick={handleSave} 
          disabled={isPending}
          className="bg-violet-500 hover:bg-violet-400"
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Specialties
        </Button>
      )}
    </div>
  );
}
