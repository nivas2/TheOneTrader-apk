package com.theonetrade.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class FCMService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "TheOneTrade"
        private const val CHANNEL_SIGNALS = "signals"
        private const val CHANNEL_GENERAL = "general"
        private const val WEB_URL = "https://pos.feastigo.com/theonetrade"

        private val ROUTE_MAP = mapOf(
            "SIGNAL_NEW" to "/signals",
            "SIGNAL_STATUS_UPDATE" to "/signals",
            "SUBSCRIPTION_APPROVED" to "/payment",
            "SUBSCRIPTION_REJECTED" to "/payment",
            "PAYMENT_CONFIRMED" to "/payment",
            "CUSTOM_MESSAGE" to "/signals",
            "MARKET_ALERT" to "/signals",
        )
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")
        val prefs = getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(MainActivity.PREF_FCM_TOKEN, token).apply()
        // Register with server if we have a saved auth token
        val authToken = prefs.getString(MainActivity.PREF_AUTH_TOKEN, null)
        if (authToken != null) {
            sendTokenToServer(token, authToken)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "FCM message received: type=${message.data["type"]}")

        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.app_name)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: ""
        val type = message.data["type"] ?: ""
        val url = message.data["url"]

        // Determine where to navigate when notification is tapped
        val deepLink = url
            ?: ROUTE_MAP[type]?.let { "$WEB_URL$it" }
            ?: WEB_URL

        // Use signals channel for trading-related notifications
        val channel = if (type.startsWith("SIGNAL") || type == "MARKET_ALERT")
            CHANNEL_SIGNALS else CHANNEL_GENERAL

        showNotification(title, body, deepLink, channel)
    }

    private fun showNotification(
        title: String,
        body: String,
        deepLink: String,
        channel: String
    ) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("deep_link_url", deepLink)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notification = NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setColor(getColor(R.color.brand_green))
            .setSound(soundUri)
            .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()

            val signalsChannel = NotificationChannel(
                CHANNEL_SIGNALS,
                "Trading Signals",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Trading signal alerts"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                setSound(soundUri, audioAttributes)
            }

            val generalChannel = NotificationChannel(
                CHANNEL_GENERAL,
                "General",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "General notifications"
                setSound(soundUri, audioAttributes)
            }

            manager.createNotificationChannel(signalsChannel)
            manager.createNotificationChannel(generalChannel)
        }
    }

    private fun sendTokenToServer(token: String, authToken: String) {
        Thread {
            try {
                val url = java.net.URL("https://pos.feastigo.com/api/v1/auth/device-token")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $authToken")
                conn.doOutput = true
                conn.connectTimeout = 10_000
                conn.readTimeout = 10_000
                conn.outputStream.use { os ->
                    os.write("""{"deviceToken":"$token","platform":"android"}""".toByteArray())
                }
                val code = conn.responseCode
                Log.d(TAG, "FCM token registration (service): HTTP $code")
                conn.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to register FCM token from service", e)
            }
        }.start()
    }
}
