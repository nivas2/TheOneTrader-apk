'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface LeadCaptureModalProps {
  delay?: number;
  sessionKey?: string;
  showEveryVisit?: boolean;
}

export default function LeadCaptureModal({ delay = 0, sessionKey = 'leadModalSeen', showEveryVisit = false }: LeadCaptureModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      if (showEveryVisit) {
        if (delay > 0) {
          const timer = setTimeout(() => setIsOpen(true), delay);
          return () => clearTimeout(timer);
        } else {
          setIsOpen(true);
        }
        return;
      }
      const hasSeenModal = sessionStorage.getItem(sessionKey);
      if (!hasSeenModal) {
        if (delay > 0) {
          const timer = setTimeout(() => setIsOpen(true), delay);
          return () => clearTimeout(timer);
        } else {
          setIsOpen(true);
        }
      }
    } catch {
      setIsOpen(true);
    }
  }, [delay, sessionKey, showEveryVisit]);

  const handleClose = () => {
    try { sessionStorage.setItem(sessionKey, 'true'); } catch {}
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/public/leads', formData);
      toast.success('Thank you for your interest!');
      handleClose();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111118] border border-white/10 rounded-2xl max-w-md w-full p-8">
        {/* Limited Offer Badge */}
        <div className="flex justify-center mb-4">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-brand-emerald border border-brand-emerald/30 animate-shimmer"
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(0,176,144,0.1) 50%, transparent 100%)', backgroundSize: '200% 100%' }}
          >
            Limited Time Offer
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">Get Premium Trading Signals</h2>
        <p className="text-gray-400 mb-6 text-center">Enter your details to get started with expert-curated trading insights.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your Name"
            className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-transparent"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-transparent"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-transparent"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <button
            type="submit"
            className="w-full bg-brand-emerald text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Get Access'}
          </button>
        </form>

        {/* Social proof */}
        <p className="text-center text-xs text-gray-500 mt-4">Join 2,500+ traders already profiting</p>

        <button onClick={handleClose} className="w-full text-center text-sm text-gray-500 mt-3 hover:text-gray-400 transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}
