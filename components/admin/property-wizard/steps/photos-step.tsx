'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, GripVertical, Star, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useWizard } from '../wizard-context';
import { useToast } from '@/hooks/use-toast';

interface PhotosStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function PhotosStep({ setValidate }: PhotosStepProps) {
  const { state, updateFormData } = useWizard();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images = state.formData.images || [];
  const imageLabels = state.formData.imageLabels || [];

  // Photos are optional — no validation gate needed
  useEffect(() => {
    setValidate(null);
    return () => setValidate(null);
  }, [setValidate]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: string[] = [];
    const newLabels: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({ variant: 'destructive', title: 'Invalid file type', description: `${file.name} is not an image` });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({ variant: 'destructive', title: 'File too large', description: `${file.name} exceeds 10MB limit` });
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newImages.push(data.url);
          newLabels.push(file.name.replace(/\.[^/.]+$/, ''));
        } else {
          toast({ variant: 'destructive', title: 'Upload failed', description: `Failed to upload ${file.name}` });
        }
      }

      if (newImages.length > 0) {
        updateFormData({
          images: [...images, ...newImages],
          imageLabels: [...imageLabels, ...newLabels],
        });
        toast({ title: 'Images uploaded', description: `${newImages.length} image(s) added` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload error', description: 'An error occurred while uploading' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newLabels = imageLabels.filter((_, i) => i !== index);
    updateFormData({ images: newImages, imageLabels: newLabels });
  };

  const updateLabel = (index: number, label: string) => {
    const newLabels = [...imageLabels];
    newLabels[index] = label;
    updateFormData({ imageLabels: newLabels });
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const newLabels = [...imageLabels];
    const [movedImage] = newImages.splice(index, 1);
    const [movedLabel] = newLabels.splice(index, 1);
    newImages.unshift(movedImage);
    newLabels.unshift(movedLabel);
    updateFormData({ images: newImages, imageLabels: newLabels });
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const newLabels = [...imageLabels];
    const [movedImage] = newImages.splice(draggedIndex, 1);
    const [movedLabel] = newLabels.splice(draggedIndex, 1);
    newImages.splice(index, 0, movedImage);
    newLabels.splice(index, 0, movedLabel);
    
    updateFormData({ images: newImages, imageLabels: newLabels });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Property Photos</h2>
        <p className="text-gray-500 mt-2 text-sm">
          Optional — skip this if you're not going live yet. Photos are only shown to tenants when your listing is public. The first image becomes the cover photo.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
          'hover:border-violet-500/50 hover:bg-violet-500/10',
          uploading ? 'border-violet-500 bg-violet-500/10' : 'border-gray-300'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
            <p className="text-gray-600">Uploading images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-900 font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB each</p>
            </div>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <Label className="text-gray-700">
            Uploaded Images ({images.length})
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={`${image}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'group relative rounded-xl overflow-hidden border-2 transition-all',
                  index === 0 ? 'border-violet-500' : 'border-gray-200',
                  draggedIndex === index && 'opacity-50 scale-95'
                )}
              >
                {/* Image */}
                <div className="aspect-[4/3] relative bg-gray-100">
                  <Image
                    src={image}
                    alt={imageLabels[index] || `Photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Primary badge */}
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-violet-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Primary
                    </div>
                  )}

                  {/* Drag handle */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 rounded-lg p-1.5 cursor-grab">
                      <GripVertical className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {index !== 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPrimaryImage(index)}
                        className="bg-white/20 hover:bg-white/30 text-white"
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Set Primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Label input */}
                <div className="p-2 bg-gray-50">
                  <Input
                    value={imageLabels[index] || ''}
                    onChange={(e) => updateLabel(index, e.target.value)}
                    placeholder="Add label..."
                    className="h-8 text-xs bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            Drag images to reorder. The first image will be shown as the primary photo in listings.
          </p>
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && !uploading && (
        <div className="text-center py-8 border-2 border-dashed border-red-500/40 rounded-xl bg-red-500/5">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 text-red-400 opacity-70" />
          <p className="text-red-300 font-medium">At least one photo is required</p>
          <p className="text-sm mt-1 text-gray-500">Listings without photos will not be accepted</p>
        </div>
      )}
    </div>
  );
}
