'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-brand-emerald">TheOneTrade</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-text-body hover:text-brand-emerald transition-colors">
              Home
            </Link>
            {user && (
              <Link href="/signals" className="text-text-body hover:text-brand-emerald transition-colors">
                Signals
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href={user.role === 'ADMIN' ? '/admin/dashboard' : '/signals'}
                  className="text-text-body hover:text-brand-emerald"
                >
                  {user.name}
                </Link>
                <button onClick={logout} className="btn-secondary text-sm py-2 px-4">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-text-body hover:text-brand-emerald">
                  Login
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-4">
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
