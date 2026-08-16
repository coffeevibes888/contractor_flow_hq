'use client';

import { useEffect, useCallback, useState } from 'react';
import { DoorOpen, Bath, Sofa, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';
import { RoomData } from '../types';

interface RoomDetailsStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

const ROOM_AMENITIES = [
  'Window', 'Closet', 'Desk', 'Chair', 'Bed Frame', 'Mattress',
  'Dresser', 'Nightstand', 'Lamp', 'Mirror', 'AC Unit', 'Ceiling Fan',
];

export function RoomDetailsStep({ setValidate }: RoomDetailsStepProps) {
  const { state, updateFormData } = useWizard();
  const [expandedRoom, setExpandedRoom] = useState<number>(0);

  const rooms = state.formData.rooms || [];

  const validate = useCallback(() => {
    // Basic validation - ensure all rooms have names
    const isValid = rooms.every(room => room.name && room.name.trim().length > 0);
    return isValid || true; // Allow progression even with minimal data
  }, [rooms]);

  useEffect(() => {
    setValidate(() => validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const updateRoom = (index: number, updates: Partial<RoomData>) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], ...updates };
    updateFormData({ rooms: newRooms });
  };

  const toggleRoomAmenity = (roomIndex: number, amenity: string) => {
    const room = rooms[roomIndex];
    const currentAmenities = room.amenities || [];
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity];
    updateRoom(roomIndex, { amenities: newAmenities });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Room Details</h2>
        <p className="text-gray-500 mt-2">
          Add details for each room available for rent
        </p>
      </div>

      {/* Room Cards */}
      <div className="space-y-4">
        {rooms.map((room, index) => (
          <div
            key={room.id}
            className={cn(
              'rounded-xl border transition-all',
              expandedRoom === index
                ? 'border-violet-500 bg-white'
                : 'border-gray-200 bg-gray-50'
            )}
          >
            {/* Room Header */}
            <button
              type="button"
              onClick={() => setExpandedRoom(expandedRoom === index ? -1 : index)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  expandedRoom === index ? 'bg-violet-500/20' : 'bg-gray-200'
                )}>
                  <DoorOpen className={cn(
                    'h-5 w-5',
                    expandedRoom === index ? 'text-violet-400' : 'text-gray-400'
                  )} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{room.name || `Room ${index + 1}`}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {room.hasPrivateBath && <span>Private Bath</span>}
                    {room.isFurnished && <span>Furnished</span>}
                    {room.rentAmount && <span>${room.rentAmount}/mo</span>}
                  </div>
                </div>
              </div>
              {expandedRoom === index ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {/* Room Details (Expanded) */}
            {expandedRoom === index && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
                {/* Room Name */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Room Name</Label>
                  <Input
                    value={room.name}
                    onChange={(e) => updateRoom(index, { name: e.target.value })}
                    placeholder="e.g., Master Bedroom, Room A"
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>

                {/* Size & Rent */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Size (sq ft)</Label>
                    <Input
                      type="number"
                      value={room.sizeSqFt || ''}
                      onChange={(e) => updateRoom(index, { sizeSqFt: parseInt(e.target.value) || undefined })}
                      placeholder="Optional"
                      className="bg-white border-gray-200 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Monthly Rent
                    </Label>
                    <Input
                      type="number"
                      value={room.rentAmount || ''}
                      onChange={(e) => updateRoom(index, { rentAmount: parseInt(e.target.value) || undefined })}
                      placeholder="e.g., 800"
                      className="bg-white border-gray-200 text-gray-900"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bath className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-700">Private Bathroom</span>
                    </div>
                    <Switch
                      checked={room.hasPrivateBath}
                      onCheckedChange={(checked) => updateRoom(index, { hasPrivateBath: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Sofa className="h-4 w-4 text-amber-400" />
                      <span className="text-sm text-gray-700">Furnished</span>
                    </div>
                    <Switch
                      checked={room.isFurnished}
                      onCheckedChange={(checked) => updateRoom(index, { isFurnished: checked })}
                    />
                  </div>
                </div>

                {/* Room Amenities */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Room Amenities</Label>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_AMENITIES.map((amenity) => {
                      const isSelected = room.amenities?.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleRoomAmenity(index, amenity)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs transition-all',
                            isSelected
                              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                          )}
                        >
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Total Rooms</p>
            <p className="text-gray-900 font-medium">{rooms.length}</p>
          </div>
          <div>
            <p className="text-gray-400">Private Baths</p>
            <p className="text-gray-900 font-medium">{rooms.filter(r => r.hasPrivateBath).length}</p>
          </div>
          <div>
            <p className="text-gray-400">Furnished</p>
            <p className="text-gray-900 font-medium">{rooms.filter(r => r.isFurnished).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
