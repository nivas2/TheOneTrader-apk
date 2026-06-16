export enum PlanType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALF_YEARLY = 'HALF_YEARLY',
  YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PENDING_ACTIVATION = 'PENDING_ACTIVATION',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

export enum Segment {
  INTRADAY = 'INTRADAY',
  FANDO = 'FANDO',
  MTF = 'MTF',
  LONGTERM = 'LONGTERM',
  SHORTTERM = 'SHORTTERM',
}

export enum TargetInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface ISubscription {
  _id: string;
  userId: string;
  status: SubscriptionStatus;
  planType: PlanType;
  segment: Segment;
  receiptScreenshotPath: string;
  activatedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
