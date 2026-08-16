'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateUserAvatar } from '@/lib/actions/user.actions';
import { UploadButton } from '@/lib/uploadthing';
import { Loader, Upload } from 'lucide-react';

type AvatarUploadProps = {
  currentImage?: string | null;
  userName?: string | null;
};

export default function AvatarUpload({ currentImage, userName }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUploadComplete = async (res: Array<{ url: string }>) => {
    if (res && res[0]) {
      setIsUploading(true);
      try {
        const result = await updateUserAvatar(res[0].url);

        if (!result.success) {
          toast({
            variant: 'destructive',
            description: result.message,
          });
          return;
        }

        setPreview(res[0].url);
        toast({
          description: result.message,
        });
        window.location.reload();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        toast({
          variant: 'destructive',
          description: 'Failed to update avatar',
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-col items-center gap-4'>
        {preview ? (
          <div className='relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200'>
            <Image
              src={preview}
              alt={userName || 'Avatar'}
              fill
              className='object-cover'
              priority
            />
          </div>
        ) : (
          <div className='w-24 h-24 rounded-full bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 flex items-center justify-center'>
            <span className='text-black font-semibold text-2xl'>
              {userName?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        )}
      </div>

      <div className='flex justify-center max-w-xs mx-auto'>
        <UploadButton
          endpoint='imageUploader'
          onClientUploadComplete={handleUploadComplete}
          onUploadError={(error: Error) => {
            toast({
              variant: 'destructive',
              description: `Upload failed: ${error.message}`,
            });
          }}
          content={{
            button: ({ ready }) => (
              <Button
                disabled={!ready || isUploading}
                className='w-auto px-6'
              >
                {isUploading ? (
                  <Loader className='w-4 h-4 animate-spin mr-2' />
                ) : (
                  <Upload className='w-4 h-4 mr-2' />
                )}
                {isUploading ? 'Uploading...' : 'Upload Avatar'}
              </Button>
            ),
            allowedContent: <span className='text-xs text-gray-500'>PNG, JPG up to 4MB</span>,
          }}
        />
      </div>
    </div>
  );
}
