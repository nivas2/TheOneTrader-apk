import { Audio } from 'expo-av';

let alarmSound: Audio.Sound | null = null;

export async function playAlarm(): Promise<void> {
  // Don't start another alarm if one is already playing
  if (alarmSound) return;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/alarm.wav'),
      { isLooping: true, volume: 1.0 }
    );

    alarmSound = sound;
    await sound.playAsync();
  } catch (error) {
    console.error('Failed to play alarm sound:', error);
  }
}

export async function stopAlarm(): Promise<void> {
  if (alarmSound) {
    try {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
    } catch {
      // Sound already unloaded
    }
    alarmSound = null;
  }
}

export function isAlarmPlaying(): boolean {
  return alarmSound !== null;
}
