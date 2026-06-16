import cron from 'node-cron';
import { Subscription } from '../models/Subscription';

export function startSubscriptionCron(): void {
  // Run at midnight IST (18:30 UTC) every day
  cron.schedule('30 18 * * *', async () => {
    try {
      const now = new Date();

      // Activate subscriptions where activatedAt <= now AND status is PENDING_ACTIVATION
      const activated = await Subscription.updateMany(
        {
          status: 'PENDING_ACTIVATION',
          activatedAt: { $lte: now },
        },
        { status: 'ACTIVE' }
      );

      if (activated.modifiedCount > 0) {
        console.warn(`Activated ${activated.modifiedCount} subscriptions`);
      }

      // Expire subscriptions where expiresAt <= now
      const expired = await Subscription.updateMany(
        {
          status: 'ACTIVE',
          expiresAt: { $lte: now },
        },
        { status: 'EXPIRED' }
      );

      if (expired.modifiedCount > 0) {
        console.warn(`Expired ${expired.modifiedCount} subscriptions`);
      }
    } catch (error) {
      console.error('Subscription cron error:', error);
    }
  });

  console.warn('Subscription cron job scheduled (runs at midnight)');
}
