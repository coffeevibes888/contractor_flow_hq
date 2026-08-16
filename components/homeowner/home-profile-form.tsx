'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateHomeownerProfile, uploadHomeImages, deleteHomeImage } from '@/lib/actions/homeowner.actions';
import { HousePlus, Upload, X, Loader2, MapPin, Calendar, Ruler, Bed, Bath, Save } from 'lucide-react';
import Image from 'next/image';

interface HomeProfileFormProps {
  homeowner: {
    id: string;
    name: string | null;
    homeType: string | null;
    interestedServices: string[];
    projectTimeline: string | null;
    address: { street?: string; city?: string; state?: string; zip?: string } | null;
    images: string[];
    yearBuilt: number | null;
    squareFootage: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    lotSize: string | null;
    description: string | null;
  };
}

const homeTypes = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'condo', label: 'Condo / Apartment' },
  { value: 'multi_family', label: 'Multi-Family' },
];

const serviceCategories = [
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'hvac', label: 'HVAC' },
  { id: 'painting', label: 'Painting' },
  { id: 'landscaping', label: 'Landscaping' },
  { id: 'general', label: 'General Repairs' },
  { id: 'roofing', label: 'Roofing' },
  { id: 'flooring', label: 'Flooring' },
];

export default function HomeProfileForm({ homeowner }: HomeProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<string[]>(homeowner.images || []);
  
  const [formData, setFormData] = useState({
    name: homeowner.name || '',
    homeType: homeowner.homeType || '',
    interestedServices: homeowner.interestedServices || [],
    street: (homeowner.address as any)?.street || '',
    city: (homeowner.address as any)?.city || '',
    state: (homeowner.address as any)?.state || '',
    zip: (homeowner.address as any)?.zip || '',
    yearBuilt: homeowner.yearBuilt?.toString() || '',
    squareFootage: homeowner.squareFootage?.toString() || '',
    bedrooms: homeowner.bedrooms?.toString() || '',
    bathrooms: homeowner.bathrooms?.toString() || '',
    lotSize: homeowner.lotSize || '',
    description: homeowner.description || '',
  });

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      interestedServices: prev.interestedServices.includes(serviceId)
        ? prev.interestedServices.filter(s => s !== serviceId)
        : [...prev.interestedServices, serviceId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      const result = await updateHomeownerProfile({
        name: formData.name || undefined,
        homeType: formData.homeType || undefined,
        interestedServices: formData.interestedServices,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
        },
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
        squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : undefined,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : undefined,
        lotSize: formData.lotSize || undefined,
        description: formData.description || undefined,
      });

      if (result.success) {
        toast({ description: 'Home profile updated!' });
        router.refresh();
      } else {
        toast({ variant: 'destructive', description: result.message });
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('images', file));

    const result = await uploadHomeImages(formData);
    setIsUploading(false);

    if (result.success && result.images) {
      setImages(result.images);
      toast({ description: result.message });
    } else {
      toast({ variant: 'destructive', description: result.message });
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    const result = await deleteHomeImage(imageUrl);
    if (result.success && result.images) {
      setImages(result.images);
      toast({ description: 'Image deleted' });
    } else {
      toast({ variant: 'destructive', description: result.message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Home Images */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <HousePlus className="h-5 w-5 text-sky-600" />
            Home Photos
          </CardTitle>
          <CardDescription className="text-slate-600">
            Add photos of your home to help contractors understand your property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-video rounded-lg overflow-hidden group">
                <Image src={img} alt={`Home photo ${idx + 1}`} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {images.length < 10 && (
              <label className="aspect-video rounded-lg border-2 border-dashed border-slate-300 hover:border-sky-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-slate-500 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-500 mb-2" />
                    <span className="text-sm text-slate-600">Add Photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-600">Upload up to 10 photos (JPEG, PNG, WebP, max 5MB each)</p>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Home Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Home Name (optional)</Label>
              <Input
                id="name"
                placeholder="e.g., My Beach House"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="homeType">Home Type</Label>
              <Select
                value={formData.homeType}
                onValueChange={v => setFormData({ ...formData, homeType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {homeTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell contractors about your home..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <MapPin className="h-5 w-5 text-sky-600" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              placeholder="123 Main St"
              value={formData.street}
              onChange={e => setFormData({ ...formData, street: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="City"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="State"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="12345"
                value={formData.zip}
                onChange={e => setFormData({ ...formData, zip: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Property Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yearBuilt" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Year Built
              </Label>
              <Input
                id="yearBuilt"
                type="number"
                placeholder="2000"
                value={formData.yearBuilt}
                onChange={e => setFormData({ ...formData, yearBuilt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="squareFootage" className="flex items-center gap-1">
                <Ruler className="h-4 w-4" /> Sq. Footage
              </Label>
              <Input
                id="squareFootage"
                type="number"
                placeholder="2000"
                value={formData.squareFootage}
                onChange={e => setFormData({ ...formData, squareFootage: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bedrooms" className="flex items-center gap-1">
                <Bed className="h-4 w-4" /> Bedrooms
              </Label>
              <Input
                id="bedrooms"
                type="number"
                placeholder="3"
                value={formData.bedrooms}
                onChange={e => setFormData({ ...formData, bedrooms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms" className="flex items-center gap-1">
                <Bath className="h-4 w-4" /> Bathrooms
              </Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                placeholder="2"
                value={formData.bathrooms}
                onChange={e => setFormData({ ...formData, bathrooms: e.target.value })}
              />
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <Label htmlFor="lotSize">Lot Size</Label>
            <Input
              id="lotSize"
              placeholder="e.g., 0.25 acres"
              value={formData.lotSize}
              onChange={e => setFormData({ ...formData, lotSize: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Services Interested In */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Services You Need</CardTitle>
          <CardDescription className="text-slate-600">
            Select the types of work you're interested in - we'll recommend matching contractors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {serviceCategories.map(service => {
              const isSelected = formData.interestedServices.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-200 hover:border-sky-300 text-slate-700'
                  }`}
                >
                  <span className="font-medium">{service.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
