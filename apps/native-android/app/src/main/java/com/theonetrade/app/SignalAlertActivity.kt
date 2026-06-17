package com.theonetrade.app

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton

class SignalAlertActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_ACTION = "signal_action"
        const val EXTRA_INSTRUMENT = "signal_instrument"
        const val EXTRA_SEGMENT = "signal_segment"
        const val EXTRA_ENTRY_MIN = "signal_entry_min"
        const val EXTRA_ENTRY_MAX = "signal_entry_max"
        const val EXTRA_TARGET = "signal_target"
        const val EXTRA_STOP_LOSS = "signal_stop_loss"
        const val EXTRA_NOTE = "signal_note"
        const val EXTRA_SIGNAL_ID = "signal_id"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Show over lock screen
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        setContentView(R.layout.activity_signal_alert)

        // Start alarm
        AlarmPlayer.play(this)

        // Populate signal data
        val action = intent.getStringExtra(EXTRA_ACTION) ?: "BUY"
        val instrument = intent.getStringExtra(EXTRA_INSTRUMENT) ?: ""
        val segment = intent.getStringExtra(EXTRA_SEGMENT) ?: ""
        val entryMin = intent.getStringExtra(EXTRA_ENTRY_MIN) ?: ""
        val entryMax = intent.getStringExtra(EXTRA_ENTRY_MAX) ?: ""
        val target = intent.getStringExtra(EXTRA_TARGET) ?: ""
        val stopLoss = intent.getStringExtra(EXTRA_STOP_LOSS) ?: ""
        val note = intent.getStringExtra(EXTRA_NOTE) ?: ""

        val actionBadge = findViewById<TextView>(R.id.actionBadge)
        actionBadge.text = action
        actionBadge.setBackgroundResource(
            if (action == "BUY") R.drawable.action_badge_buy else R.drawable.action_badge_sell
        )

        findViewById<TextView>(R.id.instrumentName).text = instrument
        findViewById<TextView>(R.id.segmentText).text = segment

        val entryText = if (entryMin.isNotEmpty() && entryMax.isNotEmpty()) "$entryMin - $entryMax" else ""
        findViewById<TextView>(R.id.entryPrice).text = entryText
        findViewById<TextView>(R.id.targetPrice).text = target
        findViewById<TextView>(R.id.stopLossPrice).text = stopLoss

        val noteView = findViewById<TextView>(R.id.noteText)
        if (note.isNotEmpty()) {
            noteView.text = note
            noteView.visibility = View.VISIBLE
        }

        // Pulse animation on the alert icon
        val alertIcon = findViewById<TextView>(R.id.alertIcon)
        ObjectAnimator.ofFloat(alertIcon, "alpha", 1f, 0.3f).apply {
            duration = 500
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            start()
        }

        // Acknowledge button
        findViewById<MaterialButton>(R.id.acknowledgeButton).setOnClickListener {
            AlarmPlayer.stop()
            finish()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Ensure alarm is stopped if activity is destroyed
        AlarmPlayer.stop()
    }

    @Deprecated("Use onBackPressedDispatcher")
    override fun onBackPressed() {
        // Don't allow back press — must acknowledge
    }
}
