import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  status: string;
  planType: string;
  segment: string;
  amount: number;
  utrId?: string;
  receiptScreenshotPath: string;
  activatedAt?: Date;
  expiresAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'PENDING_ACTIVATION', 'ACTIVE', 'EXPIRED', 'REJECTED'],
      default: 'PENDING_APPROVAL',
    },
    planType: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'],
      required: true,
    },
    segment: {
      type: String,
      enum: ['INTRADAY', 'FANDO', 'MTF', 'LONGTERM', 'SHORTTERM'],
      required: true,
    },
    amount: { type: Number, default: 0 },
    utrId: { type: String },
    receiptScreenshotPath: { type: String, required: true },
    activatedAt: { type: Date },
    expiresAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ expiresAt: 1 });

export const Subscription = mongoose.model<ISubscriptionDocument>('Subscription', SubscriptionSchema);
