#!/bin/bash
set -e

export ANDROID_HOME=/opt/android-sdk
export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:$PATH
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# Install SDK components
yes | sdkmanager --licenses 2>/dev/null || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "=== SDK installed ==="

# Create project
rm -rf /tmp/theonetrade-twa
mkdir -p /tmp/theonetrade-twa
cd /tmp/theonetrade-twa

# Gradle wrapper
mkdir -p gradle/wrapper
cat > gradle/wrapper/gradle-wrapper.properties << 'GWEOF'
distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-bin.zip
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
GWEOF

# Download gradle wrapper jar
wget -q "https://raw.githubusercontent.com/nicolo-ribaudo/tc39-proposal-concurrency-control/refs/heads/main/gradle/wrapper/gradle-wrapper.jar" -O gradle/wrapper/gradle-wrapper.jar 2>/dev/null || true

# Create gradlew
cat > gradlew << 'GRADLEW'
#!/bin/sh
exec java -jar "$(dirname "$0")/gradle/wrapper/gradle-wrapper.jar" "$@"
GRADLEW
chmod +x gradlew

# settings.gradle
cat > settings.gradle << 'EOF'
rootProject.name = 'TheOneTrade'
include ':app'
EOF

# build.gradle
cat > build.gradle << 'BEOF'
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.3.0'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
BEOF

# App module
mkdir -p app/src/main/java/com/theonetrade/app
mkdir -p app/src/main/res/values
mkdir -p app/src/main/res/drawable
mkdir -p app/src/main/res/mipmap-hdpi
mkdir -p app/src/main/res/mipmap-xhdpi
mkdir -p app/src/main/res/mipmap-xxhdpi
mkdir -p app/src/main/res/layout

# Copy icon
cp /var/www/theonetrade/apps/web/public/icon-192.png app/src/main/res/mipmap-hdpi/ic_launcher.png
cp /var/www/theonetrade/apps/web/public/icon-192.png app/src/main/res/mipmap-xhdpi/ic_launcher.png
cp /var/www/theonetrade/apps/web/public/icon-192.png app/src/main/res/mipmap-xxhdpi/ic_launcher.png

# app/build.gradle
cat > app/build.gradle << 'ABEOF'
plugins {
    id 'com.android.application'
}

android {
    namespace 'com.theonetrade.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.theonetrade.webapp"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.webkit:webkit:1.10.0'
    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'
}
ABEOF

# proguard
cat > app/proguard-rules.pro << 'PEOF'
-keepattributes *Annotation*
-dontwarn androidx.**
PEOF

# AndroidManifest.xml
cat > app/src/main/AndroidManifest.xml << 'MEOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="TheOneTrade"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="false">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
MEOF

# Splash / theme
cat > app/src/main/res/values/styles.xml << 'SEOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:statusBarColor">#00B090</item>
        <item name="android:navigationBarColor">#00B090</item>
        <item name="android:windowBackground">#FFF8F9FA</item>
    </style>
</resources>
SEOF

cat > app/src/main/res/values/colors.xml << 'CEOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="brand">#00B090</color>
    <color name="white">#FFFFFF</color>
</resources>
CEOF

cat > app/src/main/res/values/strings.xml << 'STREOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">TheOneTrade</string>
</resources>
STREOF

# Layout
cat > app/src/main/res/layout/activity_main.xml << 'LEOF'
<?xml version="1.0" encoding="utf-8"?>
<androidx.swiperefreshlayout.widget.SwipeRefreshLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/swipeRefresh"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <android.webkit.WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</androidx.swiperefreshlayout.widget.SwipeRefreshLayout>
LEOF

# MainActivity.java
cat > app/src/main/java/com/theonetrade/app/MainActivity.java << 'JEOF'
package com.theonetrade.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.PermissionRequest;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {
    private static final String WEB_URL = "https://pos.feastigo.com/theonetrade";
    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);

        swipeRefresh.setColorSchemeColors(0xFF00B090);
        swipeRefresh.setOnRefreshListener(() -> {
            webView.reload();
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " TheOneTradeApp/1.0");

        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.contains("pos.feastigo.com/theonetrade")) {
                    return false;
                }
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipeRefresh.setRefreshing(false);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                fileUploadCallback = callback;
                Intent intent = params.createIntent();
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }
        });

        webView.loadUrl(WEB_URL);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
JEOF

echo "=== Project created ==="

# Build using gradle
cd /tmp/theonetrade-twa
export ANDROID_SDK_ROOT=/opt/android-sdk

# Use gradle directly
wget -q "https://services.gradle.org/distributions/gradle-8.7-bin.zip" -O /tmp/gradle.zip
mkdir -p /opt/gradle
unzip -qo /tmp/gradle.zip -d /opt/gradle
export PATH=/opt/gradle/gradle-8.7/bin:$PATH

gradle assembleRelease --no-daemon 2>&1 | tail -20

echo "=== Build complete ==="
ls -lh app/build/outputs/apk/release/ 2>/dev/null || echo "checking debug..."
ls -lh app/build/outputs/apk/debug/ 2>/dev/null || echo "no output found"
