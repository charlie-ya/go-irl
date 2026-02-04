package com.goirl.app;

import com.getcapacitor.BridgeActivity;

import android.os.Bundle;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(GoogleAuth.class);

        // Expose AndroidPolicy to JavaScript
        this.getBridge().getWebView().addJavascriptInterface(new AndroidPolicy(), "AndroidPolicy");
    }

    public class AndroidPolicy {
        @android.webkit.JavascriptInterface
        public boolean isMockLocation() {
            // Get the last known location from the LocationManager to check reliability
            android.location.LocationManager lm = (android.location.LocationManager) getSystemService(
                    android.content.Context.LOCATION_SERVICE);
            try {
                // Check GPS provider
                android.location.Location gpsLoc = lm
                        .getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER);
                if (gpsLoc != null && gpsLoc.isFromMockProvider()) {
                    return true;
                }

                // Check Network provider
                android.location.Location netLoc = lm
                        .getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER);
                if (netLoc != null && netLoc.isFromMockProvider()) {
                    return true;
                }
            } catch (SecurityException e) {
                // Permissions not granted yet, can't check. detailed check happens in plugin
                // anyway.
            }
            return false;
        }
    }
}
