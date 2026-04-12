import { useRef, useEffect, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getGridKey, getGridSquareBounds } from '../lib/gridSystem';
import { abbreviateUsername } from '../lib/stringUtils';
import { NOLLI_MAP_STYLE } from '../lib/mapStyle';
import { registerNolliPatterns } from '../lib/nolliPatterns';

import { getExclusionZonesGeoJSON, type ExclusionZone } from '../lib/exclusionZones';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Aggressive Diagnostic Alert
if (typeof window !== 'undefined') {
    const status = MAPBOX_TOKEN ? `Token exists (${MAPBOX_TOKEN.substring(0, 5)}...)` : 'TOKEN MISSING';
    console.log(`[MapBoard] DIAGNOSTIC: ${status}`);
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'app:') {
        alert(`MapBoard File Loaded. ${status}`);
    }
}

// Set token globally to ensure Mapcore/WebKit can handle sprite/tile decoding early
if (MAPBOX_TOKEN) {
    mapboxgl.accessToken = MAPBOX_TOKEN;
}

/** Generate a GeoJSON circle polygon using basic trig (no turf dependency) */
function createCircleGeoJSON(centerLat: number, centerLng: number, radiusMeters: number, steps = 64) {
    const coords: [number, number][] = [];
    const earthRadius = 6371000;
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (radiusMeters / earthRadius) * Math.cos(angle);
        const dLng = (radiusMeters / earthRadius) * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
        coords.push([centerLng + dLng * (180 / Math.PI), centerLat + dLat * (180 / Math.PI)]);
    }
    return {
        type: 'FeatureCollection' as const,
        features: [{ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [coords] }, properties: {} }]
    };
}

interface MapBoardProps {
    lat: number | null;
    lng: number | null;
    selectedGridKey?: string | null;
    claims: Record<string, { color: string; explorerName: string; status?: string }>;
    exclusionZones: ExclusionZone[];
    viewRadiusMeters?: number;
    onMapReady?: (map: mapboxgl.Map) => void;
}

