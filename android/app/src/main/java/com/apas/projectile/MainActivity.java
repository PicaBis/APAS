package com.apas.projectile;

import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.PermissionRequest;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "APAS";
    private WebView webView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge + immersive fullscreen: hide system bars like a native game/app
        applyImmersive();

        // Make status/nav bar backgrounds transparent so WebView fills the entire screen
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);

        webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setTextZoom(100);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        // Dark background to match app theme while WebView loads
        webView.setBackgroundColor(android.graphics.Color.parseColor("#0a0a2e"));

        // ---- Bridge so JS can write files to the device's Downloads folder. ----
        webView.addJavascriptInterface(new ApasNative(), "ApasNative");

        // ---- Auto-grant Web permissions (camera, mic) the in-app features need.
        // Also inject a JS shim that re-routes <a download> clicks to native saving.
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                if (newProgress >= 100) {
                    view.evaluateJavascript(DOWNLOAD_SHIM_JS, null);
                }
            }
        });

        // ---- Download handling: <a download> with blob:/data:/http(s) URLs. ----
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                if (url.startsWith("blob:")) {
                    // Read the blob inside the page, base64-encode it, and pipe it back.
                    String js = buildBlobReaderJs(url, filename, mimeType);
                    webView.evaluateJavascript(js, null);
                } else if (url.startsWith("data:")) {
                    saveDataUri(url, filename);
                } else {
                    // Standard http(s) — let Android's DownloadManager handle it.
                    DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                    req.setMimeType(mimeType);
                    req.addRequestHeader("User-Agent", userAgent);
                    req.setDescription("APAS download");
                    req.setTitle(filename);
                    req.allowScanningByMediaScanner();
                    req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) dm.enqueue(req);
                    toast("جاري التنزيل: " + filename);
                }
            } catch (Exception e) {
                Log.e(TAG, "Download error", e);
                toast("فشل التنزيل: " + e.getMessage());
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersive();
        }
    }

    @SuppressWarnings("deprecation")
    private void applyImmersive() {
        // Draw behind the system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            View decorView = getWindow().getDecorView();
            int flags = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN;
            decorView.setSystemUiVisibility(flags);
        }
    }

    /**
     * JS snippet that fetches a blob: URL inside the page, converts the blob to
     * base64, and hands it back to native via the ApasNative bridge.
     */
    private String buildBlobReaderJs(String blobUrl, String filename, String mimeType) {
        String safeUrl = blobUrl.replace("'", "\\'");
        String safeName = filename.replace("'", "\\'");
        String safeMime = (mimeType == null ? "" : mimeType).replace("'", "\\'");
        return ""
            + "(function(){"
            + "  try {"
            + "    fetch('" + safeUrl + "')"
            + "      .then(function(r){return r.blob();})"
            + "      .then(function(b){"
            + "        var fr = new FileReader();"
            + "        fr.onloadend = function(){"
            + "          try {"
            + "            var s = fr.result || '';"
            + "            var i = s.indexOf(',');"
            + "            var data = i >= 0 ? s.substring(i+1) : '';"
            + "            ApasNative.saveBase64File(data, '" + safeName + "', '" + safeMime + "');"
            + "          } catch(e) { ApasNative.toast('Save failed: ' + (e && e.message)); }"
            + "        };"
            + "        fr.onerror = function(){ ApasNative.toast('Read failed'); };"
            + "        fr.readAsDataURL(b);"
            + "      })"
            + "      .catch(function(e){ ApasNative.toast('Fetch failed: ' + (e && e.message)); });"
            + "  } catch(e) { ApasNative.toast('Download error: ' + (e && e.message)); }"
            + "})();";
    }

    /** Save a "data:..." URI directly (e.g. canvas.toDataURL PNG export). */
    private void saveDataUri(String dataUri, String filename) {
        int comma = dataUri.indexOf(',');
        if (comma < 0) { toast("بيانات تنزيل غير صالحة"); return; }
        String header = dataUri.substring(5, comma); // after "data:"
        String payload = dataUri.substring(comma + 1);
        String mimeType = header.split(";")[0];
        boolean isBase64 = header.contains(";base64");
        byte[] bytes;
        try {
            if (isBase64) {
                bytes = Base64.decode(payload, Base64.DEFAULT);
            } else {
                bytes = Uri.decode(payload).getBytes("UTF-8");
            }
        } catch (Exception e) {
            toast("فشل فك ترميز الملف");
            return;
        }
        if (filename == null || filename.isEmpty() || filename.equals("downloadfile.bin")) {
            String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
            filename = "APAS_" + System.currentTimeMillis() + (ext != null ? "." + ext : "");
        }
        writeBytesToDownloads(bytes, filename, mimeType);
    }

    /** Write a byte[] to the public Downloads/ folder, then offer to open it. */
    private void writeBytesToDownloads(byte[] bytes, String filename, String mimeType) {
        try {
            Uri savedUri = null;
            File legacyFile = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // MediaStore — no storage permission needed on API 29+.
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                if (mimeType != null && !mimeType.isEmpty()) {
                    v.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                }
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/APAS");
                v.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri target = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                Uri uri = getContentResolver().insert(target, v);
                if (uri == null) { toast("تعذّر إنشاء الملف"); return; }
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new Exception("openOutputStream returned null");
                    out.write(bytes);
                    out.flush();
                }
                v.clear();
                v.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(uri, v, null, null);
                savedUri = uri;
            } else {
                // Legacy path: WRITE_EXTERNAL_STORAGE permission is granted for API ≤ 29.
                File dir = new File(
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                        "APAS");
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, filename);
                try (FileOutputStream fos = new FileOutputStream(f)) {
                    fos.write(bytes);
                    fos.flush();
                }
                legacyFile = f;
                MediaScannerConnection.scanFile(this, new String[]{f.getAbsolutePath()}, null, null);
                savedUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", f);
            }

            toast("تم حفظ: " + filename);
            offerOpen(savedUri, mimeType, legacyFile);
        } catch (Exception e) {
            Log.e(TAG, "writeBytesToDownloads failed", e);
            toast("فشل الحفظ: " + e.getMessage());
        }
    }

    /** Best-effort: pop a chooser to open the freshly saved file. */
    private void offerOpen(Uri uri, String mimeType, File legacyFile) {
        if (uri == null) return;
        try {
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri, (mimeType == null || mimeType.isEmpty()) ? "*/*" : mimeType);
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            Intent chooser = Intent.createChooser(view, "فتح الملف");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(chooser);
        } catch (Exception ignored) {
            // No app to open — the file is still saved in Downloads/APAS.
        }
    }

    private void toast(String msg) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
    }

    /** JavaScript bridge — exposed to the WebView page as window.ApasNative. */
    private class ApasNative {
        @JavascriptInterface
        public void saveBase64File(String base64, String filename, String mimeType) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                String name = (filename == null || filename.isEmpty()) ? "APAS_file" : filename;
                String mt = (mimeType == null || mimeType.isEmpty())
                        ? guessMimeFromName(name) : mimeType;
                writeBytesToDownloads(bytes, name, mt);
            } catch (Exception e) {
                Log.e(TAG, "saveBase64File failed", e);
                toast("فشل الحفظ: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public void toast(String msg) {
            MainActivity.this.toast(msg);
        }
    }

    /**
     * JavaScript shim injected after every page load. Catches <a download> clicks
     * (whether the link is in the DOM or programmatically clicked from JS like
     * jsPDF / Blob exports) and routes the bytes to native saving via ApasNative.
     * Without this, WebView silently drops blob:/data: downloads on Android.
     */
    private static final String DOWNLOAD_SHIM_JS = ""
        + "(function(){"
        + "  if (window.__apasDownloadShim) return; window.__apasDownloadShim = true;"
        + "  function readAndSend(href, name, mime){"
        + "    try {"
        + "      fetch(href).then(function(r){ return r.blob(); }).then(function(b){"
        + "        var fr = new FileReader();"
        + "        fr.onloadend = function(){"
        + "          var s = fr.result || ''; var i = s.indexOf(',');"
        + "          var data = i >= 0 ? s.substring(i+1) : '';"
        + "          var mt = mime || (b && b.type) || '';"
        + "          ApasNative.saveBase64File(data, name || 'APAS_file', mt);"
        + "        };"
        + "        fr.readAsDataURL(b);"
        + "      }).catch(function(e){ ApasNative.toast('Download failed: ' + (e && e.message)); });"
        + "    } catch(e){ ApasNative.toast('Download error: ' + (e && e.message)); }"
        + "  }"
        + "  function intercept(a, ev){"
        + "    if (!a || !a.hasAttribute || !a.hasAttribute('download')) return false;"
        + "    var href = a.getAttribute('href') || a.href; if (!href) return false;"
        + "    if (href.indexOf('blob:') !== 0 && href.indexOf('data:') !== 0) return false;"
        + "    if (ev) { ev.preventDefault(); ev.stopImmediatePropagation && ev.stopImmediatePropagation(); }"
        + "    var name = a.getAttribute('download') || ''; var mt = a.getAttribute('type') || '';"
        + "    readAndSend(href, name, mt); return true;"
        + "  }"
        + "  document.addEventListener('click', function(ev){"
        + "    var t = ev.target; while (t && t !== document) {"
        + "      if (t.tagName === 'A') { intercept(t, ev); return; } t = t.parentNode; } }, true);"
        + "  var origClick = HTMLAnchorElement.prototype.click;"
        + "  HTMLAnchorElement.prototype.click = function(){"
        + "    if (intercept(this, null)) return;"
        + "    return origClick.apply(this, arguments);"
        + "  };"
        + "})();";

    private static String guessMimeFromName(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0) return "application/octet-stream";
        String ext = name.substring(dot + 1).toLowerCase();
        String mt = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return mt != null ? mt : "application/octet-stream";
    }
}
