import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Circle, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import { getGridKey, getGridSquareBounds } from '../lib/gridSystem';
import { TerritoryRenderer } from './TerritoryRenderer';
import type { Territory } from '../lib/gameState';

// Fix for default marker icon in leaflet (though we use circles mainly)
import 'leaflet/dist/leaflet.css';

interface MapBoardProps {
    locationIsReady: boolean;
    lat: number;
    lng: number;
    claims: Record<string, { color: string; explorerName: string }>;
    territories: Territory[];
}

// Component to update user position marker without re-centering map
function LocationTracker({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();

    useEffect(() => {
        // Only center on first load or if user is very far from current view
        const center = map.getCenter();
        const distance = map.distance(center, [lat, lng]);

        // If user is more than 500m away from center, recenter (they probably moved significantly)
        if (distance > 500) {
            map.setView([lat, lng], map.getZoom());
        }
    }, [lat, lng, map]);

    return null;
}

function ZoomHandler({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
    const map = useMapEvents({
        zoomend: () => {
            onZoomChange(map.getZoom());
        },
    });
    return null;
}

export function MapBoard({ locationIsReady, lat, lng, claims, territories }: MapBoardProps) {
    const [zoom, setZoom] = useState(18);
    // Store initial center to prevent re-centering on location updates
    const initialCenter = useRef<[number, number]>([lat, lng]);

    // Update initial center only when location first becomes ready
    useEffect(() => {
        if (locationIsReady && lat && lng && (initialCenter.current[0] === 0 || initialCenter.current[1] === 0)) {
            initialCenter.current = [lat, lng];
        }
    }, [locationIsReady, lat, lng]);

    if (!locationIsReady) {
        return <div className="flex items-center justify-center h-full w-full bg-slate-900 text-white">Locating...</div>;
    }

    // Calculate current grid square highlight
    const currentGridKey = getGridKey(lat, lng);
    const currentBounds = getGridSquareBounds(currentGridKey);

    // Determine if we should show explorer names when zoomed in
    // Show names at zoom 19 (tiles will be upscaled 2x from zoom 18)
    const showExplorerNames = zoom >= 19;

    // Prepare claimed polygons
    const claimedPolygons = Object.entries(claims).map(([key, tile]) => {
        const bounds = getGridSquareBounds(key);
        return (
            <Polygon
                key={key}
                positions={bounds}
                pathOptions={{ color: tile.color, fillOpacity: 0.5, weight: 1 }}
            >
                {showExplorerNames && (
                    <Tooltip permanent direction="center" className="explorer-name-tooltip">
                        {tile.explorerName}
                    </Tooltip>
                )}
            </Polygon>
        );
    });

    return (
        <MapContainer
            center={initialCenter.current}
            zoom={18}
            maxZoom={19}
            className="h-full w-full z-0"
            zoomControl={false}
            scrollWheelZoom={true}
        >
            <ZoomHandler onZoomChange={setZoom} />
            <LocationTracker lat={lat} lng={lng} />

            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxNativeZoom={18}
                maxZoom={19}
            />

            {/* Render captured territories (below claimed squares) */}
            <TerritoryRenderer territories={territories} />

            {/* Render claimed squares */}
            {claimedPolygons}

            {/* Render current square highlight (pulsing or distinct) */}
            <Polygon
                positions={currentBounds}
                pathOptions={{ color: 'black', fillOpacity: 0.2, weight: 2, dashArray: '5, 5' }}
            />

            {/* User marker */}
            <Circle
                center={[lat, lng]}
                radius={2}
                pathOptions={{ color: 'blue', fillColor: '#3b82f6', fillOpacity: 0.6 }}
            />
        </MapContainer>
    );
}
