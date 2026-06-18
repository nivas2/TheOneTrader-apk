'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const SEGMENTS = [
  { label: 'Intraday', id: 'intraday' },
  { label: 'F&O', id: 'fno' },
  { label: 'MTF', id: 'mtf' },
  { label: 'Long Term', id: 'longterm' },
  { label: 'Short Term', id: 'shortterm' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className={
        isHome
          ? 'bg-[#0A0A0F]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40'
          : 'bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40'
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-brand-emerald">TheOneTrade</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className={
                isHome
                  ? 'text-gray-300 hover:text-brand-emerald transition-colors'
                  : 'text-text-body hover:text-brand-emerald transition-colors'
              }
            >
              Home
            </Link>
            {isHome &&
              SEGMENTS.map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => scrollToSection(seg.id)}
                  className="text-gray-400 hover:text-brand-emerald transition-colors text-sm"
                >
                  {seg.label}
                </button>
              ))}
            {!isHome && user && (
              <Link
                href="/signals"
                className="text-text-body hover:text-brand-emerald transition-colors"
              >
                Signals
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href={user.role === 'ADMIN' ? '/admin/dashboard' : '/signals'}
                  className={isHome ? 'text-gray-300 hover:text-brand-emerald' : 'text-text-body hover:text-brand-emerald'}
                >
                  {user.name}
                </Link>
                <button
                  onClick={logout}
                  className={
                    isHome
                      ? 'border-2 border-brand-emerald text-brand-emerald text-sm py-2 px-4 rounded-lg font-semibold hover:bg-brand-emerald hover:text-white transition-colors'
                      : 'btn-secondary text-sm py-2 px-4'
                  }
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={isHome ? 'text-gray-300 hover:text-brand-emerald' : 'text-text-body hover:text-brand-emerald'}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={
                    isHome
                      ? 'border-2 border-brand-emerald text-brand-emerald text-sm py-2 px-4 rounded-lg font-semibold hover:bg-brand-emerald hover:text-white transition-colors'
                      : 'btn-primary text-sm py-2 px-4'
                  }
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
