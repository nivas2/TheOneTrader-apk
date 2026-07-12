'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { useAdminSocket } from '@/hooks/useSocket';
import { requestFCMToken, onForegroundMessage } from '@/lib/firebase';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import api from '@/lib/api';

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/signals', label: 'Create Signal', icon: '⚡' },
  { href: '/admin/signals/history', label: 'Signal History', icon: '📋' },
  { href: '/admin/plans', label: 'Plans & Pricing', icon: '💎' },
  { href: '/admin/payments', label: 'Payments', icon: '💰' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/leads', label: 'Leads', icon: '📩' },
  { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
  { href: '/admin/landing-page', label: 'Landing Page', icon: '🎨' },
  { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/admin/sub-admins', label: 'Sub-Admins', icon: '🔑' },
  { href: '/admin/config', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [pendingPayments, setPendingPayments] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fcmRegistered = useRef(false);
  const { showNotification } = useBrowserNotification();

  const isAdmin = user?.role === 'ADMIN';
  const isSubAdmin = user?.role === 'SUBADMIN';

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN' && user.role !== 'SUBADMIN') {
        router.push('/signals');
      } else if (user.role === 'SUBADMIN') {
        // Block sub-admin from accessing pages not in their allowedPages
        const allowed = user.allowedPages || [];
        if (allowed.length === 0) {
          // No pages assigned — nothing to show
          return;
        }
        const currentLink = adminLinks.find((link) => pathname === link.href || pathname?.startsWith(link.href + '/'));
        if (currentLink && !allowed.includes(currentLink.href)) {
          router.push(allowed[0]);
        }
      }
    }
  }, [user, isLoading, router, pathname]);

  // Register admin FCM token on mount
  useEffect(() => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUBADMIN') || fcmRegistered.current) return;
    fcmRegistered.current = true;

    (async () => {
      try {
        const fcmToken = await requestFCMToken();
        if (fcmToken) {
          await api.post('/auth/device-token', { deviceToken: fcmToken, platform: 'web' }).catch(() => {});
        }
      } catch {
        // FCM not available
      }
    })();
  }, [user]);

  // Listen for foreground FCM messages in admin panel
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || 'TheOneTrade';
      const body = payload.notification?.body || '';
      showNotification(title, body);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [showNotification]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useAdminSocket(
    () => setPendingPayments((p) => p + 1),
    () => {}
  );

  if (isLoading || !user || (user.role !== 'ADMIN' && user.role !== 'SUBADMIN')) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isSubAdmin && (user.allowedPages || []).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-gray-500 text-lg">No pages have been assigned to your account.</p>
        <button onClick={logout} className="text-red-500 hover:underline text-sm">Logout</button>
      </div>
    );
  }

  // Filter sidebar links for sub-admins
  const allowedPages = user.allowedPages || [];
  const visibleLinks = isSubAdmin
    ? adminLinks.filter((link) => allowedPages.includes(link.href))
    : adminLinks;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between flex-shrink-0">
        <Link href="/admin/dashboard" className="flex items-center">
          <Image src="/logo.png" alt="TheOneTrade" width={340} height={127} className="h-12 w-auto" />
        </Link>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
      </div>
      <nav className="mt-4 flex-1 overflow-y-auto">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-between px-6 py-3 text-sm transition-colors ${
              pathname === link.href ? 'bg-white/10 text-brand-emerald' : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-3">
              <span>{link.icon}</span>
              {link.label}
            </span>
            {link.href === '/admin/payments' && pendingPayments > 0 && (
              <span className="bg-signal-red text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {pendingPayments}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="flex-shrink-0 p-4 px-6">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg border border-red-400/30 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="w-64 bg-gray-900 text-white fixed h-full hidden md:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 md:ml-64">
        <header className="bg-white shadow-sm border-b border-gray-100 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-text-heading">
              {adminLinks.find((l) => l.href === pathname)?.label || 'Admin'}
            </h1>
          </div>
          <span className="text-sm text-text-body">{isSubAdmin ? 'Sub-Admin' : 'Admin'}: {user.name}</span>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
