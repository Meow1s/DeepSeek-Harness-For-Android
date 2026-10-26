package com.meow1s.dshlauncher;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.TimeUnit;

/**
 * A thin WebView shell for the local DSH launcher.
 *
 * The Node launcher and DSH still run inside the Android Linux userland
 * (Eta/Termux proot). This APK only gives them a native home-screen entry and
 * a full-screen WebView; it does not bundle Node, DSH, or the proot rootfs.
 */
public class MainActivity extends Activity {
    private static final String HOME_URL = "http://127.0.0.1:3081/";
    private static final String HEALTH_URL = "http://127.0.0.1:3081/healthz";
    private static final int FILE_CHOOSER_REQUEST = 41;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private WebView webView;
    private ProgressBar progress;
    private View errorPanel;
    private TextView errorDetail;
    private Button startServiceButton;
    private ValueCallback<Uri[]> fileCallback;
    private boolean mainFrameFailed = false;
    private Object backDispatcher;
    private Object backCallback;
    private boolean backCallbackRegistered = false;
    private boolean dshOpen = false;
    private boolean sheetOpen = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars();
        setContentView(R.layout.activity_main);
        requestNotificationPermission();

        webView = findViewById(R.id.webView);
        progress = findViewById(R.id.progress);
        errorPanel = findViewById(R.id.errorPanel);
        errorDetail = findViewById(R.id.errorDetail);
        startServiceButton = findViewById(R.id.startServiceButton);

        findViewById(R.id.retryButton).setOnClickListener(v -> loadLauncher());
        startServiceButton.setOnClickListener(v -> startLocalService());

