import { getIO } from '../config/socket';
import { ISignalDocument } from '../models/Signal';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { SOCKET_EVENTS, getRoomName, NOTIFICATION_TYPES } from '@theonetrade/shared-types';
import { sendPushToTokens } from './pushService';

export async function broadcastSignal(signal: ISignalDocument): Promise<void> {
  const io = getIO();

  const payload = {
    signal: signal.toObject(),
    alarm: true,
    duration: 30,
  };

  // Broadcast only to the matching segment room
  io.to(getRoomName(signal.segment)).emit(SOCKET_EVENTS.SIGNAL_NEW, payload);

  // Also broadcast to admin room (without alarm)
  io.to('admin').emit(SOCKET_EVENTS.SIGNAL_NEW, {
    signal: signal.toObject(),
    alarm: false,
    duration: 0,
  });
}

export async function broadcastSignalUpdate(signal: ISignalDocument): Promise<void> {
  const io = getIO();

  // Broadcast to the matching segment room with alarm
  io.to(getRoomName(signal.segment)).emit(SOCKET_EVENTS.SIGNAL_UPDATE, {
    signal: signal.toObject(),
    alarm: true,
    duration: 30,
  });

  // Also broadcast to admin room (without alarm — admin initiated the action)
  io.to('admin').emit(SOCKET_EVENTS.SIGNAL_UPDATE, {
    signal: signal.toObject(),
    alarm: false,
    duration: 0,
  });
}

export async function sendSignalFCM(signal: ISignalDocument): Promise<void> {
  try {
    // Send only to users subscribed to the signal's segment
    const activeSubscriptions = await Subscription.find({
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() },
      segment: signal.segment,
    });

    const userIds = [...new Set(activeSubscriptions.map((s) => s.userId.toString()))];
    const users = await User.find({
      _id: { $in: userIds },
      'deviceTokens.0': { $exists: true },
    });

    const tokens = users.flatMap((u) => u.deviceTokens.map((d) => d.token));
    if (tokens.length === 0) return;

    await sendPushToTokens(
      tokens,
      `${signal.action} ${signal.instrument}`,
      `New ${signal.segment} signal: ${signal.action} ${signal.instrument}`,
      {
        type: NOTIFICATION_TYPES.SIGNAL_NEW,
        signalId: signal._id.toString(),
        segment: signal.segment,
        action: signal.action,
        instrument: signal.instrument,
        entryMin: String(signal.entryPriceRange?.min ?? ''),
        entryMax: String(signal.entryPriceRange?.max ?? ''),
        targetPrice: String(signal.targetPrice ?? ''),
        stopLoss: String(signal.stopLoss ?? ''),
        note: signal.note || '',
        alarm: 'true',
        duration: '30',
        channelId: 'signals',
      }
    );
  } catch (error) {
    console.error('FCM send error:', error);
  }
}

const STATUS_LABELS: Record<string, string> = {
  HIT_TARGET: 'Target Hit',
  HIT_SL: 'Stop Loss Hit',
  SAFE_EXIT: 'Safe Exit',
  CANCELLED: 'Cancelled',
};

export async function sendSignalStatusFCM(signal: ISignalDocument): Promise<void> {
  try {
    // Send status updates only to users subscribed to the signal's segment
    const activeSubscriptions = await Subscription.find({
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() },
      segment: signal.segment,
    });

    const userIds = [...new Set(activeSubscriptions.map((s) => s.userId.toString()))];
    const users = await User.find({
      _id: { $in: userIds },
      'deviceTokens.0': { $exists: true },
    });

    const tokens = users.flatMap((u) => u.deviceTokens.map((d) => d.token));
    if (tokens.length === 0) return;

    const statusLabel = STATUS_LABELS[signal.status] || signal.status;

    await sendPushToTokens(
      tokens,
      `${signal.instrument} — ${statusLabel}`,
      `${signal.segment} signal ${signal.action} ${signal.instrument} is now ${statusLabel}`,
      {
        type: NOTIFICATION_TYPES.SIGNAL_STATUS_UPDATE,
        signalId: signal._id.toString(),
        segment: signal.segment,
        status: signal.status,
        action: signal.action,
        instrument: signal.instrument,
        channelId: 'signals',
      }
    );
  } catch (error) {
    console.error('Signal status FCM error:', error);
  }
}
