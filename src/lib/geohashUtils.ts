import { encode as geohashEncode, decode as geohashDecode, neighbors as getGeohashNeighbors } from 'ngeohash';

// Configuration constants
export const TILE_LOAD_RADIUS_METERS = 200;  // Fixed radius around user
export const GEOHASH_PRECISION = 6;           // ~1.2km cells
export const LOCATION_UPDATE_THRESHOLD = 50;  // Re-query when user moves >50m

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Generate geohash for a given coordinate
 */
export function getGeohash(lat: number, lng: number): string {
    return geohashEncode(lat, lng, GEOHASH_PRECISION);
}

/**
 * Get all neighboring geohashes (8 neighbors + center)
 */
export function getGeohashWithNeighbors(lat: number, lng: number): string[] {
    const centerHash = getGeohash(lat, lng);
    const neighborHashes = getGeohashNeighbors(centerHash) as unknown as Record<string, string>;
    return [centerHash, ...Object.values(neighborHashes)];
}

/**
 * Decode geohash back to coordinates
 */
export function decodeGeohash(geohash: string): { lat: number; lng: number } {
    const decoded = geohashDecode(geohash);
    return { lat: decoded.latitude, lng: decoded.longitude };
}

/**
 * Filter tiles by distance from a point
 */
export function filterTilesByRadius<T extends { lat: number; lng: number }>(
    tiles: T[],
    centerLat: number,
    centerLng: number,
    radiusMeters: number = TILE_LOAD_RADIUS_METERS
): T[] {
    return tiles.filter(tile => {
        const distance = calculateDistance(centerLat, centerLng, tile.lat, tile.lng);
        return distance <= radiusMeters;
    });
}
