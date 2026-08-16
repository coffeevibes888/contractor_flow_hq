'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, ThumbsUp, CheckCircle2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewsListProps {
  reviews: any[];
  stats: any;
  onWriteReview?: () => void;
  canWriteReview?: boolean;
}

export function ReviewsList({
  reviews,
  stats,
  onWriteReview,
  canWriteReview = false,
}: ReviewsListProps) {
  const [sortBy, setSortBy] = useState('recent');
  const [filterRating, setFilterRating] = useState('all');

  // Filter and sort reviews
  let filteredReviews = [...reviews];

  if (filterRating !== 'all') {
    const rating = parseInt(filterRating);
    filteredReviews = filteredReviews.filter(
      (r) => Math.floor(r.overallRating) === rating
    );
  }

  if (sortBy === 'recent') {
    filteredReviews.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (sortBy === 'highest') {
    filteredReviews.sort((a, b) => b.overallRating - a.overallRating);
  } else if (sortBy === 'lowest') {
    filteredReviews.sort((a, b) => a.overallRating - b.overallRating);
  } else if (sortBy === 'helpful') {
    filteredReviews.sort((a, b) => b.helpfulCount - a.helpfulCount);
  }

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((r) => Math.floor(r.overallRating) === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Reviews</CardTitle>
            {canWriteReview && onWriteReview && (
              <Button onClick={onWriteReview}>Write a Review</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(stats.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-muted-foreground">
                Based on {stats.totalReviews} reviews
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-8">{rating} ★</span>
                  <Progress value={percentage} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Averages */}
          {stats.categoryAverages && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-4">Rating Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(stats.categoryAverages).map(([key, value]: any) => {
                  if (!value) return null;
                  return (
                    <div key={key} className="text-center">
                      <div className="text-2xl font-bold">{value.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {key}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="highest">Highest Rated</SelectItem>
            <SelectItem value="lowest">Lowest Rated</SelectItem>
            <SelectItem value="helpful">Most Helpful</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-muted-foreground">
              {filterRating !== 'all'
                ? 'No reviews match your filter'
                : 'No reviews yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const [showFullComment, setShowFullComment] = useState(false);
  const commentPreview = review.comment.slice(0, 300);
  const needsTruncation = review.comment.length > 300;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <Avatar className="w-12 h-12">
            <AvatarImage src={review.customer?.image} />
            <AvatarFallback>
              {review.customer?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {review.customer?.name || 'Anonymous'}
                  </span>
                  {review.verified && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(review.createdAt), 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= review.overallRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Title */}
            {review.title && (
              <h4 className="font-semibold">{review.title}</h4>
            )}

            {/* Project Info */}
            {(review.projectType || review.projectCost) && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                {review.projectType && <span>Project: {review.projectType}</span>}
                {review.projectCost && (
                  <span>Cost: ${review.projectCost.toLocaleString()}</span>
                )}
              </div>
            )}

            {/* Comment */}
            <p className="text-muted-foreground whitespace-pre-wrap">
              {showFullComment || !needsTruncation
                ? review.comment
                : `${commentPreview}...`}
            </p>
            {needsTruncation && (
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setShowFullComment(!showFullComment)}
              >
                {showFullComment ? 'Show less' : 'Read more'}
              </Button>
            )}

            {/* Detailed Ratings */}
            {(review.qualityRating ||
              review.communicationRating ||
              review.timelinessRating) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {review.qualityRating && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Quality:</span>
                    <span className="font-medium">{review.qualityRating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
                {review.communicationRating && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Communication:</span>
                    <span className="font-medium">{review.communicationRating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
                {review.timelinessRating && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Timeliness:</span>
                    <span className="font-medium">{review.timelinessRating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
              </div>
            )}

            {/* Contractor Response */}
            {review.contractorResponse && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-sm">Contractor Response</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(review.respondedAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-blue-900">{review.contractorResponse}</p>
              </div>
            )}

            {/* Helpful */}
            <div className="flex items-center gap-2 pt-2">
              <Button variant="ghost" size="sm">
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful ({review.helpfulCount})
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
