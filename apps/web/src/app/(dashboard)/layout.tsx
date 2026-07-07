'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useEffect, useState, useCallback } from 'react';
import { useSignalAlarm } from '@/hooks/useSignalAlarm';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import SignalNotificationPopup from '@/components/SignalNotificationPopup';
import MarqueeBanner from '@/components/MarqueeBanner';
import { onForegroundMessage } from '@/lib/firebase';

const sidebarLinks = [
  { href: '/signals', label: 'Live Signals', icon: '⚡' },
  { href: '/history', label: 'History', icon: '📊' },
  { href: '/payment', label: 'Subscribe', icon: '💳' },
  { href: '/reviews', label: 'Reviews', icon: '⭐' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [popupSignal, setPopupSignal] = useState<any>(null);
  const [popupStatusUpdate, setPopupStatusUpdate] = useState<string | undefined>(undefined);
  const { socket } = useSocket();
  const { startAlarm, stopAlarm } = useSignalAlarm();
  const { requestPermission, showNotification } = useBrowserNotification();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'SUBADMIN') {
        router.push('/admin/signals');
      }
    }
  }, [user, isLoading, router]);

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Listen for new signal events globally (works on ALL pages)
  useEffect(() => {
    if (!socket) return;

    const handleNewSignal = (data: any) => {
      setPopupStatusUpdate(undefined);
      setPopupSignal(data.signal);
      if (data.alarm) {
        startAlarm(data.duration || 30);
      }
      const s = data.signal;
      if (s) {
        showNotification(
          `${s.action} ${s.instrument}`,
          `New ${s.segment} signal: ${s.action} ${s.instrument}`
        );
      }
    };

    const STATUS_LABELS: Record<string, string> = {
      HIT_TARGET: 'Target Hit',
      HIT_SL: 'Stop Loss Hit',
      SAFE_EXIT: 'Safe Exit',
      CANCELLED: 'Cancelled',
    };

    const handleSignalUpdate = (data: any) => {
      const s = data.signal;
      if (s && s.status && s.status !== 'ACTIVE') {
        setPopupStatusUpdate(s.status);
        setPopupSignal(s);
        if (data.alarm) {
          startAlarm(data.duration || 30);
        }
        const statusLabel = STATUS_LABELS[s.status] || s.status;
        showNotification(
          `${s.instrument} — ${statusLabel}`,
          `${s.segment} signal ${s.action} ${s.instrument} is now ${statusLabel}`
        );
      }
    };

    socket.on('signal:new', handleNewSignal);
    socket.on('signal:update', handleSignalUpdate);
    return () => {
      socket.off('signal:new', handleNewSignal);
      socket.off('signal:update', handleSignalUpdate);
    };
  }, [socket, startAlarm, showNotification]);

  // Listen for FCM foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload: any) => {
      const { title, body } = payload.notification || {};
      if (title) {
        showNotification(title, body || '');
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [showNotification]);

  const handlePopupAcknowledge = useCallback(() => {
    stopAlarm();
    setPopupSignal(null);
    setPopupStatusUpdate(undefined);
    if (socket && popupSignal) {
      socket.emit('acknowledge_signal_view', { signalId: popupSignal._id });
    }
    router.push('/signals');
  }, [stopAlarm, socket, popupSignal, router]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-3">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="TheOneTrade" width={340} height={127} className="h-12 w-auto" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/80 hover:text-white text-2xl leading-none">&times;</button>
        </div>
      </div>
      <nav className="mt-1 px-3 space-y-1 flex-1 overflow-y-auto">
        {sidebarLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all ${
              pathname === link.href
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-md shadow-emerald-500/20'
                : 'text-text-body hover:bg-gray-100'
            }`}
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 pt-3 pb-20 md:pb-4 space-y-3">
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/config/app/download`}
          className="block rounded-xl p-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
          download
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Get Android App</div>
              <div className="text-white/75 text-xs">Download APK</div>
            </div>
            <svg className="w-5 h-5 text-white/75 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </div>
        </a>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg border border-red-300 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
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
    <div className="min-h-screen bg-brand-gray flex">
      {/* Global Signal Notification Popup */}
      {popupSignal && (
        <SignalNotificationPopup
          signal={popupSignal}
          onAcknowledge={handlePopupAcknowledge}
          statusUpdate={popupStatusUpdate}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white shadow-sm border-r border-gray-100 fixed h-full hidden md:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 min-w-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-100 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-text-heading">
              {sidebarLinks.find((l) => l.href === pathname)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-body hidden sm:block">Welcome, <span className="font-medium text-brand-emerald">{user.name}</span></span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        <MarqueeBanner />
        <div className="p-4 md:p-6 pb-20 md:pb-6">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around items-center h-16">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                pathname === link.href
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
