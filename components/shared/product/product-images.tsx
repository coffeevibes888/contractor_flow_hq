'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const ProductImages = ({ 
  images, 
  activeImage, 
  onImageClick,
  colorName
}: { 
  images: string[]; 
  activeImage?: string;
  onImageClick?: (image: string) => void;
  colorName?: string;
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const activeIndex = images.findIndex(img => img === activeImage);
    if (activeIndex !== -1) {
      setCurrent(activeIndex);
    }
  }, [activeImage, images]);

  const handleThumbnailClick = (image: string, index: number) => {
    setCurrent(index);
    if (onImageClick) {
      onImageClick(image);
    }
  };

  if (!images.length) return null;

  return (
    <div className='space-y-4'>
      <div className='relative'>
        <Image
          src={activeImage || images[current]}
          alt='product image'
          width={1000}
          height={1000}
          className='min-h-[300px] object-cover object-center'
        />
        {colorName && (
          <div className='absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-md backdrop-blur-sm'>
            <span className='text-sm font-medium'>{colorName}</span>
          </div>
        )}
      </div>
      <div className='flex'>
        {images.map((image, index) => (
          <div
            key={image}
            onClick={() => handleThumbnailClick(image, index)}
            className={cn(
              'border mr-2 cursor-pointer hover:border-orange-600',
              current === index && 'border-orange-500'
            )}
          >
            <Image src={image} alt='image' width={100} height={100} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductImages;
