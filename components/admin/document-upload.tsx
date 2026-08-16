'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image as ImageIcon, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { uploadDocument } from '@/lib/actions/document.actions';

interface UploadedFile {
  file: File;
  status: 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

export default function DocumentUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      file,
      status: 'uploading',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileIndex = files.length + i;

      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setFiles((prev) => {
            const updated = [...prev];
            updated[fileIndex] = { ...updated[fileIndex], progress };
            return updated;
          });
        }

        // Upload to Cloudinary or S3 (placeholder)
        const formData = new FormData();
        formData.append('file', file);
        
        // For now, we'll use a placeholder URL
        // In production, you'd upload to Cloudinary/S3 first
        const fileUrl = URL.createObjectURL(file);

        const result = await uploadDocument({
          fileUrl,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });

        if (result.success) {
          setFiles((prev) => {
            const updated = [...prev];
            updated[fileIndex] = {
              ...updated[fileIndex],
              status: 'processing',
              documentId: result.document?.id,
            };
            return updated;
          });

          // Simulate OCR processing
          await new Promise((resolve) => setTimeout(resolve, 2000));

          setFiles((prev) => {
            const updated = [...prev];
            updated[fileIndex] = {
              ...updated[fileIndex],
              status: 'success',
            };
            return updated;
          });

          toast({
            title: 'Document Uploaded',
            description: `${file.name} has been uploaded and is being processed.`,
          });
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        setFiles((prev) => {
          const updated = [...prev];
          updated[fileIndex] = {
            ...updated[fileIndex],
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          };
          return updated;
        });

        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }
  }, [files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Upload Documents</CardTitle>
          <CardDescription className="text-slate-300">
            Upload leases, receipts, applications, or any property-related documents. We'll automatically extract and classify the information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-violet-400 bg-violet-500/10'
                : 'border-white/20 hover:border-violet-400/50 hover:bg-slate-800/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-violet-400" />
            {isDragActive ? (
              <p className="text-lg text-white">Drop the files here...</p>
            ) : (
              <>
                <p className="text-lg text-white mb-2">
                  Drag & drop documents here, or click to select
                </p>
                <p className="text-sm text-slate-400">
                  Supports PDF, JPG, PNG (max 10MB per file)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-white/10"
              >
                <div className="flex-shrink-0">
                  {uploadedFile.file.type.startsWith('image/') ? (
                    <ImageIcon className="h-8 w-8 text-violet-400" />
                  ) : (
                    <FileText className="h-8 w-8 text-violet-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {uploadedFile.status === 'uploading' && (
                    <Progress value={uploadedFile.progress} className="mt-2" />
                  )}
                  {uploadedFile.status === 'processing' && (
                    <p className="text-xs text-violet-400 mt-1">Processing OCR...</p>
                  )}
                  {uploadedFile.status === 'error' && (
                    <p className="text-xs text-red-400 mt-1">{uploadedFile.error}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {uploadedFile.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                  )}
                  {uploadedFile.status === 'processing' && (
                    <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                  )}
                  {uploadedFile.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  )}
                  {uploadedFile.status === 'error' && (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
