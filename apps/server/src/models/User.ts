import mongoose, { Schema, Document } from 'mongoose';

export interface IDeviceToken {
  token: string;
  platform: 'web' | 'android' | 'ios';
  updatedAt: Date;
}

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  isVerified: boolean;
  isActive: boolean;
  deviceToken?: string;
  deviceTokens: IDeviceToken[];
  currentSessionId?: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

const DeviceTokenSchema = new Schema<IDeviceToken>(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ['web', 'android', 'ios'], required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deviceToken: { type: String },
    deviceTokens: { type: [DeviceTokenSchema], default: [] },
    currentSessionId: { type: String },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ 'deviceTokens.token': 1 });

export const User = mongoose.model<IUserDocument>('User', UserSchema);
