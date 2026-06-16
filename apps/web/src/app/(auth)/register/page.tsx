'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function FieldError({ msg }: { msg: string }) {
  return msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    api.get('/config/public')
      .then((res) => setTermsContent(res.data.data.termsAndConditions || ''))
      .catch(() => {});
  }, []);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!EMAIL_RE.test(value)) return 'Enter a valid email address';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!PHONE_RE.test(value)) return 'Enter a valid 10-digit Indian mobile number';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      default: return '';
    }
  };

  const validateAll = (data: typeof formData) => {
    const errs: Record<string, string> = {};
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      const msg = validateField(key, data[key]);
      if (msg) errs[key] = msg;
    }
    setErrors(errs);
    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const msg = validateField(field, formData[field as keyof typeof formData]);
    setErrors((prev) => msg ? { ...prev, [field]: msg } : (() => { const n = { ...prev }; delete n[field]; return n; })());
  };

  const handleChange = (field: string, value: string) => {
    const cleaned = field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setFormData((prev) => ({ ...prev, [field]: cleaned }));
    if (touched[field]) {
      const msg = validateField(field, cleaned);
      setErrors((prev) => msg ? { ...prev, [field]: msg } : (() => { const n = { ...prev }; delete n[field]; return n; })());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true });
    const errs = validateAll(formData);
    if (Object.keys(errs).length > 0) return;
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms & Conditions');
      return;
    }
    setIsLoading(true);
    try {
      await register(formData);
      toast.success('Registration successful! Please check your email for OTP.');
      router.push(`/verify?email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (field: string) =>
    `input-field ${touched[field] && errors[field] ? 'border-red-400 focus:ring-red-400' : ''}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray py-12 px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-emerald">TheOneTrade</h1>
          <p className="text-text-body mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-text-heading mb-1">Full Name</label>
            <input
              type="text"
              className={inputCls('name')}
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="John Doe"
            />
            {touched.name && <FieldError msg={errors.name || ''} />}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-heading mb-1">Email</label>
            <input
              type="email"
              className={inputCls('email')}
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="your@email.com"
            />
            {touched.email && <FieldError msg={errors.email || ''} />}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-heading mb-1">Phone</label>
            <input
              type="tel"
              className={inputCls('phone')}
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="9876543210"
              maxLength={10}
              inputMode="numeric"
            />
            {touched.phone && <FieldError msg={errors.phone || ''} />}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-heading mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={inputCls('password')}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            {touched.password && <FieldError msg={errors.password || ''} />}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="rounded border-gray-300 text-brand-emerald focus:ring-brand-emerald"
            />
            I agree to the{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-brand-emerald font-medium hover:underline"
            >
              Terms & Conditions
            </button>
          </label>

          <button type="submit" className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-text-body mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-emerald font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-text-heading">Terms & Conditions</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {termsContent ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-text-body">
                  {termsContent}
                </div>
              ) : (
                <p className="text-text-body text-center">Terms & Conditions content is not available yet.</p>
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowTermsModal(false)}
                className="btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
