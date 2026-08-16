'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, X, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import Image from 'next/image';
import type { EvidenceUploadProps, UploadedEvidence } from '@/types/tenant-lifecycle';

export function EvidenceUpload({
  onUpload,
  existingFiles,
  onRemove,
}: EvidenceUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedFiles: UploadedEvidence[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          toast({
            variant: 'destructive',
            description: `${file.name} is not a valid image or video file.`,
          });
          continue;
        }

        // Validate file size
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            variant: 'destructive',
            description: `${file.name} is too large. Max size: ${isVideo ? '50MB' : '10MB'}`,
          });
          continue;
        }

        // Upload to server
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/deposits/upload-evidence', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || `Failed to upload ${file.name}`);
        }

        uploadedFiles.push({
          url: data.url,
          publicId: data.publicId,
          type: isVideo ? 'video' : 'image',
          fileName: file.name,
        });
      }

      if (uploadedFiles.length > 0) {
        onUpload([...existingFiles, ...uploadedFiles]);
        toast({
          description: `${uploadedFiles.length} file(s) uploaded successfully.`,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        description: error?.message || 'Failed to upload files',
      });
    } finally {
      setUploading(false);
      // Reset inputs
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-slate-200">Evidence Photos/Videos</Label>

      {/* Upload Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 border-dashed border-white/20 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="w-5 h-5 mr-2" />
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 border-dashed border-white/20 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-5 h-5 mr-2" />
          Upload
        </Button>
      </div>

      {/* Hidden Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload Progress */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/60 rounded-lg p-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading...
        </div>
      )}

      {/* Preview Grid */}
      {existingFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {existingFiles.map((file, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-white/10"
            >
              {file.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <Video className="w-8 h-8 text-slate-500" />
                </div>
              ) : (
                <Image
                  src={file.url}
                  alt={file.fileName}
                  fill
                  className="object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                <p className="text-[10px] text-white truncate">{file.fileName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {existingFiles.length === 0 && !uploading && (
        <div className="text-center py-4 text-sm text-slate-500">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No evidence uploaded yet</p>
          <p className="text-xs mt-1">Take photos or upload files to document damages</p>
        </div>
      )}
    </div>
  );
}
