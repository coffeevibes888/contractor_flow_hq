'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Layers, DoorOpen, Plus, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useWizard } from '../wizard-context';

const buildingSchema = z.object({
  totalBuildings: z.number().min(1, 'At least 1 building required').max(50),
  floorsPerBuilding: z.number().min(1, 'At least 1 floor required').max(100),
  unitsPerFloor: z.number().min(1, 'At least 1 unit per floor').max(50),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

interface BuildingStructureStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function BuildingStructureStep({ setValidate }: BuildingStructureStepProps) {
  const { state, updateFormData } = useWizard();
  const isInitialMount = useRef(true);

  const form = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      totalBuildings: state.formData.totalBuildings ?? 1,
      floorsPerBuilding: state.formData.floorsPerBuilding ?? 3,
      unitsPerFloor: state.formData.unitsPerFloor ?? 4,
    },
  });

  const { watch, setValue, formState: { errors } } = form;
  
  // Watch individual fields to avoid infinite loop
  const totalBuildings = watch('totalBuildings');
  const floorsPerBuilding = watch('floorsPerBuilding');
  const unitsPerFloor = watch('unitsPerFloor');

  // Update wizard state when values change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    updateFormData({ totalBuildings, floorsPerBuilding, unitsPerFloor });
  }, [totalBuildings, floorsPerBuilding, unitsPerFloor, updateFormData]);

  // Set validation function - always return true for this step since all values have defaults
  useEffect(() => {
    const validateFn = (): boolean => {
      return true; // Building structure always has valid defaults
    };
    setValidate(validateFn);
    return () => setValidate(null);
  }, [setValidate]);

  const totalUnits = totalBuildings * floorsPerBuilding * unitsPerFloor;

  const CounterInput = ({ 
    label, 
    icon: Icon, 
    value, 
    onChange, 
    min = 1, 
    max = 100,
    error 
  }: { 
    label: string; 
    icon: React.ElementType; 
    value: number; 
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    error?: string;
  }) => (
    <div className="space-y-3">
      <Label className="text-gray-700 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => value > min && onChange(value - 1)}
          disabled={value <= min}
          className="h-10 w-10 border-gray-300 bg-white hover:bg-gray-100 text-gray-900 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          className="w-20 text-center bg-white border-gray-200 text-gray-900 text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => value < max && onChange(value + 1)}
          disabled={value >= max}
          className="h-10 w-10 border-gray-300 bg-white hover:bg-gray-100 text-gray-900 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Building Structure</h2>
        <p className="text-gray-700 mt-2">
          Define the structure of your apartment complex
        </p>
      </div>

      {/* Structure Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CounterInput
          label="Buildings"
          icon={Building2}
          value={totalBuildings}
          onChange={(v) => setValue('totalBuildings', v)}
          min={1}
          max={50}
          error={errors.totalBuildings?.message}
        />
        <CounterInput
          label="Floors per Building"
          icon={Layers}
          value={floorsPerBuilding}
          onChange={(v) => setValue('floorsPerBuilding', v)}
          min={1}
          max={100}
          error={errors.floorsPerBuilding?.message}
        />
        <CounterInput
          label="Units per Floor"
          icon={DoorOpen}
          value={unitsPerFloor}
          onChange={(v) => setValue('unitsPerFloor', v)}
          min={1}
          max={50}
          error={errors.unitsPerFloor?.message}
        />
      </div>

      {/* Visual Preview */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Complex Preview</h3>
        
        <div className="flex flex-wrap gap-4 justify-center">
          {Array.from({ length: Math.min(totalBuildings, 5) }).map((_, buildingIndex) => (
            <div key={buildingIndex} className="text-center">
              <div className="bg-gray-100 rounded-lg p-3 min-w-[80px]">
                {/* Building visualization */}
                <div className="space-y-1">
                  {Array.from({ length: Math.min(floorsPerBuilding, 6) }).map((_, floorIndex) => (
                    <div key={floorIndex} className="flex gap-0.5 justify-center">
                      {Array.from({ length: Math.min(unitsPerFloor, 4) }).map((_, unitIndex) => (
                        <div
                          key={unitIndex}
                          className="w-3 h-3 bg-violet-300/60 rounded-sm"
                        />
                      ))}
                      {unitsPerFloor > 4 && (
                        <span className="text-[8px] text-gray-500 ml-1">+{unitsPerFloor - 4}</span>
                      )}
                    </div>
                  ))}
                  {floorsPerBuilding > 6 && (
                    <p className="text-[10px] text-gray-500">+{floorsPerBuilding - 6} floors</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Building {String.fromCharCode(65 + buildingIndex)}
              </p>
            </div>
          ))}
          {totalBuildings > 5 && (
            <div className="flex items-center text-gray-500 text-sm">
              +{totalBuildings - 5} more
            </div>
          )}
        </div>
      </div>

      {/* Total Units Summary */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-6 text-center">
        <p className="text-gray-700 mb-2">Total Units</p>
        <p className="text-5xl font-bold text-gray-900">{totalUnits.toLocaleString()}</p>
        <p className="text-sm text-gray-500 mt-2">
          {totalBuildings} building{totalBuildings > 1 ? 's' : ''} × {floorsPerBuilding} floor{floorsPerBuilding > 1 ? 's' : ''} × {unitsPerFloor} unit{unitsPerFloor > 1 ? 's' : ''}
        </p>
      </div>

      {/* Enterprise hint */}
      {totalUnits > 24 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-sm text-amber-200">
            <strong>Note:</strong> Managing more than 24 units may require an enterprise subscription for full functionality.
          </p>
        </div>
      )}
    </div>
  );
}
