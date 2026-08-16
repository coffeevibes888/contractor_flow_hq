'use client';

import { useState, useTransition } from 'react';
import { updateContractorServiceAreas } from '@/lib/actions/contractor-profile.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Loader2 } from 'lucide-react';

interface ContractorServiceAreasInputProps {
  currentAreas: string[];
}

export function ContractorServiceAreasInput({ currentAreas }: ContractorServiceAreasInputProps) {
  const [areas, setAreas] = useState<string[]>(currentAreas);
  const [newArea, setNewArea] = useState('');
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);

  const addArea = () => {
    const trimmed = newArea.trim();
    if (trimmed && !areas.includes(trimmed)) {
      setAreas(prev => [...prev, trimmed]);
      setNewArea('');
      setHasChanges(true);
    }
  };

  const removeArea = (area: string) => {
    setAreas(prev => prev.filter(a => a !== area));
    setHasChanges(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateContractorServiceAreas(areas);
      setHasChanges(false);
    });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-white">Service Areas (cities or zip codes)</label>
      
      <div className="flex gap-2">
        <Input
          value={newArea}
          onChange={(e) => setNewArea(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())}
          className="bg-slate-900/50 border-white/20 text-white flex-1"
          placeholder="Enter city or zip code"
        />
        <Button 
          type="button" 
          onClick={addArea}
          className="bg-white/10 hover:bg-white/20"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {areas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {areas.map((area) => (
            <span
              key={area}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white text-sm"
            >
              {area}
              <button
                type="button"
                onClick={() => removeArea(area)}
                className="hover:text-red-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {hasChanges && (
        <Button 
          onClick={handleSave} 
          disabled={isPending}
          className="bg-violet-500 hover:bg-violet-400"
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Service Areas
        </Button>
      )}
    </div>
  );
}
