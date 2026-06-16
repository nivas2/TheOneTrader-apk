import { User } from '../models/User';

export async function migrateDeviceTokens(): Promise<void> {
  try {
    const result = await User.updateMany(
      {
        deviceToken: { $exists: true, $ne: '' },
        'deviceTokens.0': { $exists: false },
      },
      [
        {
          $set: {
            deviceTokens: [
              {
                token: '$deviceToken',
                platform: 'android',
                updatedAt: new Date(),
              },
            ],
          },
        },
      ]
    );

    if (result.modifiedCount > 0) {
      console.log(`Migrated ${result.modifiedCount} user(s) from deviceToken to deviceTokens`);
    }
  } catch (error) {
    console.error('Device token migration error:', error);
  }
}
