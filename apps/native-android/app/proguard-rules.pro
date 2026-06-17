# Default ProGuard rules for Android
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.firebase.messaging.* <methods>;
}
