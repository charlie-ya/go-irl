import { getDistance } from 'geolib';
import * as turf from '@turf/turf';

export type ZoneCategory = 'sacred' | 'reserved' | 'sovereign' | 'natural' | 'commercial';

export interface ExclusionZone {
    id: string;
    name: string;
    category: ZoneCategory;
    type: 'point' | 'polygon';

    // For Point type (circular buffer)
    center?: { lat: number; lng: number };
    radius?: number; // meters

    // For Polygon type
    boundary?: { lat: number; lng: number }[]; // Ordered vertices

    isPermanent: boolean;
    isActive: boolean; // For reserved spaces events

    metadata?: {
        description?: string;
        icon?: string;
    };
}

// --- Hardcoded Test Zones for verification ---
// Used 32.0929, 34.7817 as center
export const STATIC_ZONES: ExclusionZone[] = [];

/**
 * Check if a point is inside any active exclusion zone
 */
export function isPointInExcludedZone(lat: number, lng: number, zones: ExclusionZone[] = STATIC_ZONES): ExclusionZone | null {
    const point = turf.point([lng, lat]); // GeoJSON is [lng, lat]

    for (const zone of zones) {
        if (!zone.isActive) continue;

        if (zone.type === 'point' && zone.center && zone.radius) {
            const dist = getDistance(
                { latitude: lat, longitude: lng },
                { latitude: zone.center.lat, longitude: zone.center.lng }
            );
            if (dist <= zone.radius) {
                return zone;
            }
        } else if (zone.type === 'polygon' && zone.boundary) {
            const polygonCoords = zone.boundary.map(p => [p.lng, p.lat]);
            // Ensure closed loop
            if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
                polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
                polygonCoords.push(polygonCoords[0]);
            }

            const polygon = turf.polygon([polygonCoords]);
            if (turf.booleanPointInPolygon(point, polygon)) {
                return zone;
            }
        }
    }
    return null;
}

/**
 * Get display color for zone category
 */
export function getZoneColor(category: ZoneCategory): string {
    switch (category) {
        case 'sacred': return '#FFD700'; // Gold
        case 'reserved': return '#800080'; // Purple
        case 'sovereign': return '#FF4500'; // OrangeRed
        case 'natural': return '#228B22'; // ForestGreen
        case 'commercial': return '#808080'; // Grey
        default: return '#000000';
    }
}

/**
 * Convert all zones to a GeoJSON FeatureCollection for Mapbox
 */
export function getExclusionZonesGeoJSON(zones: ExclusionZone[] = STATIC_ZONES): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = zones
        .filter(zone => zone.isActive)
        .map(zone => {
            let geometry: GeoJSON.Geometry;

            if (zone.type === 'point' && zone.center && zone.radius) {
                // Create circle polygon (64 steps for smoothness)
                const center = [zone.center.lng, zone.center.lat];
                const options = { steps: 64, units: 'meters' as const };
                const circle = turf.circle(center, zone.radius, options);
                geometry = circle.geometry;
            } else if (zone.type === 'polygon' && zone.boundary) {
                const coords = zone.boundary.map(p => [p.lng, p.lat]);
                // Close loop if needed
                if (coords[0][0] !== coords[coords.length - 1][0] ||
                    coords[0][1] !== coords[coords.length - 1][1]) {
                    coords.push(coords[0]);
                }
                geometry = {
                    type: 'Polygon',
                    coordinates: [coords]
                };
            } else {
                return null;
            }

            return {
                type: 'Feature',
                geometry,
                properties: {
                    id: zone.id,
                    name: zone.name,
                    category: zone.category,
                    color: getZoneColor(zone.category),
                    icon: zone.metadata?.icon || ''
                }
            } as GeoJSON.Feature;
        })
        .filter((f): f is GeoJSON.Feature => f !== null);

    return {
        type: 'FeatureCollection',
        features
    };
}
