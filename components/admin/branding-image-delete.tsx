'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import {
  deleteLandlordLogo,
  deleteLandlordHeroImage,
  deleteAllLandlordHeroImages,
  deleteLandlordAboutPhoto,
  deleteLandlordAboutGalleryImage,
  deleteAllLandlordAboutGallery,
} from '@/lib/actions/landlord.actions';

interface DeleteButtonProps {
  onDelete: () => Promise<{ success: boolean; message?: string }>;
  label?: string;
  confirmMessage?: string;
  variant?: 'icon' | 'button';
  className?: string;
}

function DeleteButton({ onDelete, label = 'Delete', confirmMessage, variant = 'icon', className = '' }: DeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await onDelete();
      if (result.success) {
        router.refresh();
      } else {
        alert(result.message || 'Failed to delete');
      }
      setShowConfirm(false);
    });
  };

  if (showConfirm) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className='text-xs text-red-300'>{confirmMessage || 'Delete?'}</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className='rounded-full bg-red-500 p-1.5 text-white hover:bg-red-400 disabled:opacity-50'
        >
          {isPending ? (
            <div className='h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin' />
          ) : (
            <Trash2 className='h-3 w-3' />
          )}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className='rounded-full bg-slate-600 p-1.5 text-white hover:bg-slate-500'
        >
          <X className='h-3 w-3' />
        </button>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className={`rounded-full bg-red-500/80 p-1.5 text-white hover:bg-red-500 transition-colors ${className}`}
        title={label}
      >
        <Trash2 className='h-3.5 w-3.5' />
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/30 transition-colors ${className}`}
    >
      <Trash2 className='h-3.5 w-3.5' />
      {label}
    </button>
  );
}

export function DeleteLogoButton() {
  return (
    <DeleteButton
      onDelete={deleteLandlordLogo}
      label='Remove logo'
      confirmMessage='Remove logo?'
      variant='button'
    />
  );
}

export function DeleteHeroImageButton({ imageUrl }: { imageUrl: string }) {
  return (
    <DeleteButton
      onDelete={() => deleteLandlordHeroImage(imageUrl)}
      label='Delete'
      confirmMessage='Delete?'
      variant='icon'
      className='absolute top-2 right-2'
    />
  );
}

export function DeleteAllHeroImagesButton() {
  return (
    <DeleteButton
      onDelete={deleteAllLandlordHeroImages}
      label='Remove all hero images'
      confirmMessage='Remove all?'
      variant='button'
    />
  );
}

export function DeleteAboutPhotoButton() {
  return (
    <DeleteButton
      onDelete={deleteLandlordAboutPhoto}
      label='Remove'
      confirmMessage='Remove?'
      variant='icon'
      className='absolute top-2 right-2'
    />
  );
}

export function DeleteAboutGalleryImageButton({ imageUrl }: { imageUrl: string }) {
  return (
    <DeleteButton
      onDelete={() => deleteLandlordAboutGalleryImage(imageUrl)}
      label='Delete'
      confirmMessage='Delete?'
      variant='icon'
      className='absolute top-1 right-1'
    />
  );
}

export function DeleteAllAboutGalleryButton() {
  return (
    <DeleteButton
      onDelete={deleteAllLandlordAboutGallery}
      label='Remove all gallery images'
      confirmMessage='Remove all?'
      variant='button'
    />
  );
}