        configureWebView();
        loadLauncher();
    }

    private boolean isNightMode() {
        int mode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return mode == Configuration.UI_MODE_NIGHT_YES;
    }

    private void applySystemBars() {
        Window window = getWindow();
        int background = isNightMode() ? Color.rgb(17, 17, 17) : Color.rgb(247, 247, 247);
        window.setStatusBarColor(background);
        window.setNavigationBarColor(isNightMode() ? Color.rgb(17, 17, 17) : Color.WHITE);

        View decor = window.getDecorView();
        int flags = decor.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
        if (isNightMode()) {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        decor.setSystemUiVisibility(flags);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(false);
        webView.setBackgroundColor(isNightMode() ? Color.rgb(17, 17, 17) : Color.rgb(247, 247, 247));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new DshBridge(), "DSHNative");
        webView.addJavascriptInterface(new NotifyBridge(), "DSHNotify");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return false;
                if (isLocalHttp(uri) || "about".equals(uri.getScheme())) return false;
                if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) {
                    openExternal(uri);
                    return true;
                }
                if ("mailto".equals(uri.getScheme()) || "tel".equals(uri.getScheme())) {
                    openExternal(uri);
                    return true;
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                mainFrameFailed = false;
                errorPanel.setVisibility(View.GONE);
                progress.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!mainFrameFailed) {
                    progress.setVisibility(View.GONE);
                    errorPanel.setVisibility(View.GONE);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    mainFrameFailed = true;
                    String detail = getString(R.string.error_message)
                            + "\n\n" + error.getDescription()
                            + " (" + error.getErrorCode() + ")";
                    showError(detail);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                if (newProgress >= 100 && !mainFrameFailed) {
                    progress.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                if (params != null) {
                    String[] accepted = params.getAcceptTypes();
                    if (accepted != null && accepted.length > 0) {
                        String first = accepted[0];
                        if (first != null && !first.isEmpty()) {
                            intent.setType(first);
                            if (accepted.length > 1) {
                                intent.putExtra(Intent.EXTRA_MIME_TYPES, accepted);
                            }
                        }
                    }
                }

                try {
                    startActivityForResult(Intent.createChooser(intent, getString(R.string.choose_file)),
                            FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 901);
        }
    }

    /**
     * JS bridge used by the launcher PWA when the DSH task bridge reports
     * running / update / completed / failed edges.
     */
    public class NotifyBridge {
        @JavascriptInterface
        public void taskStart(String title, String process, long startedAt) {
            TaskNotificationService.start(MainActivity.this, title, process, startedAt);
        }

        @JavascriptInterface
        public void taskUpdate(String process) {
            TaskNotificationService.update(MainActivity.this, process);
        }

        @JavascriptInterface
        public void taskFinish(boolean failed, String message) {
            TaskNotificationService.finish(MainActivity.this, failed, message);
        }

        @JavascriptInterface
        public void taskCancel() {
            TaskNotificationService.cancel(MainActivity.this);
        }
    }

    /**
     * The PWA registers a back callback while DSH or a bottom sheet is open.
     * At launcher home both are false, so Android 13+ can use the
     * system/Miuix predictive back animation to close the activity.
     */
    public class DshBridge {
        @JavascriptInterface
        public void setDshOpen(boolean open) {
            runOnUiThread(() -> {
                dshOpen = open;
                updateBackCallback();
            });
        }

        @JavascriptInterface
        public void setSheetOpen(boolean open) {
            runOnUiThread(() -> {
                sheetOpen = open;
                updateBackCallback();
            });
        }
    }

    private void updateBackCallback() {
        if (Build.VERSION.SDK_INT < 33) return;
        boolean shouldRegister = dshOpen || sheetOpen;
        if (shouldRegister == backCallbackRegistered) return;
        try {
            if (backDispatcher == null) {
                Method getDispatcher = Activity.class.getMethod("getOnBackInvokedDispatcher");
                backDispatcher = getDispatcher.invoke(this);
            }
            Class<?> callbackType = Class.forName("android.window.OnBackInvokedCallback");
            Class<?> dispatcherType = Class.forName("android.window.OnBackInvokedDispatcher");
            if (shouldRegister) {
                if (backCallback == null) {
                    backCallback = Proxy.newProxyInstance(
                            callbackType.getClassLoader(),
                            new Class<?>[]{callbackType},
                            (proxy, method, args) -> {
                                if ("onBackInvoked".equals(method.getName())) {
                                    runOnUiThread(() -> {
                                        if (sheetOpen && webView != null) {
                                            webView.evaluateJavascript(
                                                    "window.__dshCloseSheet && window.__dshCloseSheet()", null);
                                        } else if (webView != null && webView.canGoBack()) {
                                            webView.goBack();
                                        } else {
                                            moveTaskToBack(true);
                                        }
                                    });
                                }
                                return null;
                            });
                }
                Method register = dispatcherType.getMethod(
                        "registerOnBackInvokedCallback", int.class, callbackType);
                register.invoke(backDispatcher, 0, backCallback);
                backCallbackRegistered = true;
            } else {
                Method unregister = dispatcherType.getMethod(
                        "unregisterOnBackInvokedCallback", callbackType);
                unregister.invoke(backDispatcher, backCallback);
                backCallbackRegistered = false;
            }
        } catch (Exception ignored) {
            // Older vendor ROMs or a changed hidden API: fall back to onBackPressed.
        }
    }

    private boolean isLocalHttp(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return "http".equals(scheme)
                && ("127.0.0.1".equals(host) || "localhost".equals(host));
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "无法打开链接", Toast.LENGTH_SHORT).show();
        }
    }

    private void loadLauncher() {
        mainFrameFailed = false;
        errorPanel.setVisibility(View.GONE);
        progress.setProgress(0);
        progress.setVisibility(View.VISIBLE);
        webView.loadUrl(HOME_URL);
    }

    private void showError(String detail) {
        errorDetail.setText(detail);
        errorPanel.setVisibility(View.VISIBLE);
        progress.setVisibility(View.GONE);
    }

    private boolean isHealthy() {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(HEALTH_URL).openConnection();
            connection.setConnectTimeout(700);
            connection.setReadTimeout(700);
            connection.setUseCaches(false);
            connection.setRequestMethod("GET");
            return connection.getResponseCode() == 200;
        } catch (Exception ignored) {
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void startLocalService() {
        startServiceButton.setEnabled(false);
        startServiceButton.setText(R.string.starting_service);
        progress.setVisibility(View.VISIBLE);
        Toast.makeText(this, R.string.starting_service, Toast.LENGTH_SHORT).show();

        new Thread(() -> {
            String failure = null;
            try {
                Process process = Runtime.getRuntime().exec(new String[]{
                        "su", "-c", "sh /data/adb/service.d/dsh-launcher.sh"
                });
                if (!process.waitFor(25, TimeUnit.SECONDS)) {
                    process.destroy();
                    failure = "启动命令超时";
                }
            } catch (Exception e) {
                failure = e.getMessage();
            }

            boolean healthy = false;
            for (int i = 0; i < 40; i++) {
                if (isHealthy()) {
                    healthy = true;
                    break;
                }
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }

            final boolean ok = healthy;
            final String error = failure;
            mainHandler.post(() -> {
                startServiceButton.setEnabled(true);
                startServiceButton.setText(R.string.start_service);
                if (ok) {
                    loadLauncher();
                } else {
                    String detail = getString(R.string.service_failed);
                    if (error != null) detail += "\n\n" + error;
                    showError(detail);
                }
            });
        }).start();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileCallback != null) {
                Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                fileCallback.onReceiveValue(result);
                fileCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemBars();
        if (webView != null) {
            webView.setBackgroundColor(isNightMode() ? Color.rgb(17, 17, 17) : Color.rgb(247, 247, 247));
        }
    }

    @SuppressLint("GestureBackNavigation")
    @Override
    public void onBackPressed() {
        if (sheetOpen && webView != null) {
            webView.evaluateJavascript("window.__dshCloseSheet && window.__dshCloseSheet()", null);
        } else if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onPause() {
        // Keep the WebView JS alive while a task runs so the foreground task
        // notification can keep receiving process updates.
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
