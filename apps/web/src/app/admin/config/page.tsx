'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'payment', label: 'Payment' },
  { key: 'intervals', label: 'Signal Intervals' },
  { key: 'segments', label: 'Segments' },
  { key: 'categories', label: 'Categories' },
  { key: 'terms', label: 'Terms & Conditions' },
  { key: 'mobileapp', label: 'Mobile App' },
  { key: 'account', label: 'My Account' },
];

export default function AdminConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Account tab state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Payment tab state
  const [upiId, setUpiId] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [hasQrImage, setHasQrImage] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  // Mobile App tab state
  const [apkInfo, setApkInfo] = useState<any>(null);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [apkVersion, setApkVersion] = useState('');
  const [isUploadingApk, setIsUploadingApk] = useState(false);
  const [isDeletingApk, setIsDeletingApk] = useState(false);

  useEffect(() => {
    api.get('/config')
      .then((res) => {
        setConfig(res.data.data);
        if (res.data.data?.upiId) setUpiId(res.data.data.upiId);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    api.get('/config/app/info')
      .then((res) => setApkInfo(res.data.data))
      .catch(() => {});
    api.get('/public/config/payment-config')
      .then((res) => setHasQrImage(res.data.data?.hasQrImage || false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Load admin profile from localStorage
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        setAdminEmail(user.email || '');
        setAdminName(user.name || '');
        setAdminPhone(user.phone || '');
      }
    } catch {}
  }, []);

  const handleSaveProfile = async () => {
    setIsSavingAccount(true);
    try {
      const res = await api.put('/auth/profile', { name: adminName, email: adminEmail, phone: adminPhone });
      const updated = res.data.data;
      // Update localStorage
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({ ...user, ...updated }));
      }
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setIsSavingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleUploadQr = async () => {
    if (!qrFile) {
      toast.error('Please select a QR image');
      return;
    }
    setIsUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('qrImage', qrFile);
      await api.post('/config/payment-qr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHasQrImage(true);
      setQrFile(null);
      setQrPreview(null);
      toast.success('QR image uploaded');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload QR image');
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handleSaveUpiId = async () => {
    setIsSavingUpi(true);
    try {
      await api.put('/config', { upiId });
      toast.success('UPI ID saved');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save UPI ID');
    } finally {
      setIsSavingUpi(false);
    }
  };

  const handleUploadApk = async () => {
    if (!apkFile) {
      toast.error('Please select an APK file');
      return;
    }
    setIsUploadingApk(true);
    try {
      const formData = new FormData();
      formData.append('apk', apkFile);
      formData.append('version', apkVersion);
      const res = await api.post('/config/app/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setApkInfo({ available: true, ...res.data.data });
      setApkFile(null);
      setApkVersion('');
      toast.success('APK uploaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload APK');
    } finally {
      setIsUploadingApk(false);
    }
  };

  const handleDeleteApk = async () => {
    const result = await Swal.fire({
      title: 'Delete APK?',
      text: 'Are you sure you want to delete the current APK?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;
    setIsDeletingApk(true);
    try {
      await api.delete('/config/app/delete');
      setApkInfo({ available: false });
      toast.success('APK deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete APK');
    } finally {
      setIsDeletingApk(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put('/config', {
        marqueeWarningText: config.marqueeWarningText,
        whatsappActive: config.whatsappActive,
        publicHistoryStartDate: config.publicHistoryStartDate,
        publicHistoryEndDate: config.publicHistoryEndDate,
        promotionalBanners: config.promotionalBanners,
        termsAndConditions: config.termsAndConditions,
        whatsappPhone: config.whatsappPhone,
        signalIntervals: config.signalIntervals,
        segments: config.segments,
        categories: config.categories,
      });
      toast.success('Configuration saved');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!config) {
    return <div className="text-center py-8">Failed to load configuration.</div>;
  }

  return (
    <div className="max-w-4xl">
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-text-heading shadow-sm'
                : 'text-text-body hover:text-text-heading'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Marquee Warning Text</h3>
              <textarea
                className="input-field"
                rows={3}
                value={config.marqueeWarningText}
                onChange={(e) => setConfig({ ...config, marqueeWarningText: e.target.value })}
                placeholder="Scrolling warning text shown on the top banner..."
              />
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="text-lg font-semibold mb-3">Public History Date Range</h3>
              <p className="text-sm text-gray-500 mb-3">Controls which signals are visible on the public performance board.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={config.publicHistoryStartDate?.split('T')[0] || ''}
                    onChange={(e) => setConfig({ ...config, publicHistoryStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={config.publicHistoryEndDate?.split('T')[0] || ''}
                    onChange={(e) => setConfig({ ...config, publicHistoryEndDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">WhatsApp Widget</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setConfig({ ...config, whatsappActive: !config.whatsappActive })}
                className={`w-12 h-6 rounded-full transition-colors cursor-pointer flex items-center ${
                  config.whatsappActive ? 'bg-brand-emerald' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  config.whatsappActive ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </div>
              <span className="text-sm font-medium">{config.whatsappActive ? 'Active' : 'Inactive'}</span>
            </label>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Phone Number (with country code, no +)</label>
              <input
                type="text"
                className="input-field"
                value={config.whatsappPhone || ''}
                onChange={(e) => setConfig({ ...config, whatsappPhone: e.target.value })}
                placeholder="919876543210"
              />
              <p className="text-xs text-gray-400 mt-1">Example: 919876543210 (91 = India code)</p>
            </div>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Payment QR Code</h3>
              <p className="text-sm text-gray-500 mt-1">Upload the UPI QR code image shown to customers during payment.</p>
            </div>

            {/* Current QR Preview */}
            {hasQrImage && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Current QR Code</p>
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/v1/public/payment-qr`}
                  alt="Payment QR"
                  className="w-48 h-48 mx-auto rounded-lg object-contain bg-white border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {/* Upload New QR */}
            <div>
              <label className="block text-sm text-gray-500 mb-1">Upload New QR Image</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setQrFile(f);
                  if (f) {
                    const reader = new FileReader();
                    reader.onloadend = () => setQrPreview(reader.result as string);
                    reader.readAsDataURL(f);
                  } else {
                    setQrPreview(null);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-emerald/10 file:text-brand-emerald hover:file:bg-brand-emerald/20 cursor-pointer"
              />
              <p className="text-xs text-gray-400 mt-1">Accepted: JPEG, PNG, WebP (max 5MB)</p>
            </div>
            {qrPreview && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Preview</p>
                <img src={qrPreview} alt="QR Preview" className="w-48 h-48 mx-auto rounded-lg object-contain bg-white border" />
              </div>
            )}
            <button onClick={handleUploadQr} className="btn-primary py-2 px-6" disabled={isUploadingQr || !qrFile}>
              {isUploadingQr ? 'Uploading...' : 'Upload QR Image'}
            </button>

            <hr className="border-gray-100" />

            {/* UPI ID */}
            <div>
              <h3 className="text-lg font-semibold">UPI ID</h3>
              <p className="text-sm text-gray-500 mt-1">Displayed below the QR code for manual UPI payments.</p>
            </div>
            <div>
              <input
                type="text"
                className="input-field"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@upi"
              />
            </div>
            <button onClick={handleSaveUpiId} className="btn-primary py-2 px-6" disabled={isSavingUpi}>
              {isSavingUpi ? 'Saving...' : 'Save UPI ID'}
            </button>
          </div>
        )}

        {activeTab === 'intervals' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Signal Intervals</h3>
              <p className="text-sm text-gray-500 mt-1">
                Define subscription intervals available for plans, signals, and subscriptions.
              </p>
            </div>
            <div className="space-y-2">
              {(config.signalIntervals || []).map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Key (e.g. YEARLY)"
                    value={item.key}
                    onChange={(e) => {
                      const updated = [...config.signalIntervals];
                      updated[index] = { ...updated[index], key: e.target.value.toUpperCase().replace(/\s+/g, '_') };
                      setConfig({ ...config, signalIntervals: updated });
                    }}
                  />
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Label (e.g. Yearly)"
                    value={item.label}
                    onChange={(e) => {
                      const updated = [...config.signalIntervals];
                      updated[index] = { ...updated[index], label: e.target.value };
                      setConfig({ ...config, signalIntervals: updated });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = config.signalIntervals.filter((_: any, i: number) => i !== index);
                      setConfig({ ...config, signalIntervals: updated });
                    }}
                    className="text-signal-red hover:text-red-700 text-lg px-2"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = [...(config.signalIntervals || []), { key: '', label: '' }];
                setConfig({ ...config, signalIntervals: updated });
              }}
              className="btn-secondary text-sm py-2 px-4"
            >
              + Add Interval
            </button>
          </div>
        )}

        {activeTab === 'segments' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Segments</h3>
              <p className="text-sm text-gray-500 mt-1">
                Define trading segments available for signals and plans.
              </p>
            </div>
            <div className="space-y-2">
              {(config.segments || []).map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Key (e.g. INTRADAY)"
                    value={item.key}
                    onChange={(e) => {
                      const updated = [...config.segments];
                      updated[index] = { ...updated[index], key: e.target.value.toUpperCase().replace(/\s+/g, '_') };
                      setConfig({ ...config, segments: updated });
                    }}
                  />
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Label (e.g. Intraday)"
                    value={item.label}
                    onChange={(e) => {
                      const updated = [...config.segments];
                      updated[index] = { ...updated[index], label: e.target.value };
                      setConfig({ ...config, segments: updated });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = config.segments.filter((_: any, i: number) => i !== index);
                      setConfig({ ...config, segments: updated });
                    }}
                    className="text-signal-red hover:text-red-700 text-lg px-2"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = [...(config.segments || []), { key: '', label: '' }];
                setConfig({ ...config, segments: updated });
              }}
              className="btn-secondary text-sm py-2 px-4"
            >
              + Add Segment
            </button>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Categories</h3>
              <p className="text-sm text-gray-500 mt-1">
                Define sub-categories available for signals (e.g. Equity, Index, Commodity).
              </p>
            </div>
            <div className="space-y-2">
              {(config.categories || []).map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Key (e.g. EQUITY)"
                    value={item.key}
                    onChange={(e) => {
                      const updated = [...config.categories];
                      updated[index] = { ...updated[index], key: e.target.value.toUpperCase().replace(/\s+/g, '_') };
                      setConfig({ ...config, categories: updated });
                    }}
                  />
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Label (e.g. Equity)"
                    value={item.label}
                    onChange={(e) => {
                      const updated = [...config.categories];
                      updated[index] = { ...updated[index], label: e.target.value };
                      setConfig({ ...config, categories: updated });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = config.categories.filter((_: any, i: number) => i !== index);
                      setConfig({ ...config, categories: updated });
                    }}
                    className="text-signal-red hover:text-red-700 text-lg px-2"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = [...(config.categories || []), { key: '', label: '' }];
                setConfig({ ...config, categories: updated });
              }}
              className="btn-secondary text-sm py-2 px-4"
            >
              + Add Category
            </button>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Terms & Conditions</h3>
              <p className="text-sm text-gray-500 mt-1">
                Displayed on the registration page when users click &quot;Terms &amp; Conditions&quot;.
              </p>
            </div>
            <textarea
              className="input-field font-mono text-sm"
              rows={16}
              value={config.termsAndConditions || ''}
              onChange={(e) => setConfig({ ...config, termsAndConditions: e.target.value })}
              placeholder="Enter your Terms & Conditions content here..."
            />
          </div>
        )}
        {activeTab === 'mobileapp' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Mobile App (APK)</h3>
              <p className="text-sm text-gray-500 mt-1">
                Upload and manage the Android APK for customer downloads.
              </p>
            </div>

            {/* Current APK Info */}
            {apkInfo?.available ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  APK Available
                </div>
                {apkInfo.apkVersion && (
                  <p className="text-sm text-gray-600">Version: <span className="font-medium">{apkInfo.apkVersion}</span></p>
                )}
                {apkInfo.apkOriginalName && (
                  <p className="text-sm text-gray-600">File: <span className="font-medium">{apkInfo.apkOriginalName}</span></p>
                )}
                {apkInfo.apkUploadedAt && (
                  <p className="text-sm text-gray-600">Uploaded: <span className="font-medium">{new Date(apkInfo.apkUploadedAt).toLocaleString()}</span></p>
                )}
                <div className="flex gap-3 pt-2">
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/config/app/download`}
                    className="btn-secondary text-sm py-2 px-4 inline-block"
                    download
                  >
                    Download APK
                  </a>
                  <button
                    onClick={handleDeleteApk}
                    className="btn-danger text-sm py-2 px-4"
                    disabled={isDeletingApk}
                  >
                    {isDeletingApk ? 'Deleting...' : 'Delete APK'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500">No APK uploaded yet.</p>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* Upload New APK */}
            <div>
              <h4 className="font-semibold mb-3">Upload New APK</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Version Label</label>
                  <input
                    type="text"
                    className="input-field"
                    value={apkVersion}
                    onChange={(e) => setApkVersion(e.target.value)}
                    placeholder="e.g. 1.0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">APK File</label>
                  <input
                    type="file"
                    accept=".apk"
                    onChange={(e) => setApkFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-emerald/10 file:text-brand-emerald hover:file:bg-brand-emerald/20 cursor-pointer"
                  />
                  <p className="text-xs text-gray-400 mt-1">Max file size: 100MB</p>
                </div>
                <button
                  onClick={handleUploadApk}
                  className="btn-primary py-2 px-6"
                  disabled={isUploadingApk || !apkFile}
                >
                  {isUploadingApk ? 'Uploading...' : 'Upload APK'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Admin Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Phone</label>
                  <input
                    type="text"
                    className="input-field"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                  />
                </div>
                <button onClick={handleSaveProfile} className="btn-primary py-2 px-6" disabled={isSavingAccount}>
                  {isSavingAccount ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="input-field"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="input-field"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showNewPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <button onClick={handleChangePassword} className="btn-danger py-2 px-6" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button - only show for config tabs, not account */}
      {activeTab !== 'account' && activeTab !== 'mobileapp' && activeTab !== 'payment' && (
        <button onClick={handleSave} className="btn-primary w-full mt-6" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      )}
    </div>
  );
}
