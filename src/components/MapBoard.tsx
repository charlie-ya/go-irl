import { MapContainer, TileLayer, Polygon, Circle } from 'react-leaflet';
import { getGridKey, getGridSquareBounds } from '../lib/gridSystem';

// Fix for default marker icon in leaflet (though we use circles mainly)
import 'leaflet/dist/leaflet.css';

interface MapBoardProps {
    locationIsReady: boolean;
    lat: number;
    lng: number;
    claims: Record<string, { color: string }>;
}

export function MapBoard({ locationIsReady, lat, lng, claims }: MapBoardProps) {
    if (!locationIsReady) {
        return <div className="flex items-center justify-center h-full w-full bg-slate-900 text-white">Locating...</div>;
    }

    // Calculate current grid square highlight
    const currentGridKey = getGridKey(lat, lng);
    const currentBounds = getGridSquareBounds(currentGridKey);

    // Prepare claimed polygons
    const claimedPolygons = Object.entries(claims).map(([key, tile]) => {
        const bounds = getGridSquareBounds(key);
        return (
            <Polygon
                key={key}
                positions={bounds}
                pathOptions={{ color: tile.color, fillOpacity: 0.5, weight: 1 }}
            />
        );
    });

    return (
        <MapContainer
            center={[lat, lng]}
            zoom={18}
            className="h-full w-full z-0"
            zoomControl={false}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

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
