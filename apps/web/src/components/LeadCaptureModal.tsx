'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ModalSettings {
  badgeText: string;
  heading: string;
  subheading: string;
  buttonText: string;
  footerText: string;
  successMessage: string;
  skipText: string;
  delayMs: number;
  showEveryVisit: boolean;
}

const DEFAULT_SETTINGS: ModalSettings = {
  badgeText: 'Limited Time Offer',
  heading: 'Get Premium Trading Signals',
  subheading: 'Enter your details to get started with expert-curated trading insights.',
  buttonText: 'Request a Callback',
  footerText: 'Our experts will guide you personally',
  successMessage: 'Thank you for your interest!',
  skipText: 'Skip for now',
  delayMs: 3000,
  showEveryVisit: true,
};

interface LeadCaptureModalProps {
  sessionKey?: string;
}

export default function LeadCaptureModal({ sessionKey = 'leadModalSeen' }: LeadCaptureModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ModalSettings>(DEFAULT_SETTINGS);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get('/public/landing-content/public')
      .then((res) => {
        const modal = res.data?.data?.leadCaptureModal;
        if (modal) {
          setSettings((prev) => ({ ...prev, ...modal }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      if (settings.showEveryVisit) {
        if (settings.delayMs > 0) {
          const timer = setTimeout(() => setIsOpen(true), settings.delayMs);
          return () => clearTimeout(timer);
        } else {
          setIsOpen(true);
        }
        return;
      }
      const hasSeenModal = sessionStorage.getItem(sessionKey);
      if (!hasSeenModal) {
        if (settings.delayMs > 0) {
          const timer = setTimeout(() => setIsOpen(true), settings.delayMs);
          return () => clearTimeout(timer);
        } else {
          setIsOpen(true);
        }
      }
    } catch {
      setIsOpen(true);
    }
  }, [settings.delayMs, settings.showEveryVisit, sessionKey]);

  const handleClose = () => {
    try { sessionStorage.setItem(sessionKey, 'true'); } catch {}
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/public/leads', formData);
      toast.success(settings.successMessage);
      handleClose();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl">
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20">
            {settings.badgeText}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-text-heading mb-2 text-center">{settings.heading}</h2>
        <p className="text-text-body mb-6 text-center">{settings.subheading}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your Name"
            className="input-field"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email Address"
            className="input-field"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            className="input-field"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : settings.buttonText}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">{settings.footerText}</p>

        <button onClick={handleClose} className="w-full text-center text-sm text-gray-400 mt-3 hover:text-gray-600 transition-colors">
          {settings.skipText}
        </button>
      </div>
    </div>
  );
}
