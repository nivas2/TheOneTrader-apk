export const SEGMENT_LABELS: Record<string, string> = {
  INTRADAY: 'Intraday',
  FANDO: 'F&O',
  MTF: 'MTF',
  LONGTERM: 'Long Term',
  SHORTTERM: 'Short Term',
};

export const PLAN_TYPE_LABELS: Record<string, string> = {
  DAILY: 'One Day',
  WEEKLY: 'One Week',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half Yearly',
  YEARLY: 'Yearly',
};

export const INTERVAL_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

export const SUBCATEGORY_LABELS: Record<string, string> = {
  EQUITY: 'Equity',
  INDEX: 'Index',
  COMMODITY: 'Commodity',
  CURRENCY: 'Currency',
};

export const SIGNAL_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  HIT_TARGET: 'Target Hit',
  HIT_SL: 'Stop Loss Hit',
  SAFE_EXIT: 'Safe Exit',
  CANCELLED: 'Cancelled',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: 'Pending Approval',
  PENDING_ACTIVATION: 'Approved (Activates Tomorrow)',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected',
};

export function label(map: Record<string, string>, value: string): string {
  return map[value] || value;
}
