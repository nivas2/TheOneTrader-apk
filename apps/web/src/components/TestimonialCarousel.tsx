'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import StarRating from './StarRating';

interface TestimonialCarouselProps {
  dark?: boolean;
  heading?: string;
}

export default function TestimonialCarousel({ dark = false, heading = 'What Our Traders Say' }: TestimonialCarouselProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(1);

  useEffect(() => {
    api.get('/public/reviews/public').then((res) => {
      setReviews(res.data.data || []);
    }).catch(() => {});
  }, []);

  // Responsive page size
  useEffect(() => {
    const updatePageSize = () => {
      setPageSize(window.matchMedia('(min-width: 768px)').matches ? 3 : 1);
    };
    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);

  const totalPages = Math.ceil(reviews.length / pageSize);

  // Reset page when pageSize changes
  useEffect(() => {
    setCurrentPage(0);
  }, [pageSize]);

  const goNext = useCallback(() => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  // Auto-rotate at page level
  useEffect(() => {
    if (totalPages <= 1) return;
    const interval = setInterval(goNext, 8000);
    return () => clearInterval(interval);
  }, [totalPages, goNext]);

  if (reviews.length === 0) return null;

  const startIdx = currentPage * pageSize;
  const visibleReviews = reviews.slice(startIdx, startIdx + pageSize);

  return (
    <section className={dark ? 'py-12 md:py-16 bg-[#0A0A0F]' : 'py-12 md:py-16 bg-brand-gray'}>
      <div className="max-w-6xl mx-auto px-4">
        <h2 className={`text-2xl md:text-3xl font-bold text-center mb-6 md:mb-10 ${dark ? 'text-white' : ''}`}>{heading}</h2>

        <div className="relative">
          {/* Prev Arrow */}
          {totalPages > 1 && (
            <button
              onClick={goPrev}
              className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-6 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                dark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-600 shadow-md'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Reviews Grid */}
          <div className={`grid gap-6 ${pageSize === 3 ? 'md:grid-cols-3' : ''}`}>
            {visibleReviews.map((review) => (
              <div key={review._id} className="px-2">
                <div
                  className={
                    dark
                      ? 'bg-[#111118] border border-white/5 rounded-xl p-6 text-center h-full'
                      : 'card text-center h-full'
                  }
                >
                  <StarRating rating={review.rating} readonly />
                  <p className={`mt-4 mb-4 italic ${dark ? 'text-gray-400' : 'text-text-body'}`}>&ldquo;{review.comment}&rdquo;</p>
                  <p className={`font-semibold ${dark ? 'text-white' : 'text-text-heading'}`}>{review.userName}</p>
                  <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{review.planType} Plan</p>
                </div>
              </div>
            ))}
          </div>

          {/* Next Arrow */}
          {totalPages > 1 && (
            <button
              onClick={goNext}
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-6 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                dark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-600 shadow-md'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Page Dot Indicators */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === currentPage
                    ? 'bg-brand-emerald'
                    : dark
                    ? 'bg-white/20'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
