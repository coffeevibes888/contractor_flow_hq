'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertCircle, Plus, Home } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  units: Array<{
    id: string;
    name: string;
    rentAmount: number;
    isAvailable: boolean;
  }>;
  defaultLeaseDocument: {
    id: string;
    name: string;
  } | null;
}

interface AssignTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    linkId: string;
    tenant: {
      id: string;
      name: string;
      email: string;
    };
  };
  landlordId: string;
  onSuccess: () => void;
}

export function AssignTenantDialog({
  open,
  onOpenChange,
  tenant,
  landlordId,
  onSuccess
}: AssignTenantDialogProps) {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [generateLease, setGenerateLease] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [error, setError] = useState('');

  // Load properties
  useEffect(() => {
    if (open) {
      loadProperties();
      // Set default start date to today
      const today = new Date().toISOString().split('T')[0];
      setLeaseStartDate(today);
    }
  }, [open]);

  const loadProperties = async () => {
    setLoadingProperties(true);
    setError('');
    try {
      const res = await fetch('/api/admin/properties?includeUnits=true&includeDefaultLease=true');
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      } else {
        setError('Failed to load properties');
      }
    } catch (err) {
      setError('Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const selectedUnit = selectedProperty?.units.find(u => u.id === selectedUnitId);
  const hasDefaultLease = selectedProperty?.defaultLeaseDocument !== null;

  const handleAssign = async () => {
    if (!selectedPropertyId || !selectedUnitId || !leaseStartDate) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/tenants/unassigned/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: tenant.linkId,
          tenantId: tenant.tenant.id,
          propertyId: selectedPropertyId,
          unitId: selectedUnitId,
          leaseStartDate,
          leaseEndDate: leaseEndDate || null,
          generateLease: generateLease && hasDefaultLease,
          rentAmount: selectedUnit?.rentAmount
        })
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
      } else {
        setError(data.message || 'Failed to assign tenant');
      }
    } catch (err) {
      setError('Failed to assign tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign {tenant.tenant.name} to Property</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* No Properties State */}
          {!loadingProperties && properties.length === 0 ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                <Home className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Yet</h3>
                <p className="text-sm text-gray-600 mb-4">
                  To assign {tenant.tenant.name} to a property, you need to create a property first.
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Rent collection is the #1 reason landlords bring over existing tenants. Let's get you set up!
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    router.push('/admin/dashboard/properties/new');
                  }}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Property
                </Button>
                <p className="text-xs text-center text-gray-500">
                  After creating a property, come back here to assign the tenant
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Property Selection */}
              <div>
            <Label htmlFor="property">Property *</Label>
            <Select 
              value={selectedPropertyId} 
              onValueChange={(value) => {
                setSelectedPropertyId(value);
                setSelectedUnitId(''); // Reset unit when property changes
              }}
              disabled={loadingProperties}
            >
              <SelectTrigger id="property">
                <SelectValue placeholder={loadingProperties ? "Loading properties..." : "Select a property"} />
              </SelectTrigger>
              <SelectContent>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                    {property.defaultLeaseDocument && (
                      <span className="text-xs text-green-600 ml-2">
                        (Has default lease)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Selection */}
          {selectedPropertyId && (
            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProperty?.units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name} - ${unit.rentAmount}/mo
                      {!unit.isAvailable && (
                        <span className="text-xs text-amber-600 ml-2">
                          (Currently Occupied)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProperty && selectedProperty.units.length === 0 && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 mb-2">
                    This property has no units yet.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/admin/dashboard/properties/${selectedPropertyId}`);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Add Unit to {selectedProperty.name}
                  </Button>
                </div>
              )}
              {selectedUnit && !selectedUnit.isAvailable && (
                <p className="text-xs text-amber-600 mt-1">
                  Warning: This unit is currently marked as occupied
                </p>
              )}
            </div>
          )}

          {/* Lease Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Lease Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={leaseStartDate}
                onChange={(e) => setLeaseStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Lease End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={leaseEndDate}
                onChange={(e) => setLeaseEndDate(e.target.value)}
                min={leaseStartDate}
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank for month-to-month</p>
            </div>
          </div>

          {/* Generate Lease Option */}
          {selectedPropertyId && (
            <div className={`p-4 rounded-lg border ${hasDefaultLease ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="generateLease"
                  checked={generateLease && hasDefaultLease}
                  onCheckedChange={(checked) => setGenerateLease(checked as boolean)}
                  disabled={!hasDefaultLease}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="generateLease" 
                    className={`cursor-pointer font-medium ${!hasDefaultLease ? 'text-gray-400' : ''}`}
                  >
                    Auto-generate lease and send for signature
                  </Label>
                  {hasDefaultLease ? (
                    <p className="text-xs text-gray-600 mt-1">
                      Will use: <span className="font-medium">{selectedProperty?.defaultLeaseDocument?.name}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-1">
                      No default lease set for this property. You can create the lease manually after assignment.
                    </p>
                  )}
                  {!generateLease && hasDefaultLease && (
                    <p className="text-xs text-gray-600 mt-1">
                      You'll need to manually create and send the lease after assignment
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedUnit && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-gray-900">Assignment Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tenant:</span>
                  <span className="font-medium">{tenant.tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property:</span>
                  <span className="font-medium">{selectedProperty?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit:</span>
                  <span className="font-medium">{selectedUnit.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Rent:</span>
                  <span className="font-medium">${selectedUnit.rentAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium">
                    {leaseStartDate ? new Date(leaseStartDate).toLocaleDateString() : '-'}
                  </span>
                </div>
                {leaseEndDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-medium">
                      {new Date(leaseEndDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={loading || !selectedPropertyId || !selectedUnitId || !leaseStartDate}
              className="bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign Tenant
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Made with Bob
