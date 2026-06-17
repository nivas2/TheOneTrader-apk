package com.theonetrade.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var prefs: SharedPreferences
    private var fcmToken: String? = null
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var fileChooserLauncher: ActivityResultLauncher<Intent>

    companion object {
        private const val TAG = "TheOneTrade"
        private const val WEB_URL = "https://pos.feastigo.com/theonetrade"
        private const val API_BASE = "https://pos.feastigo.com/theonetrade/api/v1"
        private const val USER_AGENT_SUFFIX = " TheOneTradeApp/1.0"
        private const val NOTIFICATION_PERMISSION_CODE = 1001
        const val PREFS_NAME = "theonetrade_prefs"
        const val PREF_AUTH_TOKEN = "auth_token"
        const val PREF_FCM_TOKEN = "fcm_token"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        window.statusBarColor = ContextCompat.getColor(this, R.color.brand_green)

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        // Register file chooser result handler
        fileChooserLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            val data = result.data
            val results = if (result.resultCode == RESULT_OK && data != null) {
                // Handle single or multiple file selection
                if (data.clipData != null) {
                    Array(data.clipData!!.itemCount) { i -> data.clipData!!.getItemAt(i).uri }
                } else if (data.data != null) {
                    arrayOf(data.data!!)
                } else {
                    null
                }
            } else {
                null
            }
            fileUploadCallback?.onReceiveValue(results ?: arrayOf())
            fileUploadCallback = null
        }

        setupWebView()
        setupBackNavigation()
        requestNotificationPermission()
        registerFCMToken()

        // Load deep link from notification tap, or default URL
        val deepLink = intent?.getStringExtra("deep_link_url")
        webView.loadUrl(deepLink ?: WEB_URL)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val deepLink = intent.getStringExtra("deep_link_url")
        if (deepLink != null) {
            webView.loadUrl(deepLink)
        }
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportMultipleWindows(false)
            loadWithOverviewMode = true
            useWideViewPort = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString$USER_AGENT_SUFFIX"
        }

        // Enable cookies (needed for login sessions)
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        // Add JavaScript bridge so WebView can send auth token to native
        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false

                // Allow our domain to load inside the WebView
                if (url.startsWith("https://pos.feastigo.com")) {
                    return false
                }

                // Open everything else in system browser / default handler
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                } catch (_: Exception) {}
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Inject JS to extract auth token from localStorage
                injectTokenExtractor()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    progressBar.visibility = View.GONE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                // Cancel any existing callback
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "File chooser failed", e)
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }
    }

    /**
     * Injects JavaScript that reads the auth token from localStorage and sends
     * it to the native side via AndroidBridge. Also monkey-patches localStorage
     * setItem/removeItem to detect login and logout in real-time.
     */
    private fun injectTokenExtractor() {
        val js = """
            (function() {
                try {
                    var token = localStorage.getItem('token');
                    if (token && window.AndroidBridge) {
                        window.AndroidBridge.onAuthToken(token);
                    }
                    // Intercept localStorage writes to detect login/logout
                    if (!window._androidBridgePatched) {
                        window._androidBridgePatched = true;
                        var origSetItem = localStorage.setItem.bind(localStorage);
                        localStorage.setItem = function(key, value) {
                            origSetItem(key, value);
                            if (key === 'token' && window.AndroidBridge) {
                                window.AndroidBridge.onAuthToken(value);
                            }
                        };
                        var origRemoveItem = localStorage.removeItem.bind(localStorage);
                        localStorage.removeItem = function(key) {
                            origRemoveItem(key);
                            if (key === 'token' && window.AndroidBridge) {
                                window.AndroidBridge.onAuthTokenCleared();
                            }
                        };
                    }
                } catch(e) {}
            })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true)
                }
            }
        })
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_CODE
                )
            }
        }
    }

    private fun registerFCMToken() {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            Log.d(TAG, "FCM token obtained")
            fcmToken = token
            prefs.edit().putString(PREF_FCM_TOKEN, token).apply()
            // If we already have an auth token, register immediately
            val authToken = prefs.getString(PREF_AUTH_TOKEN, null)
            if (authToken != null) {
                sendTokenToServer(token, authToken)
            }
        }
    }

    /** Called when JS bridge provides the auth token */
    private fun onAuthTokenReceived(authToken: String) {
        prefs.edit().putString(PREF_AUTH_TOKEN, authToken).apply()
        // Now register FCM token with the server (we have auth)
        val token = fcmToken ?: prefs.getString(PREF_FCM_TOKEN, null)
        if (token != null) {
            sendTokenToServer(token, authToken)
        }
    }

    /** Called when user logs out */
    private fun onAuthTokenCleared() {
        prefs.edit().remove(PREF_AUTH_TOKEN).apply()
    }

    private fun sendTokenToServer(deviceToken: String, authToken: String) {
        Thread {
            try {
                val url = java.net.URL("$API_BASE/auth/device-token")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $authToken")
                conn.doOutput = true
                conn.connectTimeout = 10_000
                conn.readTimeout = 10_000
                conn.outputStream.use { os ->
                    os.write("""{"deviceToken":"$deviceToken","platform":"android"}""".toByteArray())
                }
                val code = conn.responseCode
                Log.d(TAG, "Device token registration: HTTP $code")
                conn.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to register device token", e)
            }
        }.start()
    }

    /** JavaScript interface accessible from the WebView */
    inner class WebAppInterface {
        @JavascriptInterface
        fun onAuthToken(token: String) {
            Log.d(TAG, "Auth token received from WebView")
            runOnUiThread { onAuthTokenReceived(token) }
        }

        @JavascriptInterface
        fun onAuthTokenCleared() {
            Log.d(TAG, "Auth token cleared (user logged out)")
            runOnUiThread { this@MainActivity.onAuthTokenCleared() }
        }
    }
}
