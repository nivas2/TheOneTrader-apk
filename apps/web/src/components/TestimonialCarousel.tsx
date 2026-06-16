'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StarRating from './StarRating';

export default function TestimonialCarousel() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    api.get('/public/reviews/public').then((res) => {
      setReviews(res.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  if (reviews.length === 0) return null;

  return (
    <section className="py-16 bg-brand-gray">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">What Our Traders Say</h2>
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {reviews.map((review) => (
              <div key={review._id} className="min-w-full px-4">
                <div className="card text-center max-w-lg mx-auto">
                  <StarRating rating={review.rating} readonly />
                  <p className="text-text-body mt-4 mb-4 italic">&ldquo;{review.comment}&rdquo;</p>
                  <p className="font-semibold text-text-heading">{review.userName}</p>
                  <p className="text-sm text-gray-400">{review.planType} Plan</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {reviews.length > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-brand-emerald' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
