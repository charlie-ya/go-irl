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

    useEffect(() => {
        if (!navigator.geolocation) {
            setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }));
            return;
        }

        const unwatch = navigator.geolocation.watchPosition(
            (position) => {
                const newPosition: PositionRecord = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
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
                const movingTooFast = isConsistentlyMovingTooFast(positionHistory.current);

                setState({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
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
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 5000,
            }
        );

        return () => navigator.geolocation.clearWatch(unwatch);
    }, []);

    return state;
}
