package com.contentguardian;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class OverlayService extends Service {

    private static final String TAG = "OverlayService";
    private static final String CHANNEL_ID = "content_guardian_overlay";
    private static final String CHANNEL_NAME = "Content Guardian Overlay";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_SHOW_OVERLAY = "com.contentguardian.SHOW_OVERLAY";
    public static final String ACTION_HIDE_OVERLAY = "com.contentguardian.HIDE_OVERLAY";
    public static final String EXTRA_MESSAGE = "overlay_message";

    private WindowManager windowManager;
    private View overlayView;
    private boolean isOverlayShown = false;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, buildNotification());

        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_SHOW_OVERLAY.equals(action)) {
                String message = intent.getStringExtra(EXTRA_MESSAGE);
                if (message == null || message.isEmpty()) {
                    message = "This content has been blocked by ContentGuardian.";
                }
                showOverlay(message);
            } else if (ACTION_HIDE_OVERLAY.equals(action)) {
                hideOverlay();
            }
        }

        return START_STICKY;
    }

    /**
     * Shows a full-screen blocking overlay with the given message.
     */
    public void showOverlay(String message) {
        if (isOverlayShown) {
            hideOverlay();
        }

        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(Color.argb(230, 0, 0, 0));
        layout.setPadding(48, 48, 48, 48);

        TextView titleView = new TextView(this);
        titleView.setText("Content Blocked");
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(28);
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0, 0, 0, 32);

        TextView messageView = new TextView(this);
        messageView.setText(message);
        messageView.setTextColor(Color.LTGRAY);
        messageView.setTextSize(16);
        messageView.setGravity(Gravity.CENTER);

        layout.addView(titleView);
        layout.addView(messageView);

        overlayView = layout;

        try {
            windowManager.addView(overlayView, params);
            isOverlayShown = true;
            Log.d(TAG, "Overlay shown");
        } catch (Exception e) {
            Log.e(TAG, "Error showing overlay", e);
        }
    }

    /**
     * Hides the blocking overlay if it is currently shown.
     */
    public void hideOverlay() {
        if (overlayView != null && isOverlayShown) {
            try {
                windowManager.removeView(overlayView);
                isOverlayShown = false;
                overlayView = null;
                Log.d(TAG, "Overlay hidden");
            } catch (Exception e) {
                Log.e(TAG, "Error hiding overlay", e);
            }
        }
    }

    /**
     * Creates the notification channel required for Android O and above.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("ContentGuardian overlay service notification");
            channel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Builds the foreground service notification.
     */
    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("ContentGuardian")
                .setContentText("Content monitoring is active")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build();
    }

    @Override
    public void onDestroy() {
        hideOverlay();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
