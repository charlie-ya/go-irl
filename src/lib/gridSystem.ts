export const GRID_PRECISION = 10000; // Multiply factor for 4 decimal places
export const GRID_STEP = 1; // Integer step (represents 0.0001 degrees)

export type GridKey = string; // "intLat_intLng"

/**
 * Convert GPS coordinate to integer grid coordinate
 * Preserves 4 decimal places of precision
 */
export function toGridInt(coord: number): number {
    return Math.floor(coord * GRID_PRECISION);
}

/**
 * Convert integer grid coordinate back to GPS float
 */
export function fromGridInt(gridInt: number): number {
    return gridInt / GRID_PRECISION;
}

/**
 * Generates a unique key for the grid square containing the given location.
 * Uses integer coordinates to avoid floating-point precision issues.
 */
export function getGridKey(lat: number, lng: number): GridKey {
    const latInt = toGridInt(lat);
    const lngInt = toGridInt(lng);
    return `${latInt}_${lngInt}`;
}

/**
 * Parses a grid key back into integer coordinates
 */
export function parseGridKey(key: GridKey): { latInt: number; lngInt: number } {
    const [latStr, lngStr] = key.split('_');
    return {
        latInt: parseInt(latStr, 10),
        lngInt: parseInt(lngStr, 10)
    };
}

/**
 * Get lat/lng as floats from grid key (for display, distance calculations)
 */
export function getGridFloats(key: GridKey): { lat: number; lng: number } {
    const { latInt, lngInt } = parseGridKey(key);
    return {
        lat: fromGridInt(latInt),
        lng: fromGridInt(lngInt)
    };
}

/**
 * Returns the 4 corners of the grid square for a given key.
 * Useful for drawing the polygon on the map.
 */
export function getGridSquareBounds(key: GridKey): [[number, number], [number, number], [number, number], [number, number]] {
    const { lat, lng } = getGridFloats(key);
    const step = 1 / GRID_PRECISION; // 0.0001

    return [
        [lat, lng],
        [lat + step, lng],
        [lat + step, lng + step],
        [lat, lng + step],
    ];
}
