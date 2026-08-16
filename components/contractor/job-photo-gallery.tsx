'use client';

import { useState, useCallback } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  X,
  Loader2,
  ImagePlus,
  Video,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UploadDropzone } from '@/lib/uploadthing';

type Photo = {
  id: string;
  url: string;
  thumbnail: string | null;
  caption: string | null;
  category: string;
  visibleToCustomer: boolean;
  takenAt: string;
  tags: string[];
};

type GroupedPhotos = {
  before: Photo[];
  during: Photo[];
  after: Photo[];
  issue: Photo[];
  inspection: Photo[];
  general: Photo[];
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  before: { label: 'Before', color: 'bg-amber-100 text-amber-700', description: 'Document the starting condition' },
  during: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', description: 'Show work in progress' },
  after: { label: 'After', color: 'bg-emerald-100 text-emerald-700', description: 'Final result photos' },
  issue: { label: 'Issues', color: 'bg-red-100 text-red-700', description: 'Document any problems found' },
  inspection: { label: 'Inspection', color: 'bg-purple-100 text-purple-700', description: 'Inspection documentation' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700', description: 'Other project photos' },
};

interface JobPhotoGalleryProps {
  jobId: string;
  initialPhotos: GroupedPhotos;
  readOnly?: boolean;
}

export function JobPhotoGallery({ jobId, initialPhotos, readOnly = false }: JobPhotoGalleryProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<GroupedPhotos>(initialPhotos);
  const [activeCategory, setActiveCategory] = useState<string>('before');
  const [uploading, setUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const currentPhotos = photos[activeCategory as keyof GroupedPhotos] || [];
  const totalPhotos = Object.values(photos).reduce((sum, arr) => sum + arr.length, 0);

  const handleUploadComplete = useCallback(
    async (res: any[]) => {
      if (!res || res.length === 0) return;

      const files = res.map((file) => ({
        url: file.ufsUrl || file.url,
        thumbnail: null,
      }));

      try {
        const response = await fetch(`/api/contractor/jobs/${jobId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files,
            category: activeCategory,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPhotos((prev) => ({
            ...prev,
            [activeCategory]: [...data.photos, ...prev[activeCategory as keyof GroupedPhotos]],
          }));
          setShowUploader(false);
          toast({
            title: 'Photos Uploaded',
            description: `${files.length} photo${files.length > 1 ? 's' : ''} added to ${CATEGORY_CONFIG[activeCategory]?.label}`,
          });
        }
      } catch (error) {
        console.error('Error saving photos:', error);
        toast({ title: 'Error', description: 'Failed to save photos', variant: 'destructive' });
      }
    },
    [jobId, activeCategory, toast]
  );

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return;

    try {
      const response = await fetch(`/api/contractor/jobs/${jobId}/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPhotos((prev) => ({
          ...prev,
          [activeCategory]: prev[activeCategory as keyof GroupedPhotos].filter(
            (p) => p.id !== photoId
          ),
        }));
        if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);
        toast({ title: 'Photo deleted' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete photo', variant: 'destructive' });
    }
  };

  const toggleVisibility = async (photoId: string, visible: boolean) => {
    try {
      await fetch(`/api/contractor/jobs/${jobId}/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleToCustomer: visible }),
      });

      setPhotos((prev) => ({
        ...prev,
        [activeCategory]: prev[activeCategory as keyof GroupedPhotos].map((p) =>
          p.id === photoId ? { ...p, visibleToCustomer: visible } : p
        ),
      }));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update visibility', variant: 'destructive' });
    }
  };

  const openLightbox = (photo: Photo, index: number) => {
    setLightboxPhoto(photo);
    setLightboxIndex(index);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? lightboxIndex - 1 : lightboxIndex + 1;
    if (newIndex >= 0 && newIndex < currentPhotos.length) {
      setLightboxIndex(newIndex);
      setLightboxPhoto(currentPhotos[newIndex]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            Job Photos
          </h3>
          <p className="text-sm text-gray-500">{totalPhotos} photos across all categories</p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => setShowUploader(!showUploader)}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const count = photos[key as keyof GroupedPhotos]?.length || 0;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {config.label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeCategory === key ? 'bg-white/20' : 'bg-gray-200'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upload area */}
      {showUploader && !readOnly && (
        <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-4">
          <p className="text-sm text-blue-700 mb-3 font-medium">
            Uploading to: {CATEGORY_CONFIG[activeCategory]?.label} — {CATEGORY_CONFIG[activeCategory]?.description}
          </p>
          <UploadDropzone
            endpoint="jobMedia"
            onClientUploadComplete={handleUploadComplete}
            onUploadError={(error: Error) => {
              toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
            }}
          />
        </div>
      )}

      {/* Photo grid */}
      {currentPhotos.length === 0 ? (
        <div className="rounded-xl border-2 border-gray-200 bg-white p-12 text-center">
          <Camera className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No {CATEGORY_CONFIG[activeCategory]?.label.toLowerCase()} photos yet</p>
          {!readOnly && (
            <p className="text-sm text-gray-400 mt-1">
              {CATEGORY_CONFIG[activeCategory]?.description}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {currentPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative rounded-xl overflow-hidden border-2 border-gray-200 bg-white aspect-square cursor-pointer"
              onClick={() => openLightbox(photo, index)}
            >
              <img
                src={photo.thumbnail || photo.url}
                alt={photo.caption || 'Job photo'}
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between">
                    {!photo.visibleToCustomer && (
                      <Badge className="bg-gray-800/80 text-white text-xs">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                    {!readOnly && (
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVisibility(photo.id, !photo.visibleToCustomer);
                          }}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-700"
                        >
                          {photo.visibleToCustomer ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo.id);
                          }}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={() => setLightboxPhoto(null)}
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('prev');
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {lightboxIndex < currentPhotos.length - 1 && (
            <button
              className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('next');
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <img
            src={lightboxPhoto.url}
            alt={lightboxPhoto.caption || 'Job photo'}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {lightboxPhoto.caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg">
              <p className="text-white text-sm">{lightboxPhoto.caption}</p>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            {lightboxIndex + 1} / {currentPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
