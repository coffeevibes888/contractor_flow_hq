'use client';

import React, { useState } from 'react';
import {
  Star, Search, Filter, MessageCircle, ThumbsUp, ThumbsDown,
  ChevronRight, Calendar, MapPin, TrendingUp, Award,
  ArrowUpRight, Reply, CheckCircle2,
} from 'lucide-react';

const reviews = [
  { id: 1, guest: 'Sarah Johnson', avatar: 'SJ', property: 'Oceanview Suite', rating: 5, date: 'May 1, 2026', channel: 'Airbnb', text: 'Absolutely stunning views! The place was spotless and had everything we needed. The host was incredibly responsive and helpful. Would definitely stay again!', responded: true, categories: { cleanliness: 5, communication: 5, checkin: 5, accuracy: 5, location: 5, value: 4.5 } },
  { id: 2, guest: 'Michael Chen', avatar: 'MC', property: 'Downtown Loft', rating: 4, date: 'Apr 28, 2026', channel: 'VRBO', text: 'Great location in the heart of downtown. Modern and clean. Only minor issue was street noise at night, but earplugs were provided which was thoughtful.', responded: false, categories: { cleanliness: 4.5, communication: 5, checkin: 4, accuracy: 4, location: 5, value: 4 } },
  { id: 3, guest: 'Emma Williams', avatar: 'EW', property: 'Mountain Cabin', rating: 5, date: 'Apr 25, 2026', channel: 'Direct', text: 'The perfect mountain getaway! Cozy cabin with amazing views of the mountains. The hot tub was a wonderful bonus. We did not want to leave!', responded: true, categories: { cleanliness: 5, communication: 5, checkin: 5, accuracy: 5, location: 5, value: 5 } },
  { id: 4, guest: 'James Rodriguez', avatar: 'JR', property: 'Beachfront Villa', rating: 5, date: 'Apr 22, 2026', channel: 'Booking.com', text: 'Incredible villa right on the beach. The pool was amazing and the house was beautifully decorated. Perfect for our family vacation. Highly recommend!', responded: true, categories: { cleanliness: 5, communication: 5, checkin: 5, accuracy: 5, location: 5, value: 4.5 } },
  { id: 5, guest: 'Lisa Thompson', avatar: 'LT', property: 'Oceanview Suite', rating: 4, date: 'Apr 18, 2026', channel: 'Airbnb', text: 'Beautiful suite with great ocean views. Very comfortable bed and nice amenities. The kitchen could use a few more cooking utensils but overall a wonderful stay.', responded: false, categories: { cleanliness: 4.5, communication: 4, checkin: 5, accuracy: 4, location: 5, value: 4 } },
  { id: 6, guest: 'David Park', avatar: 'DP', property: 'Urban Studio', rating: 3, date: 'Apr 15, 2026', channel: 'Airbnb', text: 'Decent studio for the price. Location was convenient but the space was smaller than expected from the photos. Clean though and the host was responsive.', responded: true, categories: { cleanliness: 4, communication: 4, checkin: 3, accuracy: 3, location: 4, value: 3 } },
];

export default function STRReviewsPage() {
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [responseFilter, setResponseFilter] = useState<'all' | 'responded' | 'pending'>('all');

  const filtered = reviews.filter((r) => {
    if (ratingFilter !== null && r.rating !== ratingFilter) return false;
    if (responseFilter === 'responded' && !r.responded) return false;
    if (responseFilter === 'pending' && r.responded) return false;
    return true;
  });

  const avgRating = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(2);
  const fiveStarPct = Math.round((reviews.filter((r) => r.rating === 5).length / reviews.length) * 100);

  return (
    <div className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl font-bold text-black'>Reviews</h1>
        <p className='text-xs text-gray-500'>Guest ratings, feedback, and response management</p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-medium'>Overall Rating</p>
          <div className='flex items-center gap-1.5 mt-1'>
            <Star className='h-5 w-5 text-amber-400 fill-amber-400' />
            <span className='text-xl font-bold text-gray-900'>{avgRating}</span>
          </div>
          <p className='text-[10px] text-gray-400 mt-0.5'>{reviews.length} total reviews</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-medium'>5-Star Rate</p>
          <p className='text-xl font-bold text-emerald-600 mt-1'>{fiveStarPct}%</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>{reviews.filter((r) => r.rating === 5).length} five-star reviews</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-medium'>Response Rate</p>
          <p className='text-xl font-bold text-blue-600 mt-1'>{Math.round((reviews.filter((r) => r.responded).length / reviews.length) * 100)}%</p>
          <p className='text-[10px] text-gray-400 mt-0.5'>{reviews.filter((r) => !r.responded).length} pending</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <p className='text-[10px] text-gray-500 font-medium'>Superhost Status</p>
          <div className='flex items-center gap-1.5 mt-1'>
            <Award className='h-5 w-5 text-amber-500' />
            <span className='text-sm font-bold text-amber-600'>Qualified</span>
          </div>
          <p className='text-[10px] text-gray-400 mt-0.5'>4.8+ avg required</p>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <h3 className='text-sm font-bold text-gray-800 mb-3'>Rating Distribution</h3>
        <div className='space-y-1.5'>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = reviews.filter((r) => r.rating === rating).length;
            const pct = Math.round((count / reviews.length) * 100);
            return (
              <button
                key={rating}
                onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)}
                className={`w-full flex items-center gap-2 p-1 rounded-lg transition-colors ${
                  ratingFilter === rating ? 'bg-cyan-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className='text-xs font-medium text-gray-600 w-4'>{rating}</span>
                <Star className='h-3 w-3 text-amber-400 fill-amber-400' />
                <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
                  <div className='h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full' style={{ width: `${pct}%` }} />
                </div>
                <span className='text-[10px] text-gray-500 w-8 text-right'>{pct}%</span>
                <span className='text-[10px] text-gray-400 w-6 text-right'>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className='flex gap-2'>
        {(['all', 'responded', 'pending'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setResponseFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
              responseFilter === f
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Reviews' : f === 'responded' ? 'Responded' : 'Needs Response'}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className='space-y-3'>
        {filtered.map((review) => (
          <div key={review.id} className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all'>
            <div className='flex items-start justify-between'>
              <div className='flex items-start gap-3'>
                <div className='h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0'>
                  {review.avatar}
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-sm font-bold text-gray-800'>{review.guest}</h3>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      review.channel === 'Airbnb' ? 'bg-red-50 text-red-600' :
                      review.channel === 'VRBO' ? 'bg-blue-50 text-blue-600' :
                      review.channel === 'Booking.com' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {review.channel}
                    </span>
                  </div>
                  <div className='flex items-center gap-2 mt-0.5'>
                    <div className='flex items-center gap-0.5'>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <span className='text-[10px] text-gray-400'>{review.date}</span>
                  </div>
                  <p className='text-[11px] text-gray-500 mt-0.5'>
                    <MapPin className='h-3 w-3 inline mr-0.5' />{review.property}
                  </p>
                </div>
              </div>
              {!review.responded && (
                <button className='flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors'>
                  <Reply className='h-3 w-3' /> Respond
                </button>
              )}
            </div>
            <p className='text-xs text-gray-700 leading-relaxed mt-3'>{review.text}</p>
            {review.responded && (
              <div className='mt-2 flex items-center gap-1 text-[10px] text-emerald-600'>
                <CheckCircle2 className='h-3 w-3' /> Response sent
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckCircle2Icon(props: React.SVGProps<SVGSVGElement>) {
  return <CheckCircle2 {...(props as any)} />;
}
