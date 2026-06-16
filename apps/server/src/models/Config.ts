import mongoose, { Schema, Document } from 'mongoose';

export interface IConfigInterval {
  key: string;
  label: string;
}

export interface IConfigDocument extends Document {
  marqueeWarningText: string;
  publicHistoryStartDate: Date;
  publicHistoryEndDate: Date;
  whatsappActive: boolean;
  promotionalBanners: string[];
  paymentQrImagePath: string;
  termsAndConditions: string;
  whatsappPhone: string;
  signalIntervals: IConfigInterval[];
  segments: IConfigInterval[];
  categories: IConfigInterval[];
  instruments: string[];
  apkFileName: string;
  apkOriginalName: string;
  apkUploadedAt: Date;
  apkVersion: string;
}

const ConfigSchema = new Schema<IConfigDocument>(
  {
    marqueeWarningText: { type: String, default: 'Trading involves risk. Past performance is not indicative of future results.' },
    publicHistoryStartDate: { type: Date, default: new Date('2024-01-01') },
    publicHistoryEndDate: { type: Date, default: new Date() },
    whatsappActive: { type: Boolean, default: true },
    promotionalBanners: [{ type: String }],
    paymentQrImagePath: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
    whatsappPhone: { type: String, default: '' },
    signalIntervals: {
      type: [{ key: { type: String, required: true }, label: { type: String, required: true } }],
      default: [
        { key: 'DAILY', label: 'Daily' },
        { key: 'WEEKLY', label: 'Weekly' },
        { key: 'MONTHLY', label: 'Monthly' },
      ],
    },
    segments: {
      type: [{ key: { type: String, required: true }, label: { type: String, required: true } }],
      default: [
        { key: 'INTRADAY', label: 'Intraday' },
        { key: 'FANDO', label: 'F&O' },
        { key: 'MTF', label: 'MTF' },
        { key: 'LONGTERM', label: 'Long Term' },
        { key: 'SHORTTERM', label: 'Short Term' },
      ],
    },
    categories: {
      type: [{ key: { type: String, required: true }, label: { type: String, required: true } }],
      default: [
        { key: 'EQUITY', label: 'Equity' },
        { key: 'INDEX', label: 'Index' },
        { key: 'COMMODITY', label: 'Commodity' },
        { key: 'CURRENCY', label: 'Currency' },
      ],
    },
    instruments: {
      type: [String],
      default: [],
    },
    apkFileName: { type: String, default: '' },
    apkOriginalName: { type: String, default: '' },
    apkUploadedAt: { type: Date },
    apkVersion: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Config = mongoose.model<IConfigDocument>('Config', ConfigSchema);
