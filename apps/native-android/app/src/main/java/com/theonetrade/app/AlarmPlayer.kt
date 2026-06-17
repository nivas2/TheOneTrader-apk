package com.theonetrade.app

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.util.Log

object AlarmPlayer {

    private const val TAG = "TheOneTrade"
    private var mediaPlayer: MediaPlayer? = null

    fun play(context: Context) {
        if (mediaPlayer != null) return // Already playing

        try {
            mediaPlayer = MediaPlayer.create(context.applicationContext, R.raw.alarm).apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build()
                )
                isLooping = true
                setVolume(1.0f, 1.0f)
                start()
            }
            Log.d(TAG, "Alarm started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play alarm", e)
            mediaPlayer = null
        }
    }

    fun stop() {
        mediaPlayer?.let {
            try {
                if (it.isPlaying) it.stop()
                it.release()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop alarm", e)
            }
            mediaPlayer = null
            Log.d(TAG, "Alarm stopped")
        }
    }

    fun isPlaying(): Boolean = mediaPlayer != null
}
