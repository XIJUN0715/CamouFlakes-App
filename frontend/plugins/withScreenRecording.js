// plugins/withScreenRecording.js - Capsule with stop icon + divider (updated padding)
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

console.log('[ScreenRecording Plugin] Plugin file loaded');

// ============= 1. UPDATE ANDROID MANIFEST =============
const withAndroidManifestMod = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    const permissions = [
      'android.permission.MEDIA_PROJECTION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.INTERNET',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ];

    permissions.forEach(perm => {
      const exists = manifest.manifest['uses-permission']?.some(
        p => p.$ && p.$['android:name'] === perm
      );
      if (!exists) {
        if (!manifest.manifest['uses-permission']) {
          manifest.manifest['uses-permission'] = [];
        }
        manifest.manifest['uses-permission'].push({
          $: { 'android:name': perm }
        });
        console.log('[ScreenRecording Plugin] Added permission: ' + perm);
      }
    });

    if (!manifest.manifest.application || manifest.manifest.application.length === 0) {
      manifest.manifest.application = [{}];
    }
    const app = manifest.manifest.application[0];
    if (!app.service) {
      app.service = [];
    }

    const serviceExists = app.service.some(
      s => s.$ && s.$['android:name'] === '.ScreenRecordingService'
    );
    if (!serviceExists) {
      app.service.push({
        $: {
          'android:name': '.ScreenRecordingService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'mediaProjection'
        }
      });
      console.log('[ScreenRecording Plugin] ScreenRecordingService added to manifest');
    }

    const overlayExists = app.service.some(
      s => s.$ && s.$['android:name'] === '.FloatingOverlayService'
    );
    if (!overlayExists) {
      app.service.push({
        $: {
          'android:name': '.FloatingOverlayService',
          'android:enabled': 'true',
          'android:exported': 'false'
        }
      });
      console.log('[ScreenRecording Plugin] FloatingOverlayService added to manifest');
    }

    console.log('[ScreenRecording Plugin] AndroidManifest.xml updated');
    return config;
  });
};

// ============= 2. UPDATE MAINAPPLICATION.KT =============
const withMainApplicationMod = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const mainAppPath = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', 'com', 'camouflakes', 'app', 'MainApplication.kt'
      );

      console.log('[ScreenRecording Plugin] Modifying MainApplication.kt at: ' + mainAppPath);

      let content = fs.readFileSync(mainAppPath, 'utf8');

      if (content.includes('ScreenRecorderPackage')) {
        console.log('[ScreenRecording Plugin] ScreenRecorderPackage already registered');
        return config;
      }

      const importStatement = 'import com.camouflakes.app.ScreenRecorderPackage';
      if (!content.includes(importStatement)) {
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        if (lastImportIndex >= 0) {
          lines.splice(lastImportIndex + 1, 0, importStatement);
          content = lines.join('\n');
          console.log('[ScreenRecording Plugin] Import added');
        }
      }

      const getPackagesRegex = /override fun getPackages\(\): List<ReactPackage> =[\s\S]*?PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?\}/m;

      const correctedBlock = `override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(ScreenRecorderPackage())
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }`;

      if (content.match(getPackagesRegex)) {
        content = content.replace(getPackagesRegex, correctedBlock);
        console.log('[ScreenRecording Plugin] getPackages block replaced');
      } else {
        const startMarker = 'override fun getPackages(): List<ReactPackage> =';
        const startIndex = content.indexOf(startMarker);
        if (startIndex !== -1) {
          let braceCount = 0;
          let endIndex = startIndex;
          let foundStart = false;
          for (let i = startIndex; i < content.length; i++) {
            if (content[i] === '{') { braceCount++; foundStart = true; }
            if (content[i] === '}') {
              braceCount--;
              if (foundStart && braceCount === 0) {
                endIndex = i;
                break;
              }
            }
          }
          const before = content.substring(0, startIndex);
          const after = content.substring(endIndex + 1);
          content = before + correctedBlock + after;
          console.log('[ScreenRecording Plugin] getPackages block replaced (alternative)');
        }
      }

      fs.writeFileSync(mainAppPath, content);
      console.log('[ScreenRecording Plugin] MainApplication.kt updated');
      return config;
    }
  ]);
};

