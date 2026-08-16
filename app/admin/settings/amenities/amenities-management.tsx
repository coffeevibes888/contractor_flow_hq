'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, Home, Plus, X, Check, Loader2, 
  Sparkles, WashingMachine, Dumbbell, Car, Trees, Shield
} from 'lucide-react';
import { PROPERTY_AMENITIES, UNIT_AMENITIES } from '@/components/admin/amenities-selector';

interface Property {
  id: string;
  name: string;
  amenities: string[];
  units: {
    id: string;
    name: string;
    amenities: string[];
  }[];
}

interface AmenitiesManagementProps {
  landlordId: string;
  properties: Property[];
  existingPropertyAmenities: string[];
  existingUnitAmenities: string[];
}

export default function AmenitiesManagement({
  landlordId,
  properties,
  existingPropertyAmenities,
  existingUnitAmenities,
}: AmenitiesManagementProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedProperty, setSelectedProperty] = useState<string | null>(
    properties.length === 1 ? properties[0].id : null
  );
  const [customAmenity, setCustomAmenity] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'property' | 'unit'>('property');

  // Track changes for the selected property
  const [propertyAmenities, setPropertyAmenities] = useState<Record<string, string[]>>(
    Object.fromEntries(properties.map((p) => [p.id, p.amenities]))
  );
  const [unitAmenities, setUnitAmenities] = useState<Record<string, string[]>>(
    Object.fromEntries(
      properties.flatMap((p) => p.units.map((u) => [u.id, u.amenities]))
    )
  );

  const selectedPropertyData = properties.find((p) => p.id === selectedProperty);

  const togglePropertyAmenity = (amenity: string) => {
    if (!selectedProperty) return;
    const current = propertyAmenities[selectedProperty] || [];
    if (current.includes(amenity)) {
      setPropertyAmenities({
        ...propertyAmenities,
        [selectedProperty]: current.filter((a) => a !== amenity),
      });
    } else {
      setPropertyAmenities({
        ...propertyAmenities,
        [selectedProperty]: [...current, amenity],
      });
    }
  };

  const toggleUnitAmenity = (unitId: string, amenity: string) => {
    const current = unitAmenities[unitId] || [];
    if (current.includes(amenity)) {
      setUnitAmenities({
        ...unitAmenities,
        [unitId]: current.filter((a) => a !== amenity),
      });
    } else {
      setUnitAmenities({
        ...unitAmenities,
        [unitId]: [...current, amenity],
      });
    }
  };

  const addCustomAmenity = (type: 'property' | 'unit', unitId?: string) => {
    const trimmed = customAmenity.trim();
    if (!trimmed) return;

    if (type === 'property' && selectedProperty) {
      const current = propertyAmenities[selectedProperty] || [];
      if (!current.includes(trimmed)) {
        setPropertyAmenities({
          ...propertyAmenities,
          [selectedProperty]: [...current, trimmed],
        });
      }
    } else if (type === 'unit' && unitId) {
      const current = unitAmenities[unitId] || [];
      if (!current.includes(trimmed)) {
        setUnitAmenities({
          ...unitAmenities,
          [unitId]: [...current, trimmed],
        });
      }
    }
    setCustomAmenity('');
  };

  const applyToAllUnits = (amenity: string) => {
    if (!selectedPropertyData) return;
    const updates: Record<string, string[]> = { ...unitAmenities };
    selectedPropertyData.units.forEach((unit) => {
      const current = updates[unit.id] || [];
      if (!current.includes(amenity)) {
        updates[unit.id] = [...current, amenity];
      }
    });
    setUnitAmenities(updates);
    toast({ description: `Added "${amenity}" to all units` });
  };

  const saveChanges = async () => {
    if (!selectedProperty) return;
    setSaving(true);

    try {
      const res = await fetch('/api/landlord/amenities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedProperty,
          propertyAmenities: propertyAmenities[selectedProperty] || [],
          unitAmenities: selectedPropertyData?.units.map((u) => ({
            unitId: u.id,
            amenities: unitAmenities[u.id] || [],
          })) || [],
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast({ description: 'Amenities saved successfully!' });
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to save amenities' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="w-full px-4 py-8 md:px-0">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold text-white">Amenities Management</h1>
          <p className="text-sm text-slate-300/80">
            Manage amenities for your properties and units. These will be displayed to prospective tenants.
          </p>
        </div>

        {/* Property Selector */}
        {properties.length > 1 && (
          <Card className="border-white/10 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Select Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {properties.map((property) => (
                  <Button
                    key={property.id}
                    variant={selectedProperty === property.id ? 'default' : 'outline'}
                    className={
                      selectedProperty === property.id
                        ? 'bg-violet-600 hover:bg-violet-500'
                        : 'border-white/20 text-white hover:bg-white/10'
                    }
                    onClick={() => setSelectedProperty(property.id)}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    {property.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedPropertyData && (
          <>
            {/* Tabs for Property vs Unit Amenities */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'property' | 'unit')}>
              <TabsList className="bg-slate-800/60 border border-white/10">
                <TabsTrigger value="property" className="data-[state=active]:bg-violet-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  Property Amenities
                </TabsTrigger>
                <TabsTrigger value="unit" className="data-[state=active]:bg-violet-600">
                  <Home className="w-4 h-4 mr-2" />
                  Unit Amenities
                </TabsTrigger>
              </TabsList>

              {/* Property Amenities Tab */}
              <TabsContent value="property" className="mt-4 space-y-4">
                <Card className="border-white/10 bg-slate-900/60">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-violet-400" />
                      {selectedPropertyData.name} - Property Amenities
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Shared amenities for the entire property (pool, gym, parking, etc.)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selected amenities */}
                    {(propertyAmenities[selectedProperty!] || []).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 font-medium">Selected:</p>
                        <div className="flex flex-wrap gap-2">
                          {(propertyAmenities[selectedProperty!] || []).map((amenity) => (
                            <Badge
                              key={amenity}
                              className="bg-violet-500/20 text-violet-200 border-violet-400/30 pr-1"
                            >
                              {amenity}
                              <button
                                type="button"
                                onClick={() => togglePropertyAmenity(amenity)}
                                className="ml-1 p-0.5 rounded hover:bg-violet-500/30"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick select */}
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 font-medium">Quick add:</p>
                      <div className="flex flex-wrap gap-2">
                        {PROPERTY_AMENITIES.map((amenity) => {
                          const isSelected = (propertyAmenities[selectedProperty!] || []).includes(amenity);
                          return (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => togglePropertyAmenity(amenity)}
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
                    </div>

                    {/* Custom amenity */}
                    <div className="flex gap-2">
                      <Input
                        value={customAmenity}
                        onChange={(e) => setCustomAmenity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity('property'))}
                        placeholder="Add custom amenity..."
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                      />
                      <Button
                        type="button"
                        onClick={() => addCustomAmenity('property')}
                        disabled={!customAmenity.trim()}
                        className="bg-violet-600 hover:bg-violet-500"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Unit Amenities Tab */}
              <TabsContent value="unit" className="mt-4 space-y-4">
                {selectedPropertyData.units.length === 0 ? (
                  <Card className="border-white/10 bg-slate-900/60">
                    <CardContent className="py-8 text-center">
                      <p className="text-slate-400">No units found for this property.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Bulk apply section */}
                    <Card className="border-emerald-500/30 bg-emerald-500/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          Apply to All Units
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {['In-Unit Washer/Dryer', 'Dishwasher', 'Central A/C', 'Balcony', 'Pet Friendly'].map((amenity) => (
                            <Button
                              key={amenity}
                              variant="outline"
                              size="sm"
                              className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/20"
                              onClick={() => applyToAllUnits(amenity)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              {amenity}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Individual units */}
                    {selectedPropertyData.units.map((unit) => (
                      <Card key={unit.id} className="border-white/10 bg-slate-900/60">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-white text-base flex items-center gap-2">
                            <Home className="w-4 h-4 text-sky-400" />
                            Unit {unit.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Selected */}
                          {(unitAmenities[unit.id] || []).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {(unitAmenities[unit.id] || []).map((amenity) => (
                                <Badge
                                  key={amenity}
                                  className="bg-sky-500/20 text-sky-200 border-sky-400/30 pr-1"
                                >
                                  {amenity}
                                  <button
                                    type="button"
                                    onClick={() => toggleUnitAmenity(unit.id, amenity)}
                                    className="ml-1 p-0.5 rounded hover:bg-sky-500/30"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Quick select */}
                          <div className="flex flex-wrap gap-1">
                            {UNIT_AMENITIES.slice(0, 12).map((amenity) => {
                              const isSelected = (unitAmenities[unit.id] || []).includes(amenity);
                              return (
                                <button
                                  key={amenity}
                                  type="button"
                                  onClick={() => toggleUnitAmenity(unit.id, amenity)}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                                    isSelected
                                      ? 'bg-sky-500/30 text-sky-200 border border-sky-400/50'
                                      : 'bg-slate-800 text-slate-300 border border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                  {amenity}
                                </button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={saveChanges}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-500 px-8"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </>
        )}

        {!selectedProperty && properties.length > 0 && (
          <Card className="border-white/10 bg-slate-900/60">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-slate-500 mb-4" />
              <p className="text-slate-400">Select a property above to manage its amenities</p>
            </CardContent>
          </Card>
        )}

        {properties.length === 0 && (
          <Card className="border-white/10 bg-slate-900/60">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-slate-500 mb-4" />
              <p className="text-slate-400 mb-4">No properties found. Add a property first.</p>
              <Button asChild className="bg-violet-600 hover:bg-violet-500">
                <a href="/admin/dashboard/properties/new">Add Property</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
