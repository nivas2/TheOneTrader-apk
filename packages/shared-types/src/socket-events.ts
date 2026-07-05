import { ISignal } from './signal';

// Event name constants
export const SOCKET_EVENTS = {
  // Signal events
  SIGNAL_NEW: 'signal:new',
  SIGNAL_UPDATE: 'signal:update',
  SIGNAL_ACKNOWLEDGE: 'acknowledge_signal_view',
  SIGNAL_SILENCE_ALARM: 'silence_alarm',

  // Payment events
  PAYMENT_PENDING: 'payment:pending',
  PAYMENT_APPROVED: 'payment:approved',

  // Telemetry events
  HEARTBEAT: 'telemetry:heartbeat',
  TELEMETRY_UPDATE: 'telemetry:update',

  // Ticker events
  TICKER_UPDATE: 'ticker:update',

  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOMS: 'join_rooms',
} as const;

// Room naming convention
export const getRoomName = (segment: string): string =>
  `room_${segment.toLowerCase()}`;

// Payload types
export interface SignalNewPayload {
  signal: ISignal;
  alarm: boolean;
  duration: number;
}

export interface SignalAcknowledgePayload {
  signalId: string;
  userId: string;
}

export interface HeartbeatPayload {
  userId: string;
  page: string;
  viewport: { width: number; height: number };
  timestamp: number;
}

export interface TelemetryUpdatePayload {
  connectedClients: number;
  roomCounts: Record<string, number>;
  activeUsers: Array<{
    userId: string;
    page: string;
    lastSeen: number;
  }>;
}

export interface PaymentPendingPayload {
  subscriptionId: string;
  userId: string;
  userName: string;
  planType: string;
  segment: string;
}

export interface MarketIndex {
  name: string;
  price: string;
  change: string;
  up: boolean;
}

export interface TickerUpdatePayload {
  indices: MarketIndex[];
  timestamp: number;
}
