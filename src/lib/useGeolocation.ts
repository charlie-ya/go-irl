import { useState, useEffect } from 'react';

interface LocationState {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    error: string | null;
    loading: boolean;
}

export function useGeolocation() {
    const [state, setState] = useState<LocationState>({
        lat: null,
        lng: null,
        accuracy: null,
        error: null,
        loading: true,
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }));
            return;
        }

        const unwatch = navigator.geolocation.watchPosition(
            (position) => {
                setState({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
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
