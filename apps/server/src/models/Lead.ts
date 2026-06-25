import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadDocument extends Document {
  name: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
  createdAt: Date;
}

const LeadSchema = new Schema<ILeadDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    status: { type: String, default: 'New', trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1 });
LeadSchema.index({ status: 1 });

export const Lead = mongoose.model<ILeadDocument>('Lead', LeadSchema);
