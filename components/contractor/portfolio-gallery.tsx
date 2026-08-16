'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface PortfolioGalleryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  videoUrl?: string | null;
  projectDate?: Date | string | null;
  location?: string | null;
  budget?: { toLocaleString: () => string } | null;
  duration?: number | null;
  tags?: string[];
  featured?: boolean;
  viewCount?: number;
  likeCount?: number;
}

interface PortfolioGalleryProps {
  items: Array<PortfolioGalleryItem | string>;
  editable?: boolean;
}

export function PortfolioGallery({
  items,
  editable = false,
}: PortfolioGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<PortfolioGalleryItem | null>(
    null
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const normalizedItems: PortfolioGalleryItem[] = items.map((item, index) =>
    typeof item === 'string'
      ? {
          id: item,
          title: `Portfolio image ${index + 1}`,
          description: '',
          category: 'Portfolio',
          images: [item],
          featured: false,
          tags: [],
          viewCount: 0,
          likeCount: 0,
        }
      : item
  );

  const handlePrevImage = () => {
    if (selectedItem) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedItem.images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (selectedItem) {
      setCurrentImageIndex((prev) =>
        prev === selectedItem.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  if (normalizedItems.length === 0) {
    return (
      <Card>
        <CardContent className='p-12 text-center'>
          <div className='flex flex-col items-center gap-4'>
            <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center'>
              <Eye className='h-8 w-8 text-gray-400' />
            </div>
            <div>
              <h3 className='text-lg font-semibold mb-2'>No Portfolio Items</h3>
              <p className='text-muted-foreground'>
                {editable
                  ? 'Add your first project to showcase your work'
                  : "This contractor hasn't added any portfolio items yet"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {normalizedItems.map((item) => (
          <Card
            key={item.id}
            className='overflow-hidden hover:shadow-lg transition-shadow cursor-pointer'
            onClick={() => {
              setSelectedItem(item);
              setCurrentImageIndex(0);
            }}
          >
            {/* Image */}
            <div className='relative h-48 bg-gray-100'>
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center'>
                  <Eye className='h-12 w-12 text-gray-300' />
                </div>
              )}
              {item.featured && (
                <Badge className='absolute top-2 right-2 bg-yellow-500'>
                  Featured
                </Badge>
              )}
              {item.images && item.images.length > 1 && (
                <Badge
                  variant='secondary'
                  className='absolute bottom-2 right-2'
                >
                  +{item.images.length - 1} more
                </Badge>
              )}
            </div>

            {/* Content */}
            <CardContent className='p-4 space-y-3'>
              <div>
                <h3 className='font-semibold text-lg line-clamp-1'>
                  {item.title}
                </h3>
                <Badge variant='outline' className='mt-1'>
                  {item.category}
                </Badge>
              </div>

              <p className='text-sm text-muted-foreground line-clamp-2'>
                {item.description}
              </p>

              {/* Project Details */}
              <div className='space-y-1 text-sm text-muted-foreground'>
                {item.location && (
                  <div className='flex items-center gap-1'>
                    <MapPin className='h-3 w-3' />
                    {item.location}
                  </div>
                )}
                {item.projectDate && (
                  <div className='flex items-center gap-1'>
                    <Calendar className='h-3 w-3' />
                    {format(new Date(item.projectDate), 'MMM yyyy')}
                  </div>
                )}
                {item.duration && (
                  <div className='flex items-center gap-1'>
                    <Clock className='h-3 w-3' />
                    {item.duration} days
                  </div>
                )}
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                  {item.tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant='secondary' className='text-xs'>
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <Badge variant='secondary' className='text-xs'>
                      +{item.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className='flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t'>
                <div className='flex items-center gap-1'>
                  <Eye className='h-3 w-3' />
                  {item.viewCount || 0}
                </div>
                <div className='flex items-center gap-1'>
                  <Heart className='h-3 w-3' />
                  {item.likeCount || 0}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={() => {
          setSelectedItem(null);
          setCurrentImageIndex(0);
        }}
      >
        <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-2xl'>
              {selectedItem?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className='space-y-6'>
              {/* Image Gallery */}
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div className='relative'>
                  <img
                    src={selectedItem.images[currentImageIndex]}
                    alt={`${selectedItem.title} - Image ${currentImageIndex + 1}`}
                    className='w-full h-96 object-cover rounded-lg'
                  />
                  {selectedItem.images.length > 1 && (
                    <>
                      <Button
                        variant='outline'
                        size='icon'
                        className='absolute left-2 top-1/2 -translate-y-1/2'
                        onClick={handlePrevImage}
                      >
                        <ChevronLeft className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='outline'
                        size='icon'
                        className='absolute right-2 top-1/2 -translate-y-1/2'
                        onClick={handleNextImage}
                      >
                        <ChevronRight className='h-4 w-4' />
                      </Button>
                      <div className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm'>
                        {currentImageIndex + 1} / {selectedItem.images.length}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Category */}
              <Badge variant='outline'>{selectedItem.category}</Badge>

              {/* Description */}
              <div>
                <h3 className='font-semibold mb-2'>Project Description</h3>
                <p className='text-muted-foreground whitespace-pre-wrap'>
                  {selectedItem.description}
                </p>
              </div>

              {/* Project Details */}
              <div className='grid grid-cols-2 gap-4'>
                {selectedItem.location && (
                  <div>
                    <p className='text-sm text-muted-foreground'>Location</p>
                    <p className='font-medium flex items-center gap-1'>
                      <MapPin className='h-4 w-4' />
                      {selectedItem.location}
                    </p>
                  </div>
                )}
                {selectedItem.projectDate && (
                  <div>
                    <p className='text-sm text-muted-foreground'>Completed</p>
                    <p className='font-medium flex items-center gap-1'>
                      <Calendar className='h-4 w-4' />
                      {format(new Date(selectedItem.projectDate), 'MMMM yyyy')}
                    </p>
                  </div>
                )}
                {selectedItem.budget && (
                  <div>
                    <p className='text-sm text-muted-foreground'>Budget</p>
                    <p className='font-medium flex items-center gap-1'>
                      <DollarSign className='h-4 w-4' />$
                      {selectedItem.budget.toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedItem.duration && (
                  <div>
                    <p className='text-sm text-muted-foreground'>Duration</p>
                    <p className='font-medium flex items-center gap-1'>
                      <Clock className='h-4 w-4' />
                      {selectedItem.duration} days
                    </p>
                  </div>
                )}
              </div>

              {/* Tags */}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div>
                  <h3 className='font-semibold mb-2'>Tags</h3>
                  <div className='flex flex-wrap gap-2'>
                    {selectedItem.tags.map((tag: string) => (
                      <Badge key={tag} variant='secondary'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Video */}
              {selectedItem.videoUrl && (
                <div>
                  <h3 className='font-semibold mb-2'>Project Video</h3>
                  <a
                    href={selectedItem.videoUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 hover:underline'
                  >
                    Watch Video →
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
