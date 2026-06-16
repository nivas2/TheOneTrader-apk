'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import StarRating from '@/components/StarRating';
import toast from 'react-hot-toast';

export default function ReviewsPage() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);

  useEffect(() => {
    api.get('/client/reviews/mine').then((res) => setMyReviews(res.data.data || [])).catch(() => {});
    api.get('/client/subscriptions/mine')
      .then((res) => {
        const subs = res.data.data || [];
        const eligible = subs.some((s: any) => s.status === 'ACTIVE' || s.status === 'EXPIRED' || s.status === 'PENDING_ACTIVATION');
        setHasSubscription(eligible);
      })
      .catch(() => setHasSubscription(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/client/reviews', { rating, comment });
      setMyReviews([res.data.data, ...myReviews]);
      setRating(0);
      setComment('');
      toast.success('Review submitted! It will appear after admin approval.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {hasSubscription === false ? (
        <div className="card mb-8 relative overflow-hidden">
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-bold mb-2 text-text-heading">Reviews Locked</h2>
            <p className="text-gray-500 mb-4">
              Only subscribers can write reviews. Subscribe to a plan to share your experience.
            </p>
            <Link href="/payment" className="btn-primary inline-block px-6">
              Subscribe Now
            </Link>
          </div>
        </div>
      ) : hasSubscription ? (
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Write a Review</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-2">Your Rating</label>
              <StarRating rating={rating} onRate={setRating} />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Your Comment</label>
              <textarea
                className="input-field"
                rows={4}
                required
                minLength={5}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with TheOneTrade signals..."
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      ) : null}

      {myReviews.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">My Reviews</h3>
          <div className="space-y-4">
            {myReviews.map((review) => (
              <div key={review._id} className="card">
                <div className="flex justify-between items-start">
                  <StarRating rating={review.rating} readonly />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    review.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    review.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {review.status}
                  </span>
                </div>
                <p className="mt-2 text-text-body">{review.comment}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
