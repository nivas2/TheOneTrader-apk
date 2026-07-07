'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('selectSegment', { detail: id }));
    setMobileOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="TheOneTrade" width={140} height={48} className="h-10 w-auto" priority />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-text-body hover:text-brand-emerald transition-colors">
              Home
            </Link>
            {isHome &&
              SEGMENTS.map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => scrollToSection(seg.id)}
                  className="text-text-body hover:text-brand-emerald transition-colors text-sm font-medium"
                >
                  {seg.label}
                </button>
              ))}
            {user && (
              <Link href="/signals" className="text-text-body hover:text-brand-emerald transition-colors">
                Signals
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <Link
                  href={user.role === 'ADMIN' ? '/admin/dashboard' : '/signals'}
                  className="text-text-body hover:text-brand-emerald hidden sm:inline"
                >
                  {user.name}
                </Link>
                <button onClick={logout} className="btn-secondary text-sm py-2 px-4">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-text-body hover:text-brand-emerald text-sm">
                  Login
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-4">
                  Sign Up
                </Link>
              </>
            )}

            {/* Hamburger button - mobile only */}
            {isHome && (
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && isHome && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-text-body hover:bg-brand-emerald/5 hover:text-brand-emerald transition-colors font-medium"
            >
              Home
            </Link>
            {SEGMENTS.map((seg) => (
              <button
                key={seg.id}
                onClick={() => scrollToSection(seg.id)}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-text-body hover:bg-brand-emerald/5 hover:text-brand-emerald transition-colors text-sm font-medium"
              >
                {seg.label}
              </button>
            ))}
            {user && (
              <Link
                href="/signals"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-text-body hover:bg-brand-emerald/5 hover:text-brand-emerald transition-colors font-medium"
              >
                Signals
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
