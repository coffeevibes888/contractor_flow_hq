'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Calendar, Briefcase, MessageSquare, Edit } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

type Review = {
  id: string;
  overallRating: any;
  comment: string | null;
  contractorResponse: string | null;
  createdAt: Date;
  contractor: {
    id: string;
    businessName: string | null;
    displayName: string | null;
  };
};

export function CustomerReviewsList({ reviews }: { reviews: Review[] }) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-amber-500 fill-amber-500'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 mb-4">No reviews yet</p>
        <p className="text-sm text-gray-500">
          Complete a job to leave your first review
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 truncate">
                  {review.contractor.businessName || review.contractor.displayName}
                </h4>
                {renderStars(Number(review.overallRating))}
              </div>
              {review.comment && (
                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                  {review.comment}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(review.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
            <Link href={`/customer/reviews/${review.id}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-gray-200"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>

          {/* Contractor Response */}
          {review.contractorResponse && (
            <div className="mt-4 pt-4 border-t-2 border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Contractor Response
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {review.contractorResponse}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
