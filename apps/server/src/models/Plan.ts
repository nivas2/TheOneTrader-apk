import mongoose, { Schema, Document } from 'mongoose';

export interface IPlanDocument extends Document {
  name: string;
  planType: string;
  segment: string;
  durationDays: number;
  price: number;
  currency: string;
  features: string[];
  signalsPerDay: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlanDocument>(
  {
    name: { type: String, required: true },
    planType: {
      type: String,
      required: true,
    },
    segment: {
      type: String,
      required: true,
    },
    durationDays: { type: Number, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    features: [{ type: String }],
    signalsPerDay: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlanSchema.index({ segment: 1, planType: 1 });
PlanSchema.index({ isActive: 1 });

export const Plan = mongoose.model<IPlanDocument>('Plan', PlanSchema);
