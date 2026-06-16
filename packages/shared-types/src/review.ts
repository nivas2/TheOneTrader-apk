export enum ReviewStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface IReview {
  _id: string;
  userId: string;
  userName: string;
  planType: string;
  rating: number;
  comment: string;
  displayOnLandingPage: boolean;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}
