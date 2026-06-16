import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpDocument extends Document {
  email: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtpDocument>(
  {
    email: { type: String, required: true, lowercase: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

OtpSchema.index({ email: 1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model<IOtpDocument>('Otp', OtpSchema);