// ============= 3. CREATE ALL NATIVE FILES =============
const withScreenRecordingFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidPath = config.modRequest.platformProjectRoot;
      const pkgDir = path.join(androidPath, 'app', 'src', 'main', 'java', 'com', 'camouflakes', 'app');
      const resLayoutDir = path.join(androidPath, 'app', 'src', 'main', 'res', 'layout');
      const resDrawableDir = path.join(androidPath, 'app', 'src', 'main', 'res', 'drawable');

      console.log('[ScreenRecording Plugin] Creating native files in: ' + pkgDir);

      if (!fs.existsSync(pkgDir)) {
        fs.mkdirSync(pkgDir, { recursive: true });
        console.log('[ScreenRecording Plugin] Created package directory');
      }
      if (!fs.existsSync(resLayoutDir)) {
        fs.mkdirSync(resLayoutDir, { recursive: true });
        console.log('[ScreenRecording Plugin] Created res/layout directory');
      }
      if (!fs.existsSync(resDrawableDir)) {
        fs.mkdirSync(resDrawableDir, { recursive: true });
        console.log('[ScreenRecording Plugin] Created res/drawable directory');
      }

      // -------- RecordingConstants.java (unchanged) --------
      const constantsContent = `package com.camouflakes.app;

final class RecordingConstants {
    static final long MIN_RECORDING_MS = 3000L;
    static final long MAX_RECORDING_MS = 30000L;

    private RecordingConstants() {}
}`;
      fs.writeFileSync(path.join(pkgDir, 'RecordingConstants.java'), constantsContent);
      console.log('[ScreenRecording Plugin] RecordingConstants.java created');

      // -------- floating_overlay.xml - UPDATED LAYOUT --------
      // Increased top/bottom padding to 8dp (fatter), reduced left/right padding.
      const overlayLayout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:background="@drawable/overlay_background"
    android:paddingStart="8dp"
    android:paddingEnd="6dp"
    android:paddingTop="8dp"
    android:paddingBottom="8dp"
    android:gravity="center_vertical">

    <TextView
        android:id="@+id/timerText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="00:00"
        android:textColor="#FFFFFF"
        android:textSize="14sp"
        android:textStyle="bold"
        android:layout_marginEnd="8dp"
        android:includeFontPadding="false" />

    <View
        android:layout_width="1dp"
        android:layout_height="18dp"
        android:background="#55FFFFFF"
        android:layout_marginEnd="8dp" />

    <View
        android:id="@+id/stopButton"
        android:layout_width="20dp"
        android:layout_height="20dp"
        android:background="@drawable/stop_button_background" />

</LinearLayout>`;
      fs.writeFileSync(path.join(resLayoutDir, 'floating_overlay.xml'), overlayLayout);
      console.log('[ScreenRecording Plugin] floating_overlay.xml created (fatter, less horizontal padding)');

      // -------- overlay_background.xml (unchanged) --------
      const overlayBg = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="#DD000000" />
    <corners android:radius="24dp" />
    <stroke android:width="2dp" android:color="#FF6B00" />
</shape>`;
      fs.writeFileSync(path.join(resDrawableDir, 'overlay_background.xml'), overlayBg);
      console.log('[ScreenRecording Plugin] overlay_background.xml created');

      // -------- stop_button_background.xml (unchanged) --------
      const stopBtnBg = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape android:shape="oval">
            <solid android:color="#FF3B30" />
        </shape>
    </item>
    <item android:width="8dp" android:height="8dp" android:gravity="center">
        <shape android:shape="rectangle">
            <solid android:color="#FFFFFF" />
            <corners android:radius="1dp" />
        </shape>
    </item>
