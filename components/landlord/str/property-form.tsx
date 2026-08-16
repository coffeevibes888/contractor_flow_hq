'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, MapPin, DollarSign, Users, Bed, Bath, Image as ImageIcon, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PropertyFormProps {
  property?: any;
  mode: 'create' | 'edit';
}

const AMENITIES = [
  'wifi', 'kitchen', 'parking', 'pool', 'gym', 'washer', 'dryer', 'tv', 'ac', 'heating',
  'workspace', 'fireplace', 'balcony', 'patio', 'bbq', 'hot_tub', 'ev_charger', 'pets_allowed'
];

const PROPERTY_TYPES = [
  { value: 'entire_place', label: 'Entire Place' },
  { value: 'private_room', label: 'Private Room' },
  { value: 'shared_room', label: 'Shared Room' },
];

const CANCELLATION_POLICIES = [
  { value: 'flexible', label: 'Flexible - 50% refund anytime' },
  { value: 'moderate', label: 'Moderate - Full refund with notice' },
  { value: 'strict', label: 'Strict - No refunds' },
];

export default function PropertyForm({ property, mode }: PropertyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: property?.name || '',
    description: property?.description || '',
    propertyType: property?.propertyType || 'entire_place',
    bedrooms: property?.bedrooms || 1,
    bathrooms: property?.bathrooms || 1,
    beds: property?.beds || 1,
    maxGuests: property?.maxGuests || 2,
    sizeSqFt: property?.sizeSqFt || '',
    address: property?.address || {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
    },
    images: property?.images || [],
    videoUrl: property?.videoUrl || '',
    virtualTourUrl: property?.virtualTourUrl || '',
    amenities: property?.amenities || [],
    houseRules: property?.houseRules || '',
    checkInTime: property?.checkInTime || '15:00',
    checkOutTime: property?.checkOutTime || '11:00',
    checkInInstructions: property?.checkInInstructions || '',
    cancellationPolicy: property?.cancellationPolicy || 'moderate',
    instantBooking: property?.instantBooking || false,
    minStay: property?.minStay || 1,
    maxStay: property?.maxStay || '',
    advanceNotice: property?.advanceNotice || 1,
    preparationTime: property?.preparationTime || 1,
    basePrice: property?.basePrice || '',
    weekendPrice: property?.weekendPrice || '',
    weeklyDiscount: property?.weeklyDiscount || '',
    monthlyDiscount: property?.monthlyDiscount || '',
    cleaningFee: property?.cleaningFee || '',
    securityDeposit: property?.securityDeposit || '',
    extraGuestFee: property?.extraGuestFee || '',
    extraGuestThreshold: property?.extraGuestThreshold || 2,
    isActive: property?.isActive !== false,
    isListed: property?.isListed || false,
    listedOn: property?.listedOn || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = mode === 'create' 
        ? '/api/landlord/str/properties'
        : `/api/landlord/str/properties/${property.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save property');

      const data = await res.json();
      
      toast({
        title: mode === 'create' ? 'Property created!' : 'Property updated!',
        description: 'Your changes have been saved successfully.',
      });

      router.push(`/landlord/str/properties/${data.property.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save property. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a: string) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 shadow-2xl border border-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black">
            <Home className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription className="text-black/80">
            Essential details about your property
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-black font-medium">Property Name *</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Cozy Beach House"
              className="bg-white border-black text-black"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-black font-medium">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your property..."
              rows={4}
              className="bg-white border-black text-black placeholder:text-black/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-black font-medium">Property Type *</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
              >
                <SelectTrigger className="bg-white border-black text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-black">
                  {PROPERTY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Square Feet</Label>
              <Input
                type="number"
                value={formData.sizeSqFt}
                onChange={(e) => setFormData({ ...formData, sizeSqFt: e.target.value })}
                placeholder="1200"
                className="bg-white border-black text-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-black font-medium">Bedrooms *</Label>
              <Input
                type="number"
                required
                min="0"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Bathrooms *</Label>
              <Input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Beds *</Label>
              <Input
                type="number"
                required
                min="1"
                value={formData.beds}
                onChange={(e) => setFormData({ ...formData, beds: parseInt(e.target.value) })}
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Max Guests *</Label>
              <Input
                type="number"
                required
                min="1"
                value={formData.maxGuests}
                onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) })}
                className="bg-white border-black text-black"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 shadow-2xl border border-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black">
            <MapPin className="h-5 w-5" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-black font-medium">Street Address *</Label>
            <Input
              required
              value={formData.address.street}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, street: e.target.value }
              })}
              placeholder="123 Main St"
              className="bg-white border-black text-black"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-black font-medium">City *</Label>
              <Input
                required
                value={formData.address.city}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, city: e.target.value }
                })}
                placeholder="San Francisco"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">State *</Label>
              <Input
                required
                value={formData.address.state}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, state: e.target.value }
                })}
                placeholder="CA"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">ZIP Code *</Label>
              <Input
                required
                value={formData.address.zip}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, zip: e.target.value }
                })}
                placeholder="94102"
                className="bg-white border-black text-black"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 shadow-2xl border border-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-black font-medium">Base Price (per night) *</Label>
              <Input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                placeholder="150.00"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Weekend Price (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.weekendPrice}
                onChange={(e) => setFormData({ ...formData, weekendPrice: e.target.value })}
                placeholder="200.00"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Cleaning Fee</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.cleaningFee}
                onChange={(e) => setFormData({ ...formData, cleaningFee: e.target.value })}
                placeholder="75.00"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Security Deposit</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.securityDeposit}
                onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                placeholder="500.00"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Weekly Discount (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.weeklyDiscount}
                onChange={(e) => setFormData({ ...formData, weeklyDiscount: e.target.value })}
                placeholder="10"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Monthly Discount (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.monthlyDiscount}
                onChange={(e) => setFormData({ ...formData, monthlyDiscount: e.target.value })}
                placeholder="20"
                className="bg-white border-black text-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-black font-medium">Extra Guest Fee</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.extraGuestFee}
                onChange={(e) => setFormData({ ...formData, extraGuestFee: e.target.value })}
                placeholder="25.00"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Extra Guest Threshold</Label>
              <Input
                type="number"
                min="1"
                value={formData.extraGuestThreshold}
                onChange={(e) => setFormData({ ...formData, extraGuestThreshold: parseInt(e.target.value) })}
                className="bg-white border-black text-black"
              />
              <p className="text-xs text-black/70">Charge extra fee after this many guests</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 shadow-2xl border border-slate-100">
        <CardHeader>
          <CardTitle className="text-black">Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AMENITIES.map(amenity => (
              <label
                key={amenity}
                className="flex items-center gap-2 p-3 rounded-lg bg-white border border-black cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formData.amenities.includes(amenity)}
                  onChange={() => toggleAmenity(amenity)}
                  className="rounded"
                />
                <span className="text-sm text-black capitalize">
                  {amenity.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Booking Rules */}
      <Card className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 shadow-2xl border border-slate-100">
        <CardHeader>
          <CardTitle className="text-black">Booking Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-black font-medium">Check-in Time</Label>
              <Input
                type="time"
                value={formData.checkInTime}
                onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Check-out Time</Label>
              <Input
                type="time"
                value={formData.checkOutTime}
                onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Minimum Stay (nights)</Label>
              <Input
                type="number"
                min="1"
                value={formData.minStay}
                onChange={(e) => setFormData({ ...formData, minStay: parseInt(e.target.value) })}
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Maximum Stay (nights)</Label>
              <Input
                type="number"
                min="1"
                value={formData.maxStay}
                onChange={(e) => setFormData({ ...formData, maxStay: e.target.value })}
                placeholder="No limit"
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Advance Notice (days)</Label>
              <Input
                type="number"
                min="0"
                value={formData.advanceNotice}
                onChange={(e) => setFormData({ ...formData, advanceNotice: parseInt(e.target.value) })}
                className="bg-white border-black text-black"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-black font-medium">Preparation Time (days)</Label>
              <Input
                type="number"
                min="0"
                value={formData.preparationTime}
                onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) })}
                className="bg-white border-black text-black"
              />
              <p className="text-xs text-black/70">Days between bookings</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-black font-medium">Cancellation Policy</Label>
            <Select
              value={formData.cancellationPolicy}
              onValueChange={(value) => setFormData({ ...formData, cancellationPolicy: value })}
            >
              <SelectTrigger className="bg-white border-black text-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-black">
                {CANCELLATION_POLICIES.map(policy => (
                  <SelectItem key={policy.value} value={policy.value}>
                    {policy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-white border border-black">
            <div>
              <Label className="text-black font-medium">Instant Booking</Label>
              <p className="text-sm text-black/70">Allow guests to book without approval</p>
            </div>
            <Switch
              checked={formData.instantBooking}
              onCheckedChange={(checked) => setFormData({ ...formData, instantBooking: checked })}
              className="data-[state=checked]:bg-violet-600"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-white border border-black">
            <div>
              <Label className="text-black font-medium">Active</Label>
              <p className="text-sm text-black/70">Property is available for booking</p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              className="data-[state=checked]:bg-violet-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* House Rules */}
      <Card className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 shadow-2xl border border-slate-100">
        <CardHeader>
          <CardTitle className="text-black">House Rules & Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-black font-medium">House Rules</Label>
            <Textarea
              value={formData.houseRules}
              onChange={(e) => setFormData({ ...formData, houseRules: e.target.value })}
              placeholder="No smoking, no parties, quiet hours 10pm-8am..."
              rows={4}
              className="bg-white border-black text-black placeholder:text-black/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-black font-medium">Check-in Instructions</Label>
            <Textarea
              value={formData.checkInInstructions}
              onChange={(e) => setFormData({ ...formData, checkInInstructions: e.target.value })}
              placeholder="Lockbox code is 1234, parking in driveway..."
              rows={4}
              className="bg-white border-black text-black placeholder:text-black/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1 border-black text-black hover:bg-gray-100"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-black text-white hover:bg-black/90"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : mode === 'create' ? 'Create Property' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
