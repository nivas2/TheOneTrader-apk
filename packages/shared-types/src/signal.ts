import { Segment, TargetInterval } from './subscription';

export enum SubCategory {
  EQUITY = 'EQUITY',
  INDEX = 'INDEX',
  COMMODITY = 'COMMODITY',
  CURRENCY = 'CURRENCY',
}

export enum SignalAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum SignalStatus {
  ACTIVE = 'ACTIVE',
  HIT_TARGET = 'HIT_TARGET',
  HIT_SL = 'HIT_SL',
  SAFE_EXIT = 'SAFE_EXIT',
  CANCELLED = 'CANCELLED',
}

export interface ISignal {
  _id: string;
  segment: Segment;
  subCategory: SubCategory;
  targetIntervals: TargetInterval[];
  action: SignalAction;
  instrument: string;
  entryPriceRange: {
    min: number;
    max: number;
  };
  targetPrice: number;
  stopLoss: number;
  safeExit?: number;
  note?: string;
  status: SignalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISignalMasked extends Omit<ISignal, 'instrument' | 'entryPriceRange' | 'targetPrice' | 'stopLoss' | 'safeExit'> {
  instrument: string;
  entryPriceRange: { min: string; max: string };
  targetPrice: string;
  stopLoss: string;
  safeExit?: string;
  requiresPremium: boolean;
}
