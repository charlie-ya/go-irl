import { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
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
    const watchId = useRef<string | null>(null); // Capacitor returns a string watch ID

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

        let isActive = true;

        const startWatch = async () => {
            try {
                // Request permissions first on native
                await Geolocation.requestPermissions();
                
                const id = await Geolocation.watchPosition(
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: GPS_MAX_CACHE_AGE_MS,
                    },
                    (position, error) => {
                        if (!isActive) return;

                        if (error) {
                            console.error("Geolocation watch error:", error);
                            // Error code 1 is PERMISSION_DENIED
                            // @ts-ignore
                            if (error.code === 1 || error.message?.includes('denied') || error.message?.includes('permission')) {
                                setState(s => ({
                                    ...s,
                                    error: error.message || 'Permission denied',
                                    loading: false,
                                    retrying: false,
                                    permissionDenied: true,
                                }));
                                return;
                            }

                            if (watchId.current !== null) {
                                Geolocation.clearWatch({ id: watchId.current });
                                watchId.current = null;
                            }

                            if (retryCount.current < MAX_RETRIES) {
                                retryCount.current += 1;
                                setState(s => ({ ...s, retrying: true, error: null }));
                                retryTimer.current = setTimeout(startWatch, RETRY_DELAY_MS);
                            } else {
                                setState(s => ({
                                    ...s,
                                    retrying: false,
                                    persistentError: true,
                                    loading: false,
                                    error: error.message || 'Unknown error',
                                }));
                            }
                            return;
                        }

                        if (!position) return;

                        retryCount.current = 0;

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

                        if (lastProcessedPos.current) {
                            const dist = getDistanceMeters(
                                lastProcessedPos.current.lat,
                                lastProcessedPos.current.lng,
                                newLat,
                                newLng
                            );
                            if (dist < GPS_MIN_DISTANCE_METERS) return; 
                        }

                        lastProcessedPos.current = { lat: newLat, lng: newLng };

                        const newPosition: PositionRecord = {
                            lat: newLat,
                            lng: newLng,
                            timestamp: Date.now(),
                        };

                        positionHistory.current = addPositionToHistory(
                            positionHistory.current,
                            newPosition
                        );

                        const avgSpeed = calculateAverageSpeed(positionHistory.current);

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
                    }
                );

                if (isActive) {
                    watchId.current = id;
                } else {
                    Geolocation.clearWatch({ id });
                }
            } catch (err: any) {
                if (!isActive) return;
                console.error("Failed to start watch:", err);
                setState(s => ({
                    ...s,
                    error: err.message || 'Failed to start geolocation',
                    loading: false,
                    persistentError: true
                }));
            }
        };

        startWatch();

        return () => {
            isActive = false;
            if (watchId.current !== null) {
                Geolocation.clearWatch({ id: watchId.current });
                watchId.current = null;
            }
            if (retryTimer.current !== null) {
                clearTimeout(retryTimer.current);
            }
        };
    }, [enabled]);

    return state;
}
