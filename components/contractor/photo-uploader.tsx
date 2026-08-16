'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Upload, 
  X, 
  Loader2, 
  CheckCircle2,
  Image as ImageIcon,
  ZoomIn
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface PhotoUploaderProps {
  milestoneId: string;
  minPhotos: number;
  existingPhotos?: string[];
  onUploadComplete: (photoUrls: string[]) => void;
}

export function PhotoUploader({
  milestoneId,
  minPhotos,
  existingPhotos = [],
  onUploadComplete
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validate file types
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      if (!isValid) {
        toast({
          variant: 'destructive',
          description: `${file.name} is not a valid image file`
        });
      }
      return isValid;
    });

    if (validFiles.length === 0) return;

    // Validate file sizes (max 10MB per file)
    const oversizedFiles = validFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        variant: 'destructive',
        description: `Some files are too large. Maximum size is 10MB per file.`
      });
      return;
    }

    await uploadPhotos(validFiles);
  };

  const uploadPhotos = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('milestoneId', milestoneId);

        const response = await fetch(`/api/milestones/${milestoneId}/upload-photos`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        const data = await response.json();
        uploadedUrls.push(data.url);

        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      const newPhotos = [...photos, ...uploadedUrls];
      setPhotos(newPhotos);

      toast({
        description: `✅ ${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully!`
      });

      onUploadComplete(newPhotos);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to upload photos'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = async (photoUrl: string, index: number) => {
    try {
      // Optionally delete from server
      // await fetch(`/api/milestones/${milestoneId}/delete-photo`, {
      //   method: 'DELETE',
      //   body: JSON.stringify({ photoUrl })
      // });

      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
      onUploadComplete(newPhotos);

      toast({
        description: 'Photo removed'
      });
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        variant: 'destructive',
        description: 'Failed to remove photo'
      });
    }
  };

  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const isComplete = photos.length >= minPhotos;

  return (
    <>
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Photo Upload
            </CardTitle>
            <Badge
              variant={isComplete ? 'default' : 'outline'}
              className={isComplete ? 'bg-emerald-500' : ''}
            >
              {photos.length} / {minPhotos} Photos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-700">
              <strong>Instructions:</strong> Upload at least {minPhotos} photo{minPhotos > 1 ? 's' : ''} showing
              the work completed. Photos should be clear and show the relevant details.
            </p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
              <li>Take photos in good lighting</li>
              <li>Include before and after shots if applicable</li>
              <li>Show different angles of the work</li>
              <li>Maximum 10MB per photo</li>
            </ul>
          </div>

          {/* Upload Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={openCamera}
              disabled={uploading}
              variant="outline"
              className="border-2 border-gray-300"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button
              onClick={openFilePicker}
              disabled={uploading}
              variant="outline"
              className="border-2 border-gray-300"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all"
                >
                  <Image
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedPhoto(photo)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removePhoto(photo, index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Photo Number */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {photos.length === 0 && !uploading && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">No photos uploaded yet</p>
              <p className="text-sm text-gray-500">
                Click the buttons above to add photos
              </p>
            </div>
          )}

          {/* Completion Status */}
          {isComplete && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">
                  Photo requirement met! You have uploaded {photos.length} photo{photos.length > 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedPhoto}
              alt="Full size photo"
              fill
              className="object-contain"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
