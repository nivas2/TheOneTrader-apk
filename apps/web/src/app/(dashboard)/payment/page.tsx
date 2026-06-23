'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { SEGMENT_LABELS, PLAN_TYPE_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
const SUPPORT_EMAIL = 'hari@theonetrade.in';
const PLANS_PER_PAGE = 6;
const HISTORY_PER_PAGE = 5;

interface Plan {
  _id: string;
  name: string;
  planType: string;
  segment: string;
  durationDays: number;
  price: number;
  currency: string;
  features: string[];
  signalsPerDay: number;
}

interface Subscription {
  _id: string;
  planType: string;
  segment: string;
  status: string;
  amount: number;
  utrId?: string;
  receiptScreenshotPath?: string;
  activatedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  PENDING_ACTIVATION: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function PaymentPage() {
  const [step, setStep] = useState<'select' | 'upload'>('select');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [utrId, setUtrId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [filterSegment, setFilterSegment] = useState('ALL');
  const [mySubscriptions, setMySubscriptions] = useState<Subscription[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const [paymentUpiId, setPaymentUpiId] = useState('');

  useEffect(() => {
    api.get('/public/plans/public')
      .then((res) => setPlans(res.data.data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setIsLoadingPlans(false));

    fetchMySubscriptions();

    api.get('/public/config/payment-config')
      .then((res) => setPaymentUpiId(res.data.data?.upiId || ''))
      .catch(() => {});
  }, []);

  const fetchMySubscriptions = () => {
    api.get('/client/subscriptions/mine')
      .then((res) => setMySubscriptions(res.data.data || []))
      .catch(() => {});
  };

  const segments = [...new Set(plans.map((p) => p.segment))];
  const filteredPlans = filterSegment === 'ALL'
    ? plans
    : plans.filter((p) => p.segment === filterSegment);

  const visiblePlans = showAllPlans ? filteredPlans : filteredPlans.slice(0, PLANS_PER_PAGE);
  const hasMorePlans = filteredPlans.length > PLANS_PER_PAGE;

  // Reset showAllPlans when segment filter changes
  useEffect(() => {
    setShowAllPlans(false);
  }, [filterSegment]);

  const activeSub = mySubscriptions.find(
    (s) => s.status === 'ACTIVE' && s.expiresAt && new Date(s.expiresAt).getTime() > Date.now()
  );
  const expiredSub = !activeSub
    ? mySubscriptions.find(
        (s) => s.status === 'EXPIRED' || (s.status === 'ACTIVE' && s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now())
      )
    : null;
  const pendingSubs = mySubscriptions.filter((s) => s.status === 'PENDING_APPROVAL' || s.status === 'PENDING_ACTIVATION');

  const totalHistoryPages = Math.ceil(mySubscriptions.length / HISTORY_PER_PAGE);
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PER_PAGE;
    return mySubscriptions.slice(start, start + HISTORY_PER_PAGE);
  }, [mySubscriptions, historyPage]);

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getReceiptUrl = (filePath: string) => {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    const filename = filePath.replace(/\\/g, '/').split('/').pop();
    return `${API_BASE}/uploads/${filename}`;
  };

  const daysLeft = (expiresAt: string) => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  // Client-side safety net: show EXPIRED if status is ACTIVE but expiresAt has passed
  const getDisplayStatus = (sub: Subscription) => {
    if (sub.status === 'ACTIVE' && sub.expiresAt && new Date(sub.expiresAt).getTime() <= Date.now()) {
      return 'EXPIRED';
    }
    return sub.status;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrId.trim()) {
      toast.error('Please enter UTR / Reference ID');
      return;
    }
    if (!file || !selectedPlan) {
      toast.error('Please upload your payment screenshot');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('planType', selectedPlan.planType);
      formData.append('segment', selectedPlan.segment);
      formData.append('amount', String(selectedPlan.price));
      formData.append('utrId', utrId.trim());

      await api.post('/client/subscriptions/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Payment receipt uploaded! We\'ll review and activate your subscription.');
      setStep('select');
      setSelectedPlan(null);
      setFile(null);
      setUtrId('');
      fetchMySubscriptions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPlans) {
    return <div className="text-center py-8">Loading plans...</div>;
  }

  return (
    <div className="max-w-4xl">
      {/* Active Subscription Banner */}
      {activeSub && (
        <div className="card mb-6 border-l-4 border-l-brand-emerald bg-brand-emerald/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="font-semibold text-text-heading">Active Subscription</h3>
              </div>
              <p className="text-sm text-gray-600">
                {SEGMENT_LABELS[activeSub.segment] || activeSub.segment} - {PLAN_TYPE_LABELS[activeSub.planType] || activeSub.planType}
              </p>
            </div>
            <div className="text-right">
              {activeSub.expiresAt && (
                <>
                  <p className={`text-sm font-semibold ${daysLeft(activeSub.expiresAt) <= 7 ? 'text-red-600' : 'text-text-heading'}`}>
                    {daysLeft(activeSub.expiresAt)} days left
                  </p>
                  <p className="text-xs text-gray-500">Expires {formatDate(activeSub.expiresAt)}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expired / Renewal Banner */}
      {expiredSub && pendingSubs.length === 0 && (
        <div className="card mb-6 border-l-4 border-l-red-400 bg-red-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <h3 className="font-semibold text-text-heading">Subscription Expired</h3>
              </div>
              <p className="text-sm text-gray-600">
                Your {SEGMENT_LABELS[expiredSub.segment] || expiredSub.segment} - {PLAN_TYPE_LABELS[expiredSub.planType] || expiredSub.planType} plan has expired.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Expired on {formatDate(expiredSub.expiresAt || '')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-red-600">Renew now to continue receiving signals</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Subscriptions */}
      {pendingSubs.length > 0 && (
        <div className="mb-6 space-y-3">
          {pendingSubs.map((sub) => (
            <div key={sub._id} className="card border-l-4 border-l-yellow-400 bg-yellow-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[sub.status] || ''}`}>
                      {SUBSCRIPTION_STATUS_LABELS[sub.status] || sub.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {SEGMENT_LABELS[sub.segment] || sub.segment} - {PLAN_TYPE_LABELS[sub.planType] || sub.planType}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Submitted on {formatDate(sub.createdAt)}</p>
                </div>
                <div className="text-right">
                  {sub.amount > 0 && (
                    <p className="text-sm font-semibold text-text-heading">INR {sub.amount.toLocaleString()}</p>
                  )}
                  {sub.status === 'PENDING_APPROVAL' && (
                    <p className="text-xs text-yellow-700 mt-1">Under review by admin</p>
                  )}
                  {sub.status === 'PENDING_ACTIVATION' && (
                    <p className="text-xs text-blue-700 mt-1">Activates on {formatDate(sub.activatedAt || '')} at 12:00 AM</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 'select' ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Choose Your Plan</h2>

            {/* Segment Filter */}
            <div className="flex gap-2 flex-wrap mb-6">
              <button
                onClick={() => setFilterSegment('ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterSegment === 'ALL' ? 'bg-brand-emerald text-white' : 'bg-gray-100 text-text-body hover:bg-gray-200'
                }`}
              >
                All Segments
              </button>
              {segments.map((seg) => (
                <button
                  key={seg}
                  onClick={() => setFilterSegment(seg)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterSegment === seg ? 'bg-brand-emerald text-white' : 'bg-gray-100 text-text-body hover:bg-gray-200'
                  }`}
                >
                  {SEGMENT_LABELS[seg] || seg}
                </button>
              ))}
            </div>
          </div>

          {/* Plans Grid */}
          {filteredPlans.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400">No plans available yet. Please check back later.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visiblePlans.map((plan) => (
                  <div
                    key={plan._id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`card cursor-pointer transition-all hover:shadow-md ${
                      selectedPlan?._id === plan._id
                        ? 'ring-2 ring-brand-emerald bg-brand-emerald/5'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                          {SEGMENT_LABELS[plan.segment] || plan.segment}
                        </span>
                        <span className="px-2 py-0.5 bg-brand-emerald/10 text-brand-emerald text-xs rounded font-semibold ml-1">
                          {plan.signalsPerDay || 1} signal{(plan.signalsPerDay || 1) > 1 ? 's' : ''}/day
                        </span>
                      </div>
                      {selectedPlan?._id === plan._id && (
                        <span className="text-brand-emerald text-lg">&#10003;</span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">
                      {PLAN_TYPE_LABELS[plan.planType] || plan.planType} &middot; {plan.durationDays} days
                    </p>
                    <p className="text-2xl font-bold text-brand-emerald mb-3">
                      {plan.currency} {plan.price.toLocaleString()}
                    </p>
                    {plan.features.length > 0 && (
                      <ul className="text-xs text-gray-500 space-y-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-brand-emerald mt-0.5">&#10003;</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              {hasMorePlans && (
                <button
                  onClick={() => setShowAllPlans(!showAllPlans)}
                  className="w-full py-2.5 text-sm font-medium text-brand-emerald hover:bg-brand-emerald/5 rounded-lg transition-colors"
                >
                  {showAllPlans ? `Show Less` : `Show All Plans (${filteredPlans.length})`}
                </button>
              )}
            </>
          )}

          {selectedPlan && (
            <button
              onClick={() => setStep('upload')}
              className="btn-primary w-full mt-4"
            >
              Continue to Payment - {selectedPlan.currency} {selectedPlan.price.toLocaleString()}
            </button>
          )}
        </div>
      ) : (
        <div className="card max-w-xl">
          <h2 className="text-xl font-bold mb-4">Complete Payment</h2>

          {/* Selected plan summary */}
          <div className="bg-brand-gray rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-semibold">{selectedPlan?.name}</p>
                <p className="text-sm text-gray-500">
                  {PLAN_TYPE_LABELS[selectedPlan?.planType || ''] || selectedPlan?.planType} &middot; {SEGMENT_LABELS[selectedPlan?.segment || '']} &middot; {selectedPlan?.signalsPerDay || 1} signal{(selectedPlan?.signalsPerDay || 1) > 1 ? 's' : ''}/day
                </p>
              </div>
              <p className="text-xl font-bold text-brand-emerald">
                {selectedPlan?.currency} {selectedPlan?.price.toLocaleString()}
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-brand-gray rounded-xl p-6 text-center mb-6">
            <p className="text-sm font-medium text-text-heading mb-1">Pay via UPI</p>
            <p className="text-xs text-gray-500 mb-3">Scan the QR code below using any UPI app (GPay, PhonePe, Paytm, etc.)</p>
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/v1/public/payment-qr`}
              alt="UPI QR Code"
              className="w-48 h-48 rounded-lg mx-auto object-contain bg-white"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {paymentUpiId && (
              <p className="text-sm text-text-body mt-3 select-all font-mono bg-white rounded-lg px-3 py-2 border border-gray-200 inline-block">
                {paymentUpiId}
              </p>
            )}
            <p className="text-sm font-semibold text-brand-emerald mt-3">
              Pay exactly {selectedPlan?.currency} {selectedPlan?.price.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              After payment, enter UTR/Reference ID and upload screenshot below
            </p>
          </div>

          {/* Activation Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-blue-800 mb-1">How it works</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>1. Complete payment via UPI and upload screenshot below</li>
              <li>2. Our team will review and approve your payment</li>
              <li>3. Once approved, your plan activates from <strong>next day 12:00 AM</strong></li>
              <li>4. You will start receiving signals from the activation date</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              For any queries, contact <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-emerald hover:underline">{SUPPORT_EMAIL}</a>
            </p>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-heading mb-1">
                UTR / Transaction Reference ID
              </label>
              <input
                type="text"
                className="input-field"
                value={utrId}
                onChange={(e) => setUtrId(e.target.value)}
                placeholder="e.g. 432109876543"
                maxLength={30}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Enter the 12-digit UTR number from your UPI payment confirmation</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-heading mb-1">
                Upload Payment Screenshot
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">Accepted: JPEG, PNG, WebP, PDF (max 5MB)</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('select')} className="btn-secondary flex-1">
                Back
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Uploading...' : 'Submit Receipt'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subscription History */}
      {mySubscriptions.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Subscription History</h3>
            <span className="text-xs text-gray-400">{mySubscriptions.length} total</span>
          </div>

          {/* Mobile: Card layout */}
          <div className="md:hidden space-y-3">
            {paginatedHistory.map((sub) => {
              const receiptUrl = getReceiptUrl(sub.receiptScreenshotPath || '');
              return (
                <div key={sub._id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{PLAN_TYPE_LABELS[sub.planType] || sub.planType}</p>
                      <p className="text-xs text-gray-400">{SEGMENT_LABELS[sub.segment] || sub.segment}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[getDisplayStatus(sub)] || ''}`}>
                      {SUBSCRIPTION_STATUS_LABELS[getDisplayStatus(sub)] || getDisplayStatus(sub)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                    <div>
                      <span className="text-gray-400">Date</span>
                      <p className="font-medium">{formatDate(sub.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Amount</span>
                      <p className="font-medium">{sub.amount > 0 ? `INR ${sub.amount.toLocaleString()}` : '-'}</p>
                    </div>
                    {sub.utrId && (
                      <div>
                        <span className="text-gray-400">UTR / Ref ID</span>
                        <p className="font-mono font-medium">{sub.utrId}</p>
                      </div>
                    )}
                    {sub.activatedAt && sub.expiresAt && (
                      <div>
                        <span className="text-gray-400">Validity</span>
                        <p className="font-medium">{formatDate(sub.activatedAt)} - {formatDate(sub.expiresAt)}</p>
                      </div>
                    )}
                  </div>
                  {receiptUrl && (
                    <button
                      onClick={() => setSelectedReceipt(receiptUrl)}
                      className="text-brand-emerald hover:underline text-xs font-medium mt-3"
                    >
                      View Receipt
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Plan</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">UTR / Ref ID</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Validity</th>
                  <th className="px-3 py-3 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((sub) => {
                  const receiptUrl = getReceiptUrl(sub.receiptScreenshotPath || '');
                  return (
                    <tr key={sub._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3 whitespace-nowrap">{formatDate(sub.createdAt)}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{PLAN_TYPE_LABELS[sub.planType] || sub.planType}</p>
                        <p className="text-xs text-gray-400">{SEGMENT_LABELS[sub.segment] || sub.segment}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {sub.amount > 0 ? `INR ${sub.amount.toLocaleString()}` : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">
                        {sub.utrId || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[getDisplayStatus(sub)] || ''}`}>
                          {SUBSCRIPTION_STATUS_LABELS[getDisplayStatus(sub)] || getDisplayStatus(sub)}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                        {sub.activatedAt && sub.expiresAt
                          ? `${formatDate(sub.activatedAt)} - ${formatDate(sub.expiresAt)}`
                          : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-3 py-3">
                        {receiptUrl ? (
                          <button
                            onClick={() => setSelectedReceipt(receiptUrl)}
                            className="text-brand-emerald hover:underline text-xs font-medium"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalHistoryPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">
                {(historyPage - 1) * HISTORY_PER_PAGE + 1}-{Math.min(historyPage * HISTORY_PER_PAGE, mySubscriptions.length)} of {mySubscriptions.length}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="px-3 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setHistoryPage(p)}
                    className={`px-3 py-1.5 text-xs rounded border ${
                      historyPage === p
                        ? 'bg-brand-emerald text-white border-brand-emerald'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                  disabled={historyPage === totalHistoryPages}
                  className="px-3 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Support Contact */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          Need help? Contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-emerald hover:underline">{SUPPORT_EMAIL}</a>
        </p>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedReceipt(null)}>
          <div className="bg-white rounded-xl p-4 max-w-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Payment Receipt</h3>
              <button onClick={() => setSelectedReceipt(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <img
              src={selectedReceipt}
              alt="Payment Receipt"
              className="max-w-full rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.insertAdjacentHTML(
                  'beforeend',
                  '<p class="text-center py-8 text-gray-400 text-sm">Failed to load image</p>'
                );
              }}
            />
            <button onClick={() => setSelectedReceipt(null)} className="btn-secondary w-full mt-4">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
