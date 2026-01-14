export const DIGITS = 4;
export const STEP = Math.pow(10, -DIGITS); // 0.0001

export type GridKey = string; // "lat,lng"

/**
 * Converts a latitude or longitude to the fixed precision used by the grid.
 * Floors the value to ensure we get the bottom-left corner of the grid square (or consistent reference).
 */
export function toFixedCoord(val: number): number {
    return Math.floor(val * (1 / STEP)) / (1 / STEP);
}

/**
 * Generates a unique key for the grid square containing the given location.
 */
export function getGridKey(lat: number, lng: number): GridKey {
    const fLat = toFixedCoord(lat).toFixed(DIGITS);
    const fLng = toFixedCoord(lng).toFixed(DIGITS);
    return `${fLat},${fLng}`;
}

/**
 * Parses a grid key back into the bottom-left coordinate.
 */
export function parseGridKey(key: GridKey): { lat: number; lng: number } {
    const [latStr, lngStr] = key.split(',');
    return {
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
    };
}

/**
 * Returns the 4 corners of the grid square for a given key.
 * Useful for drawing the polygon.
 */
export function getGridSquareBounds(key: GridKey): [[number, number], [number, number], [number, number], [number, number]] {
    const { lat, lng } = parseGridKey(key);
    // lat, lng is the "bottom-left" (or min-lat, min-lng) corner
    // We want to return (lat, lng), (lat+step, lng), (lat+step, lng+step), (lat, lng+step)
    // But precision matters for display, so we add step.
    const nextLat = lat + STEP;
    const nextLng = lng + STEP;

    return [
        [lat, lng],
        [nextLat, lng],
        [nextLat, nextLng],
        [lat, nextLng],
    ];
}
