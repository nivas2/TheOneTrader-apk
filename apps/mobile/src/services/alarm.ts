import { Audio } from 'expo-av';

let alarmSound: Audio.Sound | null = null;
let alarmTimeout: ReturnType<typeof setTimeout> | null = null;

export async function playAlarm(durationSeconds: number = 30): Promise<void> {
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

    // Auto-stop after duration
    alarmTimeout = setTimeout(() => {
      stopAlarm();
    }, durationSeconds * 1000);
  } catch (error) {
    console.error('Failed to play alarm sound:', error);
  }
}

export async function stopAlarm(): Promise<void> {
  if (alarmTimeout) {
    clearTimeout(alarmTimeout);
    alarmTimeout = null;
  }

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
