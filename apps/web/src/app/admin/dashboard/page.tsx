'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAdminSocket } from '@/hooks/useSocket';

export default function AdminDashboard() {
  const [signalStats, setSignalStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>({ connectedClients: 0, uniqueUsers: [], roomCounts: {}, activeUsers: [] });
  const [usersOpen, setUsersOpen] = useState(false);

  useEffect(() => {
    api.get('/admin/analytics/signals').then((res) => setSignalStats(res.data.data)).catch(() => {});
    api.get('/admin/analytics/users').then((res) => setUserStats(res.data.data)).catch(() => {});
  }, []);

  const onTelemetry = useCallback((data: any) => setTelemetry(data), []);
  useAdminSocket(() => {}, onTelemetry);

  return (
    <div className="space-y-6">
      {/* Live Telemetry */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Live Telemetry
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-brand-gray rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-emerald">{telemetry.connectedClients}</p>
            <p className="text-xs text-gray-500">Connected Clients</p>
          </div>
          <div className="bg-brand-gray rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{telemetry.uniqueUsers?.length || 0}</p>
            <p className="text-xs text-gray-500">Unique Users</p>
          </div>
          {Object.entries(telemetry.roomCounts || {}).slice(0, 2).map(([room, count]) => (
            <div key={room} className="bg-brand-gray rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{count as number}</p>
              <p className="text-xs text-gray-500 truncate">{room}</p>
            </div>
          ))}
        </div>
        {telemetry.uniqueUsers?.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setUsersOpen(!usersOpen)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${usersOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Connected Users ({telemetry.uniqueUsers.length})
            </button>
            {usersOpen && (
              <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                {telemetry.uniqueUsers.map((u: any) => (
                  <div key={u.userId} className="flex items-center text-sm bg-gray-50 px-3 py-2 rounded">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${u.role === 'ADMIN' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                    <span className="font-medium ml-2">{u.name}</span>
                    <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded ml-2">{u.role === 'ADMIN' ? 'Admin' : 'User'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Signal Analytics */}
      {signalStats && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Signal Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{signalStats.totalSignals}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{signalStats.activeSignals}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-signal-green">{signalStats.hitTarget}</p>
              <p className="text-xs text-gray-500">Target Hit</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-signal-red">{signalStats.hitSL}</p>
              <p className="text-xs text-gray-500">SL Hit</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-emerald">{signalStats.winRate}%</p>
              <p className="text-xs text-gray-500">Win Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* User Analytics */}
      {userStats && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">User Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{userStats.totalUsers}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-emerald">{userStats.verifiedUsers}</p>
              <p className="text-xs text-gray-500">Verified</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{userStats.activeSubscriptions}</p>
              <p className="text-xs text-gray-500">Active Subs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{userStats.pendingPayments}</p>
              <p className="text-xs text-gray-500">Pending Payments</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
