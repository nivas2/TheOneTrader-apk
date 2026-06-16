import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationDocument extends Document {
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  recipientType: 'all' | 'segment' | 'individual' | 'admins';
  recipientFilter?: string;
  sentBy?: mongoose.Types.ObjectId;
  recipientCount: number;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    recipientType: {
      type: String,
      enum: ['all', 'segment', 'individual', 'admins'],
      required: true,
    },
    recipientFilter: { type: String },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotificationDocument>('Notification', NotificationSchema);