</layer-list>`;
      fs.writeFileSync(path.join(resDrawableDir, 'stop_button_background.xml'), stopBtnBg);
      console.log('[ScreenRecording Plugin] stop_button_background.xml created');

      // -------- ScreenRecorderModule.java (unchanged) --------
      const moduleContent = `package com.camouflakes.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.WindowManager;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class ScreenRecorderModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "ScreenRecorderModule";
    private static final String TAG = "ScreenRecorderModule";
    private static final int REQUEST_CODE = 1001;

    private static final long MAX_RECORDING_GRACE_MS = 5000L;

    private static volatile ScreenRecorderModule activeInstance;

    public static void requestStop() {
        ScreenRecorderModule instance = activeInstance;
        if (instance != null) {
            instance.mainHandler.post(() -> instance.stopRecordingInternal(true));
        } else {
            Log.w(TAG, "requestStop() called but no active instance");
        }
    }

    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private MediaRecorder mediaRecorder;
    private boolean isRecording = false;
    private boolean isScreenSharing = false;
    private String videoFilePath = null;
    private int screenDensity;
    private int screenWidth;
    private int screenHeight;
    private ReactApplicationContext reactContext;
    private Promise pendingPromise;
    private MediaProjection.Callback projectionCallback;
    private boolean isServiceStarted = false;
    private boolean isMediaRecorderPrepared = false;
    private BroadcastReceiver stopBroadcastReceiver;
    private boolean hasPendingStopResult = false;
    private String pendingVideoPath = null;
    private boolean isStopping = false;
    private boolean stopPending = false;
    private long recordingStartTimeMs = 0L;
    private Runnable maxDurationBackupRunnable;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == REQUEST_CODE) {
                Log.d(TAG, "Activity result received: " + resultCode);
                if (resultCode == Activity.RESULT_OK && data != null) {
                    try {
                        startForegroundService();
                        MediaProjectionManager projectionManager = (MediaProjectionManager) reactContext
                                .getSystemService(Context.MEDIA_PROJECTION_SERVICE);
                        mediaProjection = projectionManager.getMediaProjection(resultCode, data);
                        projectionCallback = new MediaProjection.Callback() {
                            @Override
                            public void onStop() {
                                Log.d(TAG, "MediaProjection stopped externally");
                                mainHandler.post(() -> stopRecordingInternal(true));
                            }
                        };
                        mediaProjection.registerCallback(projectionCallback, new Handler(Looper.getMainLooper()));
                        setupMediaRecorder();
                        createVirtualDisplay();
                        isScreenSharing = true;
                        isMediaRecorderPrepared = true;
                        Log.d(TAG, "Screen sharing prepared");
                        if (pendingPromise != null) {
                            pendingPromise.resolve("Screen sharing started");
                            pendingPromise = null;
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Setup error: " + e.getMessage(), e);
                        if (pendingPromise != null) {
                            pendingPromise.reject("ERROR", "Setup failed: " + e.getMessage());
                            pendingPromise = null;
                        }
                    }
                } else {
                    Log.e(TAG, "Permission denied");
                    if (pendingPromise != null) {
                        pendingPromise.reject("PERMISSION_DENIED", "Permission denied");
                        pendingPromise = null;
                    }
                }
            }
        }
    };

    public ScreenRecorderModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.reactContext.addActivityEventListener(activityEventListener);
        registerStopBroadcastReceiver();
        activeInstance = this;
        Log.d(TAG, "ScreenRecorderModule initialized");
    }

    @Override
    public String getName() { return MODULE_NAME; }

    private void registerStopBroadcastReceiver() {
        stopBroadcastReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (FloatingOverlayService.STOP_BROADCAST_ACTION.equals(intent.getAction())) {
                    Log.d(TAG, "Stop broadcast received");
                    mainHandler.post(() -> stopRecordingInternal(true));
                }
            }
        };
        IntentFilter filter = new IntentFilter(FloatingOverlayService.STOP_BROADCAST_ACTION);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(stopBroadcastReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                reactContext.registerReceiver(stopBroadcastReceiver, filter);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to register stop receiver: " + e.getMessage());
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (activeInstance == this) {
            activeInstance = null;
        }
        try {
            reactContext.removeActivityEventListener(activityEventListener);
        } catch (Exception ignored) {}
        try {
            if (stopBroadcastReceiver != null) {
                reactContext.unregisterReceiver(stopBroadcastReceiver);
                stopBroadcastReceiver = null;
            }
        } catch (Exception ignored) {}
        releaseResourcesInternal(false);
        Log.d(TAG, "Module destroyed, resources released");
    }

    private void stopRecordingInternal(boolean emitEvent) {
        if (isStopping) {
            Log.d(TAG, "Already stopping, ignoring duplicate");
            return;
        }

        if (isRecording) {
            long elapsed = System.currentTimeMillis() - recordingStartTimeMs;
            if (elapsed < RecordingConstants.MIN_RECORDING_MS) {
                if (!stopPending) {
                    stopPending = true;
                    long remaining = RecordingConstants.MIN_RECORDING_MS - elapsed;
                    Log.d(TAG, "Deferring stop by " + remaining + "ms (min duration not reached)");
                    mainHandler.postDelayed(() -> {
                        stopPending = false;
                        stopRecordingInternal(emitEvent);
                    }, remaining);
                }
                return;
            }
        }

        isStopping = true;
        Log.d(TAG, "Stopping recording (unified)");

        boolean stopSucceeded = true;
        try {
            if (mediaRecorder != null && isRecording) {
                try {
                    mediaRecorder.stop();
                    Log.d(TAG, "MediaRecorder stopped");
                } catch (Exception e) {
                    Log.e(TAG, "MediaRecorder.stop() failed: " + e.getMessage(), e);
                    stopSucceeded = false;
                }
                try {
                    mediaRecorder.reset();
                } catch (Exception ignored) {}
                isRecording = false;
            }

            releaseResourcesInternal(true);

            String finishedPath = videoFilePath;
            File outFile = finishedPath != null ? new File(finishedPath) : null;
            boolean fileOk = stopSucceeded && outFile != null && outFile.exists() && outFile.length() > 1024;

            if (fileOk) {
                pendingVideoPath = finishedPath;
                hasPendingStopResult = true;
            } else {
                if (outFile != null && outFile.exists()) {
                    outFile.delete();
                }
                pendingVideoPath = null;
                hasPendingStopResult = false;
                Log.w(TAG, "Recording did not produce a valid file (stopSucceeded=" + stopSucceeded + ")");
            }

            bringAppToForeground();

            if (emitEvent) {
                sendRecordingStoppedEvent();
            }

            stopFloatingOverlay();

        } catch (Exception e) {
            Log.e(TAG, "Error during stop: " + e.getMessage(), e);
        } finally {
            isStopping = false;
        }
    }

    private void bringAppToForeground() {
        try {
            Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.runOnUiThread(() -> {
                    try {
                        Intent intent = activity.getIntent();
                        if (intent == null) {
                            intent = reactContext.getPackageManager().getLaunchIntentForPackage(reactContext.getPackageName());
                        }
                        if (intent != null) {
                            intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                            activity.startActivity(intent);
                            Log.d(TAG, "App brought to foreground using existing activity");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "runOnUiThread bring-to-front failed: " + e.getMessage());
                    }
                });
            } else {
                Intent launchIntent = reactContext.getPackageManager()
                        .getLaunchIntentForPackage(reactContext.getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                    reactContext.startActivity(launchIntent);
                    Log.d(TAG, "App brought to foreground via launch intent (NEW_TASK)");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error bringing app to foreground: " + e.getMessage());
        }
    }

    private void sendRecordingStoppedEvent() {
        try {
            WritableMap params = Arguments.createMap();
            if (pendingVideoPath != null) {
                params.putString("filePath", pendingVideoPath);
                params.putBoolean("success", true);
            } else {
                params.putBoolean("success", false);
            }
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onRecordingStopped", params);
            Log.d(TAG, "onRecordingStoppedEvent sent");
        } catch (Exception e) {
            Log.e(TAG, "Failed to send event: " + e.getMessage());
        }
    }

    @ReactMethod
    public void checkPendingRecording(Promise promise) {
        WritableMap result = Arguments.createMap();
        result.putBoolean("hasPending", hasPendingStopResult);
        result.putString("filePath", pendingVideoPath != null ? pendingVideoPath : "");
        promise.resolve(result);
    }

    @ReactMethod
    public void clearPendingRecording(Promise promise) {
        hasPendingStopResult = false;
        pendingVideoPath = null;
        promise.resolve(true);
    }

    @ReactMethod
    public void startForegroundService(Promise promise) {
        startForegroundService();
        promise.resolve("Foreground service started");
    }

    @ReactMethod
    public void startRecording(Promise promise) {
        try {
            pendingPromise = promise;
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "No current activity");
                return;
            }
            WindowManager wm = (WindowManager) reactContext.getSystemService(Context.WINDOW_SERVICE);
            DisplayMetrics metrics = new DisplayMetrics();
            wm.getDefaultDisplay().getMetrics(metrics);
            screenDensity = metrics.densityDpi;
            screenWidth = metrics.widthPixels;
            screenHeight = metrics.heightPixels;
            MediaProjectionManager pm = (MediaProjectionManager) reactContext.getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            Intent permissionIntent = pm.createScreenCaptureIntent();
            currentActivity.startActivityForResult(permissionIntent, REQUEST_CODE);
            Log.d(TAG, "Permission requested");
        } catch (Exception e) {
            Log.e(TAG, "Error: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startScreenRecording(Promise promise) {
        try {
            if (mediaRecorder == null) { promise.reject("RECORDER_ERROR", "MediaRecorder not initialized"); return; }
            if (!isMediaRecorderPrepared) { promise.reject("RECORDER_ERROR", "MediaRecorder not prepared"); return; }
            mediaRecorder.start();
            isRecording = true;
            recordingStartTimeMs = System.currentTimeMillis();
            stopPending = false;

            maxDurationBackupRunnable = () -> {
                Log.w(TAG, "Backup max-duration timer fired, forcing stop");
                stopRecordingInternal(true);
            };
            mainHandler.postDelayed(maxDurationBackupRunnable, RecordingConstants.MAX_RECORDING_MS + MAX_RECORDING_GRACE_MS);

            startFloatingOverlay();
            Log.d(TAG, "Recording started");
            promise.resolve("Recording started");
        } catch (Exception e) {
            Log.e(TAG, "Error starting: " + e.getMessage(), e);
            isRecording = false;
            promise.reject("ERROR", "Failed to start: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopScreenRecording(Promise promise) {
        stopRecordingInternal(true);
        promise.resolve("Stopping");
    }

    @ReactMethod
    public void stopScreenSharing(Promise promise) {
        stopRecordingInternal(true);
        promise.resolve(true);
    }

    @ReactMethod
    public void getRecordingPath(Promise promise) {
        promise.resolve(videoFilePath);
    }

    @ReactMethod
    public void isRecordingActive(Promise promise) {
        promise.resolve(isRecording);
    }

    @ReactMethod
    public void isScreenSharingActive(Promise promise) {
        promise.resolve(isScreenSharing);
    }

    @ReactMethod
    public void releaseResources(Promise promise) {
        releaseResourcesInternal(false);
        promise.resolve(true);
    }

    private void startForegroundService() {
        try {
            if (!isServiceStarted) {
                Intent intent = new Intent(reactContext, ScreenRecordingService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    reactContext.startForegroundService(intent);
                else
                    reactContext.startService(intent);
                isServiceStarted = true;
                Log.d(TAG, "Foreground service started");
            }
        } catch (Exception e) { Log.e(TAG, "Error starting service: " + e.getMessage()); }
    }

    private void stopForegroundService() {
        try {
            if (isServiceStarted) {
                reactContext.stopService(new Intent(reactContext, ScreenRecordingService.class));
                isServiceStarted = false;
                Log.d(TAG, "Foreground service stopped");
            }
        } catch (Exception e) { Log.e(TAG, "Error stopping service: " + e.getMessage()); }
    }

    private void startFloatingOverlay() {
        try {
            Intent intent = new Intent(reactContext, FloatingOverlayService.class);
            intent.setAction(FloatingOverlayService.ACTION_START);
            reactContext.startService(intent);
            Log.d(TAG, "Floating overlay started");
        } catch (Exception e) { Log.e(TAG, "Error starting overlay: " + e.getMessage()); }
    }

    private void stopFloatingOverlay() {
        try {
            reactContext.stopService(new Intent(reactContext, FloatingOverlayService.class));
            Log.d(TAG, "Floating overlay stopped");
        } catch (Exception e) { Log.e(TAG, "Error stopping overlay: " + e.getMessage()); }
    }

    private void releaseResourcesInternal(boolean keepOverlay) {
        try {
            if (maxDurationBackupRunnable != null) {
                mainHandler.removeCallbacks(maxDurationBackupRunnable);
                maxDurationBackupRunnable = null;
            }
            if (mediaRecorder != null) {
                if (isRecording) {
                    try { mediaRecorder.stop(); } catch (Exception e) { Log.e(TAG, "stop() in release failed: " + e.getMessage()); }
                }
                try { mediaRecorder.release(); } catch (Exception e) { Log.e(TAG, "release() failed: " + e.getMessage()); }
                mediaRecorder = null;
            }
            if (virtualDisplay != null) {
                virtualDisplay.release();
                virtualDisplay = null;
            }
            if (mediaProjection != null) {
                if (projectionCallback != null) {
                    try { mediaProjection.unregisterCallback(projectionCallback); } catch (Exception ignored) {}
                    projectionCallback = null;
                }
                mediaProjection.stop();
                mediaProjection = null;
            }
            stopForegroundService();
            if (!keepOverlay) {
                stopFloatingOverlay();
            }
            isRecording = false;
            isScreenSharing = false;
            isMediaRecorderPrepared = false;
            Log.d(TAG, "Resources released (keepOverlay=" + keepOverlay + ")");
        } catch (Exception e) {
            Log.e(TAG, "Release error: " + e.getMessage());
        }
    }

    private void setupMediaRecorder() throws IOException {
        String ts = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        File videoDir = new File(reactContext.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "CamouFlakes");
        if (!videoDir.exists()) videoDir.mkdirs();
        videoFilePath = videoDir.getAbsolutePath() + "/screen_" + ts + ".mp4";
        if (mediaRecorder != null) mediaRecorder.release();
        mediaRecorder = new MediaRecorder();
        mediaRecorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
        mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
        mediaRecorder.setOutputFile(videoFilePath);
        mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
        mediaRecorder.setVideoSize(screenWidth, screenHeight);
        mediaRecorder.setVideoFrameRate(30);
        mediaRecorder.setVideoEncodingBitRate(5000000);
        mediaRecorder.prepare();
        Log.d(TAG, "MediaRecorder ready: " + videoFilePath);
    }

    private void createVirtualDisplay() {
        if (mediaProjection == null) { Log.e(TAG, "mediaProjection null"); return; }
        virtualDisplay = mediaProjection.createVirtualDisplay(
            "ScreenRecording", screenWidth, screenHeight, screenDensity,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            mediaRecorder.getSurface(), null, null
        );
        Log.d(TAG, "VirtualDisplay created");
    }
}`;

      fs.writeFileSync(path.join(pkgDir, 'ScreenRecorderModule.java'), moduleContent);
      console.log('[ScreenRecording Plugin] ScreenRecorderModule.java created');

      // -------- ScreenRecorderPackage.java (unchanged) --------
      const packageContent = `package com.camouflakes.app;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ScreenRecorderPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new ScreenRecorderModule(reactContext));
        return modules;
    }
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}`;
      fs.writeFileSync(path.join(pkgDir, 'ScreenRecorderPackage.java'), packageContent);
      console.log('[ScreenRecording Plugin] ScreenRecorderPackage.java created');

      // -------- ScreenRecordingService.java (unchanged) --------
      const serviceContent = `package com.camouflakes.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class ScreenRecordingService extends Service {
    private static final String CHANNEL_ID = "screen_recording_channel";
    private static final int NOTIFICATION_ID = 1001;
    public static final String STOP_ACTION = "com.camouflakes.app.STOP_RECORDING";
    private BroadcastReceiver stopReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        registerStopReceiver();
        startForeground(NOTIFICATION_ID, createNotification());
        Log.d("ScreenRecordingService", "Service created with stop action");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void registerStopReceiver() {
        stopReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (STOP_ACTION.equals(intent.getAction())) {
                    Log.d("ScreenRecordingService", "Stop action received");
                    ScreenRecorderModule.requestStop();
                    sendBroadcast(new Intent(FloatingOverlayService.STOP_BROADCAST_ACTION));
                    stopSelf();
                }
            }
        };
        IntentFilter filter = new IntentFilter(STOP_ACTION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stopReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(stopReceiver, filter);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Screen Recording", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Required for screen recording");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        Intent stopIntent = new Intent(STOP_ACTION);
        PendingIntent stopPending = PendingIntent.getBroadcast(this, 0, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent openApp = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openPending = null;
        if (openApp != null) {
            openPending = PendingIntent.getActivity(this, 0, openApp,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("CamouFlakes")
            .setContentText("Screen recording is active")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .addAction(new NotificationCompat.Action.Builder(
                android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPending).build());
        if (openPending != null) {
            builder.setContentIntent(openPending);
        }
        return builder.build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (stopReceiver != null) { unregisterReceiver(stopReceiver); stopReceiver = null; }
        Log.d("ScreenRecordingService", "Service destroyed");
    }
}`;
      fs.writeFileSync(path.join(pkgDir, 'ScreenRecordingService.java'), serviceContent);
      console.log('[ScreenRecording Plugin] ScreenRecordingService.java created');

      // -------- FloatingOverlayService.java (unchanged) --------
      const overlayServiceContent = `package com.camouflakes.app;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

public class FloatingOverlayService extends Service {
    private static final String TAG = "FloatingOverlayService";

    public static final String ACTION_START = "START_RECORDING";
    public static final String STOP_BROADCAST_ACTION = "com.camouflakes.app.STOP_RECORDING_BROADCAST";

    private WindowManager windowManager;
    private View overlayView;
    private TextView timerText;
    private View stopButton;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable timerRunnable;
    private Runnable maxDurationRunnable;
    private long startTime;
    private boolean timerRunning = false;
    private boolean stopButtonTapped = false;
    private boolean stopBroadcastSent = false;
    private boolean overlayAdded = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate");
        createOverlay();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_START.equals(intent.getAction())) {
            startTimer();
        }
        return START_NOT_STICKY;
    }

    private void createOverlay() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        LayoutInflater inflater = (LayoutInflater) getSystemService(LAYOUT_INFLATER_SERVICE);
        overlayView = inflater.inflate(R.layout.floating_overlay, null);
        timerText = overlayView.findViewById(R.id.timerText);
        stopButton = overlayView.findViewById(R.id.stopButton);

        stopButton.setOnClickListener(v -> {
            Log.d(TAG, "Stop button clicked");
            requestStop();
        });

        overlayView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private boolean isDragging = false;
            private boolean hasMoved = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (overlayView.getLayoutParams() == null) return false;
                WindowManager.LayoutParams params = (WindowManager.LayoutParams) overlayView.getLayoutParams();

                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        if (isTouchOnView(stopButton, event)) {
                            return false; // let the stop icon handle its own click
                        }
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        isDragging = false;
                        hasMoved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = event.getRawX() - initialTouchX;
                        float dy = event.getRawY() - initialTouchY;
                        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                            isDragging = true;
                            hasMoved = true;
                        }
                        if (isDragging && overlayAdded) {
                            params.x = initialX + (int) dx;
                            params.y = initialY + (int) dy;
                            try {
                                windowManager.updateViewLayout(overlayView, params);
                            } catch (Exception e) {
                                Log.w(TAG, "updateViewLayout failed: " + e.getMessage());
                            }
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!hasMoved) {
                            bringAppToForeground();
                        }
                        return true;
                    case MotionEvent.ACTION_CANCEL:
                        return true;
                    default:
                        return false;
                }
            }
        });

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 100;

        try {
            windowManager.addView(overlayView, params);
            overlayAdded = true;
            Log.d(TAG, "Overlay added");
        } catch (Exception e) {
            Log.e(TAG, "Failed to add overlay: " + e.getMessage());
            stopSelf();
        }
    }

    private boolean isTouchOnView(View view, MotionEvent event) {
        if (view == null || view.getVisibility() != View.VISIBLE) return false;
        int[] loc = new int[2];
        view.getLocationOnScreen(loc);
        float x = event.getRawX();
        float y = event.getRawY();
        return x >= loc[0] && x <= loc[0] + view.getWidth()
                && y >= loc[1] && y <= loc[1] + view.getHeight();
    }

    private void bringAppToForeground() {
        try {
            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(launchIntent);
                Log.d(TAG, "App brought to foreground via overlay tap");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error bringing app to foreground: " + e.getMessage());
        }
    }

    private void startTimer() {
        startTime = System.currentTimeMillis();
        timerRunning = true;
        stopButtonTapped = false;
        stopBroadcastSent = false;
        if (stopButton != null) stopButton.setEnabled(true);
        if (timerText != null) timerText.setText("00:00");

        timerRunnable = new Runnable() {
            @Override
            public void run() {
                if (!timerRunning) return;
                long elapsed = System.currentTimeMillis() - startTime;
                long sec = elapsed / 1000;
                long min = sec / 60;
                sec = sec % 60;
                if (timerText != null) timerText.setText(String.format("%02d:%02d", min, sec));
                handler.postDelayed(this, 500);
            }
        };
        handler.post(timerRunnable);

        maxDurationRunnable = () -> {
            Log.d(TAG, "Max duration reached, auto-stopping");
            requestStop();
        };
        handler.postDelayed(maxDurationRunnable, RecordingConstants.MAX_RECORDING_MS);
    }

    private void requestStop() {
        if (stopButtonTapped) {
            Log.d(TAG, "Stop already requested, ignoring extra tap");
            return;
        }
        stopButtonTapped = true;
        long elapsed = System.currentTimeMillis() - startTime;
        if (elapsed < RecordingConstants.MIN_RECORDING_MS) {
            long remaining = RecordingConstants.MIN_RECORDING_MS - elapsed;
            Log.d(TAG, "Stop tapped early, deferring " + remaining + "ms");
            if (stopButton != null) stopButton.setEnabled(false);
            if (timerText != null) timerText.setText("Hold on");
            handler.postDelayed(this::doStop, remaining);
        } else {
            doStop();
        }
    }

    private void doStop() {
        if (stopBroadcastSent) return;
        stopBroadcastSent = true;
        stopTimer();
        if (stopButton != null) stopButton.setEnabled(false);
        if (timerText != null) timerText.setText("Stopping");
        Log.d(TAG, "Stopping - direct call plus broadcast fallback");
        ScreenRecorderModule.requestStop();
        sendBroadcast(new Intent(STOP_BROADCAST_ACTION));
    }

    private void stopTimer() {
        timerRunning = false;
        if (timerRunnable != null) handler.removeCallbacks(timerRunnable);
        if (maxDurationRunnable != null) handler.removeCallbacks(maxDurationRunnable);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopTimer();
        handler.removeCallbacksAndMessages(null);
        if (overlayView != null && windowManager != null && overlayAdded) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                Log.w(TAG, "removeView failed: " + e.getMessage());
            }
            overlayAdded = false;
        }
        overlayView = null;
        Log.d(TAG, "onDestroy");
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}`;
      fs.writeFileSync(path.join(pkgDir, 'FloatingOverlayService.java'), overlayServiceContent);
      console.log('[ScreenRecording Plugin] FloatingOverlayService.java created');

      return config;
    }
  ]);
};

// ============= 4. FIX AUTOLINKING FILE =============
const fixAutolinkingFile = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const autolinkingPath = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'build', 'generated', 'autolinking', 'src', 'main', 'java',
        'com', 'facebook', 'react', 'ReactNativeApplicationEntryPoint.java'
      );
      let attempts = 0;
      while (attempts < 10) {
        if (fs.existsSync(autolinkingPath)) {
          let content = fs.readFileSync(autolinkingPath, 'utf8');
          const updated = content.replace(/com\.camouflakes\.BuildConfig/g, 'com.camouflakes.app.BuildConfig');
          if (content !== updated) {
            fs.writeFileSync(autolinkingPath, updated);
            console.log('[ScreenRecording Plugin] Fixed autolinking file');
          }
          break;
        }
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      return config;
    }
  ]);
};

// ============= 5. GRADLE PATCH =============
const withGradlePatch = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const gradlePath = path.join(config.modRequest.platformProjectRoot, 'app', 'build.gradle');
      let content = fs.readFileSync(gradlePath, 'utf8');
      if (content.includes('patchAutolinkingFile')) {
        console.log('[ScreenRecording Plugin] Gradle patch already applied');
        return config;
      }
      const patch = `
