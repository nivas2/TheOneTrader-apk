'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import CountdownTimer from '@/components/CountdownTimer';
import { PLAN_TYPE_LABELS, SEGMENT_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';
import toast from 'react-hot-toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function FieldError({ msg }: { msg: string }) {
  return msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileLoading, setProfileLoading] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    api.get('/client/subscriptions/mine').then((res) => setSubscriptions(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, email: user.email, phone: user.phone });
    }
  }, [user]);

  const activeSub = subscriptions.find((s: any) => s.status === 'ACTIVE');

  const validateProfile = () => {
    const errs: Record<string, string> = {};
    if (!profileForm.name.trim()) errs.name = 'Name is required';
    else if (profileForm.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!profileForm.email.trim()) errs.email = 'Email is required';
    else if (!EMAIL_RE.test(profileForm.email)) errs.email = 'Enter a valid email address';
    if (!profileForm.phone.trim()) errs.phone = 'Phone number is required';
    else if (!PHONE_RE.test(profileForm.phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number';
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePassword = () => {
    const errs: Record<string, string> = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!passwordForm.newPassword) errs.newPassword = 'New password is required';
    else if (passwordForm.newPassword.length < 6) errs.newPassword = 'Must be at least 6 characters';
    if (!passwordForm.confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProfileSave = async () => {
    if (!validateProfile()) return;
    setProfileLoading(true);
    try {
      const res = await api.put('/auth/profile', profileForm);
      updateUser(res.data.data);
      toast.success('Profile updated');
      setEditingProfile(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!validatePassword()) return;
    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed');
      setEditingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const profileInputCls = (field: string) =>
    `input-field ${profileErrors[field] ? 'border-red-400 focus:ring-red-400' : ''}`;

  const passwordInputCls = (field: string) =>
    `input-field ${passwordErrors[field] ? 'border-red-400 focus:ring-red-400' : ''}`;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Profile Information</h2>
          {!editingProfile && (
            <button onClick={() => { setEditingProfile(true); setProfileErrors({}); }} className="text-sm text-brand-emerald hover:underline">
              Edit
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Name</label>
              <input
                type="text"
                className={profileInputCls('name')}
                value={profileForm.name}
                onChange={(e) => { setProfileForm({ ...profileForm, name: e.target.value }); setProfileErrors((p) => { const n = { ...p }; delete n.name; return n; }); }}
              />
              <FieldError msg={profileErrors.name || ''} />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <input
                type="email"
                className={profileInputCls('email')}
                value={profileForm.email}
                onChange={(e) => { setProfileForm({ ...profileForm, email: e.target.value }); setProfileErrors((p) => { const n = { ...p }; delete n.email; return n; }); }}
              />
              <FieldError msg={profileErrors.email || ''} />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                className={profileInputCls('phone')}
                value={profileForm.phone}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setProfileForm({ ...profileForm, phone: v }); setProfileErrors((p) => { const n = { ...p }; delete n.phone; return n; }); }}
                maxLength={10}
                inputMode="numeric"
              />
              <FieldError msg={profileErrors.phone || ''} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleProfileSave} disabled={profileLoading} className="btn-primary text-sm py-2 px-4">
                {profileLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingProfile(false);
                  setProfileErrors({});
                  if (user) setProfileForm({ name: user.name, email: user.email, phone: user.phone });
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{user?.phone}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Member Since</span>
              <span className="font-medium">{new Date(user?.createdAt || '').toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Password</h2>
          {!editingPassword && (
            <button onClick={() => { setEditingPassword(true); setPasswordErrors({}); }} className="text-sm text-brand-emerald hover:underline">
              Change
            </button>
          )}
        </div>

        {editingPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  className={passwordInputCls('currentPassword')}
                  value={passwordForm.currentPassword}
                  onChange={(e) => { setPasswordForm({ ...passwordForm, currentPassword: e.target.value }); setPasswordErrors((p) => { const n = { ...p }; delete n.currentPassword; return n; }); }}
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showCurrentPw ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                </button>
              </div>
              <FieldError msg={passwordErrors.currentPassword || ''} />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className={passwordInputCls('newPassword')}
                  value={passwordForm.newPassword}
                  onChange={(e) => { setPasswordForm({ ...passwordForm, newPassword: e.target.value }); setPasswordErrors((p) => { const n = { ...p }; delete n.newPassword; return n; }); }}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showNewPw ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                </button>
              </div>
              <FieldError msg={passwordErrors.newPassword || ''} />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  className={passwordInputCls('confirmPassword')}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => { setPasswordForm({ ...passwordForm, confirmPassword: e.target.value }); setPasswordErrors((p) => { const n = { ...p }; delete n.confirmPassword; return n; }); }}
                />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showConfirmPw ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                </button>
              </div>
              <FieldError msg={passwordErrors.confirmPassword || ''} />
            </div>
            <div className="flex gap-3">
              <button onClick={handlePasswordSave} disabled={passwordLoading} className="btn-primary text-sm py-2 px-4">
                {passwordLoading ? 'Saving...' : 'Change Password'}
              </button>
              <button
                onClick={() => {
                  setEditingPassword(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordErrors({});
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Click &quot;Change&quot; to update your password.</p>
        )}
      </div>

      {activeSub && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Active Subscription</h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p><span className="text-gray-500">Plan:</span> <strong>{PLAN_TYPE_LABELS[activeSub.planType] || activeSub.planType}</strong></p>
              <p><span className="text-gray-500">Segment:</span> <strong>{SEGMENT_LABELS[activeSub.segment] || activeSub.segment}</strong></p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Time Remaining</p>
              <CountdownTimer expiresAt={activeSub.expiresAt} />
            </div>
          </div>
        </div>
      )}

      {subscriptions.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Subscription History</h2>
          <div className="space-y-3">
            {subscriptions.map((sub: any) => (
              <div key={sub._id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium">
                    {SEGMENT_LABELS[sub.segment] || sub.segment} - {PLAN_TYPE_LABELS[sub.planType] || sub.planType}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(sub.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  sub.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                  sub.status === 'PENDING_ACTIVATION' ? 'bg-blue-100 text-blue-800' :
                  sub.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {SUBSCRIPTION_STATUS_LABELS[sub.status] || sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
