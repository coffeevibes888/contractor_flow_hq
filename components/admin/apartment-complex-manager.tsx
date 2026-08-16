'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, Plus, Home, Layers, ChevronDown, ChevronRight, 
  Loader2, Trash2, Edit2, Copy
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { AmenitiesSelector } from './amenities-selector';

interface Unit {
  id: string;
  name: string;
  type: string;
  building: string | null;
  floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqFt: number | null;
  rentAmount: number;
  isAvailable: boolean;
  amenities: string[];
}

interface ApartmentComplexManagerProps {
  propertyId: string;
  propertyName: string;
  units: Unit[];
  onRefresh?: () => void;
}

export function ApartmentComplexManager({ 
  propertyId, 
  propertyName, 
  units,
  onRefresh 
}: ApartmentComplexManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set(['']));
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bulk add form state
  const [bulkBuilding, setBulkBuilding] = useState('');
  const [bulkStartUnit, setBulkStartUnit] = useState('101');
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkFloorStart, setBulkFloorStart] = useState('1');
  const [bulkUnitsPerFloor, setBulkUnitsPerFloor] = useState('4');
  const [bulkType, setBulkType] = useState('apartment');
  const [bulkBedrooms, setBulkBedrooms] = useState('1');
  const [bulkBathrooms, setBulkBathrooms] = useState('1');
  const [bulkRent, setBulkRent] = useState('1200');
  const [bulkSqFt, setBulkSqFt] = useState('');
  const [bulkAmenities, setBulkAmenities] = useState<string[]>([]);

  // Single unit form state
  const [unitName, setUnitName] = useState('');
  const [unitBuilding, setUnitBuilding] = useState('');
  const [unitFloor, setUnitFloor] = useState('');
  const [unitType, setUnitType] = useState('apartment');
  const [unitBedrooms, setUnitBedrooms] = useState('1');
  const [unitBathrooms, setUnitBathrooms] = useState('1');
  const [unitRent, setUnitRent] = useState('1200');
  const [unitSqFt, setUnitSqFt] = useState('');
  const [unitAmenities, setUnitAmenities] = useState<string[]>([]);

  // Group units by building
  const buildingGroups = units.reduce((acc, unit) => {
    const building = unit.building || 'No Building';
    if (!acc[building]) acc[building] = [];
    acc[building].push(unit);
    return acc;
  }, {} as Record<string, Unit[]>);

  // Get unique buildings for dropdown
  const existingBuildings = [...new Set(units.map(u => u.building).filter(Boolean))] as string[];

  const toggleBuilding = (building: string) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(building)) {
      newExpanded.delete(building);
    } else {
      newExpanded.add(building);
    }
    setExpandedBuildings(newExpanded);
  };

  const handleBulkAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/landlord/units/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          building: bulkBuilding || null,
          startUnit: parseInt(bulkStartUnit),
          count: parseInt(bulkCount),
          floorStart: parseInt(bulkFloorStart),
          unitsPerFloor: parseInt(bulkUnitsPerFloor),
          type: bulkType,
          bedrooms: parseInt(bulkBedrooms),
          bathrooms: parseFloat(bulkBathrooms),
          rentAmount: parseFloat(bulkRent),
          sizeSqFt: bulkSqFt ? parseInt(bulkSqFt) : null,
          amenities: bulkAmenities,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add units');
      }

      toast({ description: `Successfully added ${bulkCount} units!` });
      setShowBulkAddDialog(false);
      router.refresh();
      onRefresh?.();
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddUnit = async () => {
    if (!unitName.trim()) {
      toast({ variant: 'destructive', description: 'Unit name is required' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/landlord/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          name: unitName,
          building: unitBuilding || null,
          floor: unitFloor ? parseInt(unitFloor) : null,
          type: unitType,
          bedrooms: parseInt(unitBedrooms),
          bathrooms: parseFloat(unitBathrooms),
          rentAmount: parseFloat(unitRent),
          sizeSqFt: unitSqFt ? parseInt(unitSqFt) : null,
          amenities: unitAmenities,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add unit');
      }

      toast({ description: `Unit ${unitName} added successfully!` });
      setShowAddUnitDialog(false);
      resetUnitForm();
      router.refresh();
      onRefresh?.();
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const resetUnitForm = () => {
    setUnitName('');
    setUnitBuilding('');
    setUnitFloor('');
    setUnitType('apartment');
    setUnitBedrooms('1');
    setUnitBathrooms('1');
    setUnitRent('1200');
    setUnitSqFt('');
    setUnitAmenities([]);
  };

  return (
    <Card className="border-white/10 bg-slate-900/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              Units & Buildings
            </CardTitle>
            <CardDescription className="text-slate-400">
              {units.length} unit{units.length !== 1 ? 's' : ''} • {Object.keys(buildingGroups).length} building{Object.keys(buildingGroups).length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddUnitDialog} onOpenChange={setShowAddUnitDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-white/20 text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Unit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Single Unit</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Add a new unit to {propertyName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unit Name/Number *</Label>
                      <Input
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="e.g. 101, 2B"
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Building</Label>
                      <Input
                        value={unitBuilding}
                        onChange={(e) => setUnitBuilding(e.target.value)}
                        placeholder="e.g. Building A"
                        className="bg-white/10 border-white/20"
                        list="buildings"
                      />
                      <datalist id="buildings">
                        {existingBuildings.map(b => <option key={b} value={b} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Floor</Label>
                      <Input
                        type="number"
                        value={unitFloor}
                        onChange={(e) => setUnitFloor(e.target.value)}
                        placeholder="1"
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bedrooms</Label>
                      <Input
                        type="number"
                        value={unitBedrooms}
                        onChange={(e) => setUnitBedrooms(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bathrooms</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={unitBathrooms}
                        onChange={(e) => setUnitBathrooms(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Monthly Rent ($)</Label>
                      <Input
                        type="number"
                        value={unitRent}
                        onChange={(e) => setUnitRent(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sq Ft</Label>
                      <Input
                        type="number"
                        value={unitSqFt}
                        onChange={(e) => setUnitSqFt(e.target.value)}
                        placeholder="Optional"
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                  </div>
                  <AmenitiesSelector
                    value={unitAmenities}
                    onChange={setUnitAmenities}
                    type="unit"
                    label="Unit Amenities"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddUnitDialog(false)} className="border-white/20">
                    Cancel
                  </Button>
                  <Button onClick={handleAddUnit} disabled={saving} className="bg-violet-600 hover:bg-violet-500">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add Unit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500">
                  <Layers className="w-4 h-4 mr-1" />
                  Bulk Add
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Add Units</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Quickly add multiple units to {propertyName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Building Name</Label>
                      <Input
                        value={bulkBuilding}
                        onChange={(e) => setBulkBuilding(e.target.value)}
                        placeholder="e.g. Building A"
                        className="bg-white/10 border-white/20"
                        list="buildings-bulk"
                      />
                      <datalist id="buildings-bulk">
                        {existingBuildings.map(b => <option key={b} value={b} />)}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Units</Label>
                      <Input
                        type="number"
                        value={bulkCount}
                        onChange={(e) => setBulkCount(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Starting Unit #</Label>
                      <Input
                        type="number"
                        value={bulkStartUnit}
                        onChange={(e) => setBulkStartUnit(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Starting Floor</Label>
                      <Input
                        type="number"
                        value={bulkFloorStart}
                        onChange={(e) => setBulkFloorStart(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Units/Floor</Label>
                      <Input
                        type="number"
                        value={bulkUnitsPerFloor}
                        onChange={(e) => setBulkUnitsPerFloor(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Bedrooms</Label>
                      <Input
                        type="number"
                        value={bulkBedrooms}
                        onChange={(e) => setBulkBedrooms(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bathrooms</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={bulkBathrooms}
                        onChange={(e) => setBulkBathrooms(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rent ($)</Label>
                      <Input
                        type="number"
                        value={bulkRent}
                        onChange={(e) => setBulkRent(e.target.value)}
                        className="bg-white/10 border-white/20"
                      />
                    </div>
                  </div>
                  <AmenitiesSelector
                    value={bulkAmenities}
                    onChange={setBulkAmenities}
                    type="unit"
                    label="Default Amenities for All Units"
                  />
                  <div className="rounded-lg bg-violet-500/10 border border-violet-400/30 p-3">
                    <p className="text-sm text-violet-200">
                      This will create {bulkCount} units starting from unit {bulkStartUnit}, 
                      with {bulkUnitsPerFloor} units per floor starting at floor {bulkFloorStart}.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBulkAddDialog(false)} className="border-white/20">
                    Cancel
                  </Button>
                  <Button onClick={handleBulkAdd} disabled={saving} className="bg-violet-600 hover:bg-violet-500">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add {bulkCount} Units
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(buildingGroups).map(([building, buildingUnits]) => (
          <div key={building} className="rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => toggleBuilding(building)}
              className="w-full flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedBuildings.has(building) ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <Building2 className="w-4 h-4 text-violet-400" />
                <span className="font-medium text-white">{building}</span>
                <Badge variant="outline" className="border-white/20 text-slate-300 text-xs">
                  {buildingUnits.length} unit{buildingUnits.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="text-sm text-slate-400">
                {formatCurrency(buildingUnits.reduce((sum, u) => sum + u.rentAmount, 0) / buildingUnits.length)}/mo avg
              </div>
            </button>
            
            {expandedBuildings.has(building) && (
              <div className="divide-y divide-white/5">
                {buildingUnits
                  .sort((a, b) => (a.floor || 0) - (b.floor || 0) || a.name.localeCompare(b.name))
                  .map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between p-3 bg-slate-900/40 hover:bg-slate-900/60">
                      <div className="flex items-center gap-3">
                        <Home className="w-4 h-4 text-sky-400" />
                        <div>
                          <span className="font-medium text-white">{unit.name}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            {unit.floor ? `Floor ${unit.floor}` : ''} • {unit.bedrooms}bd/{unit.bathrooms}ba
                            {unit.sizeSqFt ? ` • ${unit.sizeSqFt} sqft` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={unit.isAvailable 
                            ? 'border-emerald-400/40 text-emerald-300' 
                            : 'border-amber-400/40 text-amber-300'
                          }
                        >
                          {unit.isAvailable ? 'Available' : 'Occupied'}
                        </Badge>
                        <span className="font-semibold text-white">
                          {formatCurrency(unit.rentAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}

        {units.length === 0 && (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto text-slate-500 mb-3" />
            <p className="text-slate-400 mb-4">No units yet. Add your first unit or bulk add multiple units.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
