'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DoorOpen, Plus, Minus, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useWizard } from '../wizard-context';

const roomSetupSchema = z.object({
  totalRooms: z.number().min(1, 'At least 1 room required').max(20),
  roommateFriendly: z.boolean(),
});

type RoomSetupFormData = z.infer<typeof roomSetupSchema>;

interface RoomSetupStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function RoomSetupStep({ setValidate }: RoomSetupStepProps) {
  const { state, updateFormData } = useWizard();
  const isInitialMount = useRef(true);

  const form = useForm<RoomSetupFormData>({
    resolver: zodResolver(roomSetupSchema),
    defaultValues: {
      totalRooms: state.formData.totalRooms ?? 1,
      roommateFriendly: state.formData.roommateFriendly ?? false,
    },
  });

  const { watch, setValue, formState: { errors } } = form;
  const totalRooms = watch('totalRooms');
  const roommateFriendly = watch('roommateFriendly');

  // Update wizard state when values change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    updateFormData({ totalRooms, roommateFriendly });
    
    // Initialize rooms array if needed
    const currentRooms = state.formData.rooms || [];
    if (currentRooms.length !== totalRooms) {
      const newRooms = Array.from({ length: totalRooms }, (_, i) => {
        return currentRooms[i] || {
          id: `room-${i + 1}`,
          name: `Room ${i + 1}`,
          sizeSqFt: undefined,
          isFurnished: false,
          hasPrivateBath: false,
          rentAmount: undefined,
          images: [],
          amenities: [],
        };
      });
      updateFormData({ rooms: newRooms });
    }
  }, [totalRooms, roommateFriendly, updateFormData, state.formData.rooms]);

  const validate = useCallback((): boolean => {
    return totalRooms >= 1;
  }, [totalRooms]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const incrementRooms = () => {
    const current = totalRooms || 1;
    if (current < 20) setValue('totalRooms', current + 1);
  };

  const decrementRooms = () => {
    const current = totalRooms || 1;
    if (current > 1) setValue('totalRooms', current - 1);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Room Setup</h2>
        <p className="text-gray-500 mt-2">
          How many rooms are available for rent in this property?
        </p>
      </div>

      {/* Number of Rooms */}
      <div className="flex flex-col items-center space-y-6">
        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-2 border-violet-500/30 flex items-center justify-center">
          <DoorOpen className="h-16 w-16 text-violet-400" />
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decrementRooms}
            disabled={totalRooms <= 1}
            className="h-12 w-12 rounded-full border-gray-300 hover:bg-gray-100"
          >
            <Minus className="h-5 w-5" />
          </Button>

          <div className="text-center min-w-[100px]">
            <span className="text-5xl font-bold text-gray-900">{totalRooms}</span>
            <p className="text-gray-500 mt-1">
              {totalRooms === 1 ? 'Room' : 'Rooms'}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={incrementRooms}
            disabled={totalRooms >= 20}
            className="h-12 w-12 rounded-full border-gray-300 hover:bg-gray-100"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {errors.totalRooms && (
          <p className="text-sm text-red-400">{errors.totalRooms.message}</p>
        )}
      </div>

      {/* Roommate Friendly Toggle */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Roommate Friendly</h3>
              <p className="text-sm text-gray-500">
                Allow tenants to find roommates through the platform
              </p>
            </div>
          </div>
          <Switch
            checked={roommateFriendly}
            onCheckedChange={(checked) => setValue('roommateFriendly', checked)}
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/30 rounded-xl p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Next step:</strong> You'll be able to add details for each room including size, 
          whether it has a private bathroom, furnishing status, and individual pricing.
        </p>
      </div>
    </div>
  );
}
