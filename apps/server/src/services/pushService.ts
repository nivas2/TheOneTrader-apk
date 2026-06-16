import { getFirebaseApp } from '../config/firebase';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { RecipientType } from '@theonetrade/shared-types';

const BATCH_SIZE = 500;

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp || tokens.length === 0) return;

  const messaging = firebaseApp.messaging();
  const uniqueTokens = [...new Set(tokens)];

  // Process in batches of 500
  for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
    const batch = uniqueTokens.slice(i, i + BATCH_SIZE);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: {
          ...data,
          channelId: data?.channelId || 'general',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: data?.channelId || 'general',
            sound: 'default',
          },
        },
      });

      // Clean up invalid/stale tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(batch[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await User.updateMany(
          { 'deviceTokens.token': { $in: invalidTokens } },
          { $pull: { deviceTokens: { token: { $in: invalidTokens } } } }
        );
      }
    } catch (error) {
      console.error('FCM batch send error:', error);
    }
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const user = await User.findById(userId).select('deviceTokens');
  if (!user || !user.deviceTokens || user.deviceTokens.length === 0) return;

  const tokens = user.deviceTokens.map((d) => d.token);
  await sendPushToTokens(tokens, title, body, data);
}

export async function sendPushToAdmins(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const admins = await User.find({
    role: 'ADMIN',
    'deviceTokens.0': { $exists: true },
  }).select('deviceTokens');

  const tokens = admins.flatMap((a) => a.deviceTokens.map((d) => d.token));
  if (tokens.length === 0) return;

  await sendPushToTokens(tokens, title, body, data);
}

export async function logNotification(params: {
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  recipientType: RecipientType;
  recipientFilter?: string;
  sentBy?: string;
  recipientCount: number;
}): Promise<void> {
  try {
    await Notification.create(params);
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}
