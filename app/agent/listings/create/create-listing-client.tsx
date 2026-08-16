'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, DollarSign, Home, Save, Loader2, ArrowLeft, ImagePlus, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadButton } from '@/lib/uploadthing';
import Link from 'next/link';
import Image from 'next/image';

interface CreateListingClientProps {
  agentId: string;
}

export default function CreateListingClient({ agentId }: CreateListingClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'house',
    listingType: 'sale',
    price: '',
    street: '',
    city: '',
    state: 'NV',
    zip: '',
    bedrooms: '',
    bathrooms: '',
    sizeSqFt: '',
    yearBuilt: '',
    lotSizeSqFt: '',
    garage: '',
  });

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/agent/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images,
          videoUrl: videoUrl || null,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/agent/listings');
      } else {
        setError(data.error || 'Failed to create listing');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/agent/listings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add New Listing</h1>
          <p className="text-slate-600 mt-1">Create a new property listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Listing Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Beautiful 4BR Home in Summerlin"
                required
                className="bg-white"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                    <SelectItem value="multi-family">Multi-Family</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Listing Type</Label>
                <Select
                  value={formData.listingType}
                  onValueChange={(value) => setFormData({ ...formData, listingType: value })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="lease">For Lease</SelectItem>
                    <SelectItem value="auction">Auction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the property..."
                rows={4}
                className="bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="123 Main Street"
                required
                className="bg-white"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Las Vegas"
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NV"
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  placeholder="89101"
                  required
                  className="bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Listing Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="450000"
                  required
                  className="pl-9 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-amber-600" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="4"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="2.5"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Square Feet</Label>
                <Input
                  type="number"
                  value={formData.sizeSqFt}
                  onChange={(e) => setFormData({ ...formData, sizeSqFt: e.target.value })}
                  placeholder="2500"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Year Built</Label>
                <Input
                  type="number"
                  value={formData.yearBuilt}
                  onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                  placeholder="2020"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Lot Size (sqft)</Label>
                <Input
                  type="number"
                  value={formData.lotSizeSqFt}
                  onChange={(e) => setFormData({ ...formData, lotSizeSqFt: e.target.value })}
                  placeholder="8000"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Garage Spaces</Label>
                <Input
                  type="number"
                  value={formData.garage}
                  onChange={(e) => setFormData({ ...formData, garage: e.target.value })}
                  placeholder="2"
                  className="bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos & Video */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-violet-600" />
              Photos & Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Property Photos</Label>
              <p className="text-sm text-slate-500">Upload up to 20 photos of the property. First image will be the cover photo.</p>
              
              {/* Image Preview Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {images.map((url, index) => (
                    <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200">
                      <Image
                        src={url}
                        alt={`Property photo ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 bg-violet-600 text-white text-xs px-2 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {images.length < 20 && (
                <UploadButton
                  endpoint="imageUploader"
                  onClientUploadComplete={(res) => {
                    if (res) {
                      const newUrls = res.map((file) => file.url);
                      setImages((prev) => [...prev, ...newUrls].slice(0, 20));
                    }
                  }}
                  onUploadError={(error: Error) => {
                    setError(`Image upload failed: ${error.message}`);
                  }}
                  appearance={{
                    button: "bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2 rounded-lg",
                    allowedContent: "text-slate-500 text-sm",
                  }}
                />
              )}
              <p className="text-xs text-slate-400">{images.length}/20 photos uploaded</p>
            </div>

            {/* Video Upload */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4 text-violet-600" />
                Property Video (Optional)
              </Label>
              <p className="text-sm text-slate-500">Upload a walkthrough video of the property (max 256MB).</p>
              
              {videoUrl ? (
                <div className="relative">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-w-md rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setVideoUrl('')}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <UploadButton
                  endpoint="videoUploader"
                  onClientUploadComplete={(res) => {
                    if (res && res[0]) {
                      setVideoUrl(res[0].url);
                    }
                  }}
                  onUploadError={(error: Error) => {
                    setError(`Video upload failed: ${error.message}`);
                  }}
                  appearance={{
                    button: "bg-slate-600 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg",
                    allowedContent: "text-slate-500 text-sm",
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/agent/listings">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Listing
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
