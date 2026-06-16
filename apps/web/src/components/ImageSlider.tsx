'use client';

import { useState, useEffect } from 'react';

interface ImageSliderProps {
  images: string[];
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="bg-gradient-to-r from-brand-emerald to-teal-600 text-white py-24 px-8 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">The One Trade</h1>
        <p className="text-xl md:text-2xl opacity-90 mb-8">Expert Trading Signals for Indian Markets</p>
        <a href="/login" className="inline-block bg-white text-brand-emerald px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
          Start Trading Smarter
        </a>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden h-[400px]">
      {images.map((src, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img src={src} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
        </div>
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full ${i === current ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
