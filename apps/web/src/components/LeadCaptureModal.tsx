'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

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

const LEAD_SUBMITTED_KEY = 'leadFormSubmitted';

interface LeadCaptureModalProps {
  sessionKey?: string;
}

export default function LeadCaptureModal({ sessionKey = 'leadModalSeen' }: LeadCaptureModalProps) {
  const { user, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ModalSettings>(DEFAULT_SETTINGS);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
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
    if (isLoading) return;

    // Don't show modal if user is logged in
    if (user) return;

    // Don't show modal if user already submitted the lead form
    try {
      if (localStorage.getItem(LEAD_SUBMITTED_KEY)) return;
    } catch {}

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
  }, [settings.delayMs, settings.showEveryVisit, sessionKey, user, isLoading]);

  const handleClose = () => {
    try { sessionStorage.setItem(sessionKey, 'true'); } catch {}
    setIsOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; email?: string; phone?: string } = {};

    // Name: at least 2 characters
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = 'Name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email: proper format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Enter a valid email address';
    }

    // Phone: exactly 10 digits
    const digitsOnly = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (digitsOnly.length !== 10) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.replace(/\D/g, ''),
      };
      await api.post('/public/leads', payload);
      toast.success(settings.successMessage);
      try { localStorage.setItem(LEAD_SUBMITTED_KEY, 'true'); } catch {}
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
          <div>
            <input
              type="text"
              placeholder="Your Name"
              className={`input-field ${errors.name ? 'border-red-500' : ''}`}
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <input
              type="email"
              placeholder="Email Address"
              className={`input-field ${errors.email ? 'border-red-500' : ''}`}
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <input
              type="tel"
              placeholder="Phone Number"
              className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
              maxLength={10}
              value={formData.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData({ ...formData, phone: val });
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
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
