import mongoose, { Schema, Document } from 'mongoose';

export interface ISignalDocument extends Document {
  segment: string;
  subCategory: string;
  targetIntervals: string[];
  action: string;
  instrument: string;
  entryPriceRange: { min: number; max: number };
  targetPrice: number;
  stopLoss: number;
  safeExit?: number;
  note?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const SignalSchema = new Schema<ISignalDocument>(
  {
    segment: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
      required: true,
    },
    targetIntervals: [{ type: String }],
    action: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    instrument: { type: String, required: true, trim: true },
    entryPriceRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    targetPrice: { type: Number, required: true },
    stopLoss: { type: Number, required: true },
    safeExit: { type: Number },
    note: { type: String },
    status: {
      type: String,
      enum: ['ACTIVE', 'HIT_TARGET', 'HIT_SL', 'SAFE_EXIT', 'CANCELLED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

SignalSchema.index({ status: 1 });
SignalSchema.index({ segment: 1, status: 1 });
SignalSchema.index({ createdAt: -1 });

export const Signal = mongoose.model<ISignalDocument>('Signal', SignalSchema);
