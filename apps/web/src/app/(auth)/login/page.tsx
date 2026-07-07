'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldError({ msg }: { msg: string }) {
  return msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const validateField = (field: string, value: string): string => {
    if (field === 'email') {
      if (!value.trim()) return 'Email is required';
      if (!EMAIL_RE.test(value)) return 'Enter a valid email address';
    }
    if (field === 'password') {
      if (!value) return 'Password is required';
    }
    return '';
  };

  const setFieldError = (field: string, value: string) => {
    const msg = validateField(field, value);
    setErrors((prev) => {
      if (msg) return { ...prev, [field]: msg };
      const n = { ...prev }; delete n[field]; return n;
    });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldError(field, field === 'email' ? email : password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs: Record<string, string> = {};
    const emailErr = validateField('email', email); if (emailErr) errs.email = emailErr;
    const passErr = validateField('password', password); if (passErr) errs.password = passErr;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsLoading(true);
    setLoginError('');
    try {
      await login(email, password);
      toast.success('Login successful');
      const savedUser = localStorage.getItem('user');
      const userData = savedUser ? JSON.parse(savedUser) : null;
      if (userData?.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/signals');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Login failed. Please check your credentials.';
      setLoginError(msg);
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
          <Image src="/logo.png" alt="TheOneTrade" width={180} height={60} className="h-14 w-auto mx-auto" />
          <p className="text-text-body mt-2">Sign in to your account</p>
        </div>

        {loginError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-text-heading mb-1">Email</label>
            <input
              type="email"
              className={inputCls('email')}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (touched.email) setFieldError('email', e.target.value); }}
              onBlur={() => handleBlur('email')}
              placeholder="your@email.com"
            />
            {touched.email && <FieldError msg={errors.email || ''} />}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-heading mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={inputCls('password')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (touched.password) setFieldError('password', e.target.value); }}
                onBlur={() => handleBlur('password')}
                placeholder="Enter your password"
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

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-brand-emerald hover:underline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-text-body mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-emerald font-medium hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