// Force patch autolinking file before compilation
tasks.whenTaskAdded { task ->
    if (task.name == 'compileDebugJavaWithJavac' || task.name == 'compileReleaseJavaWithJavac') {
        task.doFirst {
            def autolinkingFile = file('build/generated/autolinking/src/main/java/com/facebook/react/ReactNativeApplicationEntryPoint.java')
            if (autolinkingFile.exists()) {
                def content = autolinkingFile.text
                def updatedContent = content.replaceAll('com\\\\.camouflakes\\\\.BuildConfig', 'com.camouflakes.app.BuildConfig')
                if (content != updatedContent) {
                    autolinkingFile.write(updatedContent)
                    println "[ScreenRecording Plugin] Patched autolinking file via gradle"
                }
            }
        }
    }
}
`;
      content += patch;
      fs.writeFileSync(gradlePath, content);
      console.log('[ScreenRecording Plugin] Gradle patch added');
      return config;
    }
  ]);
};

// ============= EXPORT =============
module.exports = (config) => {
  console.log('[ScreenRecording Plugin] Running plugin...');
  config = withMainApplicationMod(config);
  config = withAndroidManifestMod(config);
  config = withScreenRecordingFiles(config);
  config = fixAutolinkingFile(config);
  config = withGradlePatch(config);
  console.log('[ScreenRecording Plugin] Plugin completed successfully');
  return config;
};