export function WorldMap({ lat, lng, selectedGridKey, claims, exclusionZones, viewRadiusMeters = 200, onMapReady }: MapBoardProps) {
    const mapRef = useRef<any>(null);

    // Initial View State — only computed once GPS coords are valid
    // useMemo with lat/lng deps is safe here because we only render
    // the Map component after lat/lng are non-null (see early return below)
    const initialViewState = useMemo(() => ({
        latitude: lat ?? 0,
        longitude: lng ?? 0,
        zoom: 17,
        bearing: 0,
        pitch: 0
    }), [lat, lng]); // Will only be used once — when map first mounts with real coords

    // Smart re-center: fly to user position when they move off-screen
    useEffect(() => {
        const map = mapRef.current?.getMap?.() as mapboxgl.Map | undefined;
        if (!map || lat === null || lng === null) return;

        const bounds = map.getBounds();
        if (!bounds) return;

        // Inset the bounds by 20% so we re-center before the dot hits the very edge
        const lngSpan = bounds.getEast() - bounds.getWest();
        const latSpan = bounds.getNorth() - bounds.getSouth();
        const margin = 0.2;

        const innerWest = bounds.getWest() + lngSpan * margin;
        const innerEast = bounds.getEast() - lngSpan * margin;
        const innerSouth = bounds.getSouth() + latSpan * margin;
        const innerNorth = bounds.getNorth() - latSpan * margin;

        const isOffScreen =
            lng < innerWest || lng > innerEast ||
            lat < innerSouth || lat > innerNorth;

        if (isOffScreen) {
            map.flyTo({
                center: [lng, lat],
                duration: 1200,   // Smooth 1.2s animation
                essential: true,  // Not affected by prefers-reduced-motion
            });
        }
    }, [lat, lng]);

    // Prepare Claims GeoJSON (MUST be before any conditional returns!)
    const claimsGeoJSON = useMemo(() => {
        const features = Object.entries(claims).map(([key, tile]) => {
            const bounds = getGridSquareBounds(key);
            const coords = bounds.map(coord => [coord[1], coord[0]]);
            coords.push(coords[0]);

            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                },
                properties: {
                    key,
                    color: tile.color,
                    explorerName: abbreviateUsername(tile.explorerName),
                    status: tile.status || 'claimed'
                }
            };
        });

        return {
            type: 'FeatureCollection',
            features
        };
    }, [claims]);

    // Current Grid Highlight (MUST be before any conditional returns!)
    const currentGridGeoJSON = useMemo(() => {
        // Safety: only compute if we have valid coordinates
        // Check for undefined/null, not falsy (0 is a valid coord!)
        if (lat === undefined || lat === null || lng === undefined || lng === null) {
            return {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [[]] }
            };
        }

        const key = getGridKey(lat, lng);
        const bounds = getGridSquareBounds(key);
        const coords = bounds.map(coord => [coord[1], coord[0]]);
        coords.push(coords[0]);

        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [coords]
            }
        };
    }, [lat, lng]);

    // Selected Grid Highlight
    const selectedGridGeoJSON = useMemo(() => {
        if (!selectedGridKey) {
            return {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [[]] }
            };
        }

        const bounds = getGridSquareBounds(selectedGridKey);
        const coords = bounds.map(coord => [coord[1], coord[0]]);
        coords.push(coords[0]);

        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [coords]
            }
        };
    }, [selectedGridKey]);

    // Exclusion Zones GeoJSON (Static for now, but good to memoize if we make it dynamic)
    const exclusionZonesGeoJSON = useMemo(() => {
        return getExclusionZonesGeoJSON(exclusionZones);
    }, [exclusionZones]);

    // View Radius Circle GeoJSON
    const viewRadiusGeoJSON = useMemo(() => {
        if (lat === null || lng === null) {
            return { type: 'FeatureCollection' as const, features: [] };
        }
        return createCircleGeoJSON(lat, lng, viewRadiusMeters);
    }, [lat, lng, viewRadiusMeters]);

    // Debug log on claims update
    useEffect(() => {
        console.log('[MapBoard] Claims updated:', Object.keys(claims).length, 'tiles');
    }, [claims]);

    // Early return AFTER all hooks — wait for valid GPS before mounting map
    // This ensures initialViewState is always set to the real user location
    if (lat === null || lng === null) {
        if (typeof window !== 'undefined' && (window.location.protocol === 'capacitor:' || window.location.protocol === 'app:')) {
            alert("WorldMap: EXPLICIT NULL GPS DETECTED");
        }
        return (
            <div className="flex items-center justify-center h-full w-full bg-slate-900 text-white flex-col gap-3">
                <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-slate-100 font-bold text-lg animate-pulse">!!! WAITING FOR GPS !!!</div>
                <div className="text-slate-500 text-xs">If this stays, check iPad Settings &gt; Privacy &gt; Location</div>
            </div>
        );
    }

    return (
        <Map
            preserveDrawingBuffer={true}
            ref={mapRef}
            initialViewState={initialViewState}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                background: '#0000FF', // BRIGHT BLUE fallback
                border: '10px solid #FF0000', // THICK RED BORDER
                overflow: 'hidden'
            }}
            mapStyle={NOLLI_MAP_STYLE}
            mapboxAccessToken={MAPBOX_TOKEN}
            minZoom={15}
            maxZoom={20}
            onLoad={(e) => {
                console.log("[MapBoard] Map Style Loaded Successfully");
                registerNolliPatterns(e.target as any);
                onMapReady?.(e.target as any);
            }}
            onError={(e) => {
                console.error("[MapBoard] Map Rendering Error Instance:", e);
                // Check for detailed error messages in the event object
                const detail = (e as any).error?.message || (e as any).message || "No specific message";
                console.error("[MapBoard] Error Detail:", detail);

                if (detail.includes("401") || detail.includes("Unauthorized")) {
                    console.error("[MapBoard] AUTH FAILURE: Check your Mapbox Token domain restrictions.");
                }
            }}
            onStyleData={(e) => {
                if (e.dataType === 'style') {
                    console.log("[MapBoard] Style Metadata Received - Map is starting to paint.");
                }
            }}
            onSourceData={(e) => {
                if (e.dataType === 'source' && e.isSourceLoaded) {
                    console.log(`[MapBoard] Source Loaded: ${e.sourceId}`);
                }
            }}
        >
            <NavigationControl position="top-right" />

            {/* Exclusion Zones Layer (Below Claims) */}
            <Source id="exclusion-zones-source" type="geojson" data={exclusionZonesGeoJSON}>
                <Layer
                    id="exclusion-zones-fill"
                    type="fill"
                    paint={{
                        'fill-color': ['get', 'color'],
                        'fill-opacity': 0.3
                    }}
                />
                <Layer
                    id="exclusion-zones-line"
                    type="line"
                    paint={{
                        'line-color': ['get', 'color'],
                        'line-width': 2,
                        'line-opacity': 1
                    }}
                />
                {/* Exclusion Zone Icons/Labels */}
                <Layer
                    id="exclusion-zones-labels"
                    type="symbol"
                    minzoom={14}
                    layout={{
                        'icon-image': [
                            'match',
                            ['get', 'category'],
                            'sacred', 'emoji-sacred',
                            'sovereign', 'emoji-sovereign',
                            ''
                        ],
                        'icon-size': 0.8,
                        'icon-allow-overlap': true
                    }}
                    paint={{
                        'icon-opacity': 0.9
                    }}
                />
            </Source>

            {/* Claims Layer */}
            <Source id="claims-source" type="geojson" data={claimsGeoJSON as any}>
                <Layer
                    id="claims-fill"
                    type="fill"
                    paint={{
                        'fill-color': ['get', 'color'],
                        'fill-opacity': [
                            'match',
                            ['get', 'status'],
                            'moribund', 0.15,
                            'captured', 0.3,
                            0.5
                        ]
                    }}
                />
                <Layer
                    id="claims-outline"
                    type="line"
                    paint={{
                        'line-color': ['get', 'color'],
                        'line-width': 1,
                        'line-opacity': 0.8
                    }}
                />
                {/* Explorer Names (Zoom > 17) - Light pill with dark text */}
                <Layer
                    id="claims-labels"
                    type="symbol"
                    minzoom={18}
                    layout={{
                        'text-field': ['get', 'explorerName'],
                        'text-size': 14,  // Larger
                        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],  // Clean geometric font
                        'text-anchor': 'center',
                        'text-offset': [0, 0],
                        'text-padding': 4
                    }}
                    paint={{
                        'text-color': '#000000',  // Black text
                        'text-halo-color': 'rgba(255, 255, 255, 0.9)',  // Light semi-transparent background
                        'text-halo-width': 3.5,  // Wide halo for circular pill
                        'text-halo-blur': 0.5
                    }}
                />
            </Source>

            {/* Current Grid Highlight */}
            <Source id="current-grid-source" type="geojson" data={currentGridGeoJSON as any}>
                <Layer
                    id="current-grid-line"
                    type="line"
                    paint={{
                        'line-color': '#000000',
                        'line-width': 2,
                        'line-dasharray': [2, 2],
                        'line-opacity': 0.5
                    }}
                />
            </Source>

            {/* Selected Grid Highlight */}
            <Source id="selected-grid-source" type="geojson" data={selectedGridGeoJSON as any}>
                {/* Base Dark Gray Line */}
                <Layer
                    id="selected-grid-line-base"
                    type="line"
                    paint={{
                        'line-color': '#334155', // slate-700
                        'line-width': 3.5,
                        'line-opacity': 0.9
                    }}
                />
                {/* Creamy Yellow Dashes */}
                <Layer
                    id="selected-grid-line-dash"
                    type="line"
                    paint={{
                        'line-color': '#FEF08A', // yellow-200 (creamy yellow)
                        'line-width': 2.5,
                        'line-dasharray': [1, 1],
                        'line-opacity': 1
                    }}
                />
            </Source>

            {/* View Radius Circle */}
            <Source id="view-radius-source" type="geojson" data={viewRadiusGeoJSON as any}>
                <Layer
                    id="view-radius-line"
                    type="line"
                    paint={{
                        'line-color': '#1e2f47',
                        'line-width': 1.5,
                        'line-dasharray': [4, 4],
                        'line-opacity': 0.8
                    }}
                />
            </Source>

            {/* User Marker — lat/lng are guaranteed non-null here */}
            <Marker longitude={lng!} latitude={lat!} anchor="center">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
            </Marker>

        </Map>
    );
}
