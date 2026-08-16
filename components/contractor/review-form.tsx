'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2 } from 'lucide-react';

interface ReviewFormProps {
  contractorId: string;
  jobId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReviewForm({
  contractorId,
  jobId,
  isOpen,
  onClose,
  onSuccess,
}: ReviewFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ratings, setRatings] = useState({
    overall: 0,
    quality: 0,
    communication: 0,
    timeliness: 0,
    professionalism: 0,
    value: 0,
  });

  const [formData, setFormData] = useState({
    title: '',
    comment: '',
    projectType: '',
    projectCost: '',
  });

  const [hoveredRating, setHoveredRating] = useState<{
    [key: string]: number;
  }>({});

  const ratingCategories = [
    { key: 'overall', label: 'Overall Rating', required: true },
    { key: 'quality', label: 'Quality of Work' },
    { key: 'communication', label: 'Communication' },
    { key: 'timeliness', label: 'Timeliness' },
    { key: 'professionalism', label: 'Professionalism' },
    { key: 'value', label: 'Value for Money' },
  ];

  const handleRatingClick = (category: string, rating: number) => {
    setRatings({ ...ratings, [category]: rating });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (ratings.overall === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please provide an overall rating',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.comment.trim()) {
      toast({
        title: 'Review Required',
        description: 'Please write a review',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contractor/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          jobId,
          overallRating: ratings.overall,
          qualityRating: ratings.quality || null,
          communicationRating: ratings.communication || null,
          timelinessRating: ratings.timeliness || null,
          professionalismRating: ratings.professionalism || null,
          valueRating: ratings.value || null,
          title: formData.title,
          comment: formData.comment,
          projectType: formData.projectType || null,
          projectCost: formData.projectCost ? parseFloat(formData.projectCost) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }

      toast({
        title: 'Review Submitted!',
        description: 'Thank you for your feedback',
      });

      if (onSuccess) onSuccess();
      onClose();
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ category, value, required = false }: any) => (
    <div className="space-y-2">
      <Label>
        {ratingCategories.find((c) => c.key === category)?.label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingClick(category, star)}
            onMouseEnter={() =>
              setHoveredRating({ ...hoveredRating, [category]: star })
            }
            onMouseLeave={() =>
              setHoveredRating({ ...hoveredRating, [category]: 0 })
            }
            className="focus:outline-none"
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hoveredRating[category] || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-muted-foreground self-center">
            {value}.0
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience to help others make informed decisions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Overall Rating */}
          <StarRating category="overall" value={ratings.overall} required />

          {/* Detailed Ratings */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-sm">Detailed Ratings (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StarRating category="quality" value={ratings.quality} />
              <StarRating category="communication" value={ratings.communication} />
              <StarRating category="timeliness" value={ratings.timeliness} />
              <StarRating category="professionalism" value={ratings.professionalism} />
              <StarRating category="value" value={ratings.value} />
            </div>
          </div>

          {/* Review Title */}
          <div>
            <Label htmlFor="title">Review Title (Optional)</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Summarize your experience"
            />
          </div>

          {/* Review Comment */}
          <div>
            <Label htmlFor="comment">Your Review *</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Tell us about your experience with this contractor..."
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 50 characters
            </p>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectType">Project Type</Label>
              <Input
                id="projectType"
                value={formData.projectType}
                onChange={(e) =>
                  setFormData({ ...formData, projectType: e.target.value })
                }
                placeholder="e.g., Kitchen Remodel"
              />
            </div>
            <div>
              <Label htmlFor="projectCost">Project Cost ($)</Label>
              <Input
                id="projectCost"
                type="number"
                value={formData.projectCost}
                onChange={(e) =>
                  setFormData({ ...formData, projectCost: e.target.value })
                }
                placeholder="5000"
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
