'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StarRating from '@/components/StarRating';
import toast from 'react-hot-toast';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = () => {
    setIsLoading(true);
    api.get('/admin/reviews/all')
      .then((res) => setReviews(res.data.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleModerate = async (id: string, status: string, displayOnLandingPage?: boolean) => {
    try {
      const payload: any = { status };
      if (displayOnLandingPage !== undefined) {
        payload.displayOnLandingPage = displayOnLandingPage;
      }
      await api.put(`/admin/reviews/${id}/moderate`, payload);
      toast.success(`Review ${status.toLowerCase()}`);
      fetchReviews();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Update failed');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {reviews.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-body">No reviews yet.</p>
        </div>
      ) : (
        reviews.map((review) => (
          <div key={review._id} className="card">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="font-bold">{review.userName}</h3>
                  <span className="text-xs text-gray-400">{review.planType}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    review.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    review.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {review.status}
                  </span>
                </div>
                <StarRating rating={review.rating} readonly />
                <p className="mt-2 text-text-body">{review.comment}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(review.createdAt).toLocaleString()}</p>
              </div>

              <div className="flex sm:flex-col gap-2 sm:items-end flex-shrink-0">
                {review.status === 'PENDING_REVIEW' && (
                  <>
                    <button
                      onClick={() => handleModerate(review._id, 'APPROVED', true)}
                      className="text-xs bg-signal-green text-white px-3 py-1.5 rounded hover:opacity-90 min-h-[36px]"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleModerate(review._id, 'REJECTED')}
                      className="text-xs bg-signal-red text-white px-3 py-1.5 rounded hover:opacity-90 min-h-[36px]"
                    >
                      Reject
                    </button>
                  </>
                )}
                {review.status === 'APPROVED' && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={review.displayOnLandingPage}
                      onChange={(e) => handleModerate(review._id, 'APPROVED', e.target.checked)}
                      className="rounded border-gray-300 text-brand-emerald focus:ring-brand-emerald"
                    />
                    Show on Landing
                  </label>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
