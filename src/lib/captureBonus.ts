import { parseGridKey } from './gridSystem';

/**
 * Calculate the capture bonus for an enclosed territory.
 * 
 * Formula: ΔX + ΔY (bounding-box dimensions of the enclosed area).
 * 
 * This is always exactly 50% of the minimum perimeter cost (2w + 2h),
 * so it's mathematically impossible for a player to profit from captures.
 * For irregular (non-rectangular) shapes, the bonus is even less relative
 * to the actual perimeter walked.
 * 
 * @param enclosedSquares Array of grid keys for enclosed tiles
 * @returns Coin bonus to award
 */
export function calculateCaptureBonus(enclosedSquares: string[]): number {
    if (enclosedSquares.length === 0) return 0;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const key of enclosedSquares) {
        const { latInt, lngInt } = parseGridKey(key);
        if (latInt < minLat) minLat = latInt;
        if (latInt > maxLat) maxLat = latInt;
        if (lngInt < minLng) minLng = lngInt;
        if (lngInt > maxLng) maxLng = lngInt;
    }

    // ΔX and ΔY in grid steps (each step = 1 integer unit = GRID_STEP)
    // +1 because a single tile has delta 0, but spans 1 grid unit
    const deltaX = (maxLng - minLng) + 1;
    const deltaY = (maxLat - minLat) + 1;

    return deltaX + deltaY;
}
