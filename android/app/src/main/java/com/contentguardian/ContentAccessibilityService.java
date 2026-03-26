package com.contentguardian;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class ContentAccessibilityService extends AccessibilityService {

    private static final String TAG = "ContentAccessibility";
    private static final String EVENT_NAME = "onScreenContentCaptured";

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Accessibility service connected");

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
                | AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
        info.notificationTimeout = 100;
        setServiceInfo(info);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) {
            return;
        }

        int eventType = event.getEventType();
        if (eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                && eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            return;
        }

        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) {
            return;
        }

        String packageName = getActivePackageName(event);
        StringBuilder textBuilder = new StringBuilder();
        extractTextFromNode(rootNode, textBuilder);
        rootNode.recycle();

        String extractedText = textBuilder.toString().trim();
        if (extractedText.isEmpty()) {
            return;
        }

        sendEventToReactNative(packageName, extractedText, eventType);
    }

    /**
     * Recursively extracts text content from the AccessibilityNodeInfo tree.
     */
    private void extractTextFromNode(AccessibilityNodeInfo node, StringBuilder textBuilder) {
        if (node == null) {
            return;
        }

        CharSequence text = node.getText();
        if (text != null && text.length() > 0) {
            textBuilder.append(text.toString()).append(" ");
        }

        CharSequence contentDescription = node.getContentDescription();
        if (contentDescription != null && contentDescription.length() > 0) {
            textBuilder.append(contentDescription.toString()).append(" ");
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                extractTextFromNode(child, textBuilder);
                child.recycle();
            }
        }
    }

    /**
     * Gets the package name of the currently active (foreground) app.
     */
    private String getActivePackageName(AccessibilityEvent event) {
        CharSequence packageName = event.getPackageName();
        if (packageName != null) {
            return packageName.toString();
        }
        return "unknown";
    }

    /**
     * Sends the extracted screen content to React Native via the event emitter.
     */
    private void sendEventToReactNative(String packageName, String text, int eventType) {
        try {
            ReactApplication reactApplication = (ReactApplication) getApplication();
            ReactInstanceManager reactInstanceManager = reactApplication
                    .getReactNativeHost()
                    .getReactInstanceManager();
            ReactContext reactContext = reactInstanceManager.getCurrentReactContext();

            if (reactContext == null) {
                Log.w(TAG, "ReactContext is null, cannot send event");
                return;
            }

            WritableMap params = Arguments.createMap();
            params.putString("packageName", packageName);
            params.putString("text", text);
            params.putString("eventType",
                    eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                            ? "windowStateChanged"
                            : "windowContentChanged");
            params.putDouble("timestamp", System.currentTimeMillis());

            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(EVENT_NAME, params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event to React Native", e);
        }
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
    }
}
