import { useState, useEffect, useRef } from 'react';
import {
    addPositionToHistory,
    calculateAverageSpeed,
    isConsistentlyMovingTooFast,
    type PositionRecord
} from './speedDetection';

// ── GPS Refresh Tuning ──────────────────────────────────────
// Minimum distance (meters) the device must move before the
// position update is accepted.  Lower = more responsive dot,
// but more re-renders and battery drain from GPS jitter.
export const GPS_MIN_DISTANCE_METERS = 3;

// Maximum age (ms) of a cached GPS position that the browser
// is allowed to reuse.  Higher = less battery usage but the
// blue dot can lag behind the player's real position.
export const GPS_MAX_CACHE_AGE_MS = 7000;
// ────────────────────────────────────────────────────────────

interface LocationState {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    speed: number | null;        // Current average speed in km/h
    isMovingTooFast: boolean;    // True if consistently moving > 5 km/h
    error: string | null;
    loading: boolean;
    retrying: boolean;           // Silently retrying after a transient error
    persistentError: boolean;    // Gave up after max retries — suggest native app
    permissionDenied: boolean;   // User explicitly denied location (code 1)
}

declare global {
    interface Window {
        AndroidPolicy?: {
            isMockLocation: () => boolean;
            isDevModeEnabled: () => boolean;
        };
    }
}

// Helper to check Dev Mode silently
export const isAndroidDevModeEnabled = (): boolean => {
    if (window.AndroidPolicy && window.AndroidPolicy.isDevModeEnabled) {
        return window.AndroidPolicy.isDevModeEnabled();
    }
    return false;
};

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 3000;

export function useGeolocation(enabled: boolean = true) {
    const [state, setState] = useState<LocationState>({
        lat: null,
        lng: null,
        accuracy: null,
        speed: null,
        isMovingTooFast: false,
        error: null,
        loading: true,
        retrying: false,
        persistentError: false,
        permissionDenied: false,
    });

    // Track position history for speed calculation
    const positionHistory = useRef<PositionRecord[]>([]);
    const initializationTime = useRef<number>(Date.now());

    // Track last processed position to filter small movements
    const lastProcessedPos = useRef<{ lat: number; lng: number } | null>(null);
    const retryCount = useRef(0);
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const watchId = useRef<number | null>(null);

    // Calculate distance between two points in meters
    const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    useEffect(() => {
        if (!enabled) return;

        if (!navigator.geolocation) {
            setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }));
            return;
        }

        const startWatch = () => {
            watchId.current = navigator.geolocation.watchPosition(
                (position) => {
                    // Successful fix — reset retry counter
                    retryCount.current = 0;

                    // SECURITY: Check for Mock Location (Android Native)
                    if (window.AndroidPolicy && window.AndroidPolicy.isMockLocation()) {
                        setState(s => ({
                            ...s,
                            error: 'SECURITY VIOLATION: Mock Location Detected. Please disable fake GPS apps to play.',
                            loading: false,
                            lat: null,
                            lng: null
                        }));
                        return;
                    }

                    const newLat = position.coords.latitude;
                    const newLng = position.coords.longitude;

                    // BATTERY SAVER: Ignore updates if we haven't moved at least 5 meters
                    // This prevents GPS jitter from triggering re-renders and logic
                    if (lastProcessedPos.current) {
                        const dist = getDistanceMeters(
                            lastProcessedPos.current.lat,
                            lastProcessedPos.current.lng,
                            newLat,
                            newLng
                        );
                        if (dist < GPS_MIN_DISTANCE_METERS) return; // Skip update
                    }

                    lastProcessedPos.current = { lat: newLat, lng: newLng };

                    const newPosition: PositionRecord = {
                        lat: newLat,
                        lng: newLng,
                        timestamp: Date.now(),
                    };

                    // Add to history (automatically filters old positions)
                    positionHistory.current = addPositionToHistory(
                        positionHistory.current,
                        newPosition
                    );

                    // Calculate current average speed
                    const avgSpeed = calculateAverageSpeed(positionHistory.current);

                    // Check if consistently moving too fast (with 25s consistency window)
                    // WARM-UP: Ignore speed limit for first 30 seconds to allow GPS to settle
                    const isWarmingUp = Date.now() - initializationTime.current < 30000;
                    const movingTooFast = !isWarmingUp && isConsistentlyMovingTooFast(positionHistory.current);

                    setState({
                        lat: newLat,
                        lng: newLng,
                        accuracy: position.coords.accuracy,
                        speed: avgSpeed,
                        isMovingTooFast: movingTooFast,
                        error: null,
                        loading: false,
                        retrying: false,
                        persistentError: false,
                        permissionDenied: false,
                    });
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        // User explicitly denied — no point retrying
                        setState(s => ({
                            ...s,
                            error: error.message,
                            loading: false,
                            retrying: false,
                            permissionDenied: true,
                        }));
                        return;
                    }

                    // POSITION_UNAVAILABLE (2) or TIMEOUT (3) — transient on Safari/iOS, retry
                    if (watchId.current !== null) {
                        navigator.geolocation.clearWatch(watchId.current);
                        watchId.current = null;
                    }

                    if (retryCount.current < MAX_RETRIES) {
                        retryCount.current += 1;
                        // Stay silent during retries — no error UI yet
                        setState(s => ({ ...s, retrying: true, error: null }));
                        retryTimer.current = setTimeout(startWatch, RETRY_DELAY_MS);
                    } else {
                        // Exhausted retries — surface the persistent error
                        setState(s => ({
                            ...s,
                            retrying: false,
                            persistentError: true,
                            loading: false,
                            error: error.message,
                        }));
                    }
                },
                {
                    enableHighAccuracy: true, // Still need high accuracy for gameplay
                    timeout: 10000,           // 10s timeout (was 20s) - fail faster
                    maximumAge: GPS_MAX_CACHE_AGE_MS,  // Accept cached position up to this age — major battery saver
                }
            );
        };

        startWatch();

        return () => {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
            if (retryTimer.current !== null) clearTimeout(retryTimer.current);
        };
    }, [enabled]);

    return state;
}
