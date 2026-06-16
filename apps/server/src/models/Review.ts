import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewDocument extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  planType: string;
  rating: number;
  comment: string;
  displayOnLandingPage: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReviewDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    planType: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    displayOnLandingPage: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'PENDING_REVIEW',
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ status: 1, displayOnLandingPage: 1 });

export const Review = mongoose.model<IReviewDocument>('Review', ReviewSchema);
