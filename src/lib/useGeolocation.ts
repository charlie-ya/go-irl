import { useState, useEffect, useRef } from 'react';
import {
    addPositionToHistory,
    calculateAverageSpeed,
    isConsistentlyMovingTooFast,
    type PositionRecord
} from './speedDetection';

interface LocationState {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    speed: number | null;        // Current average speed in km/h
    isMovingTooFast: boolean;    // True if consistently moving > 5 km/h
    error: string | null;
    loading: boolean;
}

export function useGeolocation() {
    const [state, setState] = useState<LocationState>({
        lat: null,
        lng: null,
        accuracy: null,
        speed: null,
        isMovingTooFast: false,
        error: null,
        loading: true,
    });

    // Track position history for speed calculation
    const positionHistory = useRef<PositionRecord[]>([]);
    const initializationTime = useRef<number>(Date.now());

    // Track last processed position to filter small movements
    const lastProcessedPos = useRef<{ lat: number; lng: number } | null>(null);

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
        if (!navigator.geolocation) {
            setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }));
            return;
        }

        const unwatch = navigator.geolocation.watchPosition(
            (position) => {
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
                    if (dist < 5) return; // Skip update
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
                });
            },
            (error) => {
                setState(s => ({ ...s, error: error.message, loading: false }));
            },
            {
                enableHighAccuracy: true, // Still need high accuracy for gameplay
                timeout: 10000,           // 10s timeout (was 20s) - fail faster
                maximumAge: 10000,        // Accept 10s old cached position (was 5s) - major battery saver
            }
        );

        return () => navigator.geolocation.clearWatch(unwatch);
    }, []);

    return state;
}
