import type { GridKey } from './gridSystem';
import { parseGridKey, fromGridInt, GRID_STEP } from './gridSystem';
import { isPointInExcludedZone } from './exclusionZones';

export interface Territory {
    id: string;
    ownerId: string;
    explorerName: string;
    color: string;
    perimeterSquares: string[];
    enclosedSquares: string[];
    capturedAt: number;
    isActive: boolean;
}

/**
 * Get orthogonally adjacent grid keys (up, down, left, right)
 * Uses integer arithmetic - zero precision errors!
 */
export function getOrthogonalNeighbors(gridKey: GridKey): GridKey[] {
    const { latInt, lngInt } = parseGridKey(gridKey);

    return [
        `${latInt + GRID_STEP}_${lngInt}`,     // North
        `${latInt - GRID_STEP}_${lngInt}`,     // South
        `${latInt}_${lngInt + GRID_STEP}`,     // East
        `${latInt}_${lngInt - GRID_STEP}`,     // West
    ];
}

/**
 * Flood fill algorithm to find all connected squares
 * Used to detect enclosed areas
 */
function floodFill(
    startKey: GridKey,
    claims: Record<string, { ownerId: string; status?: string }>,
    boundaryOwnerId: string,
    visited: Set<string>,
    maxIterations: number = 1000
): { squares: Set<string>; escaped: boolean } {
    const queue: GridKey[] = [startKey];
    const filled = new Set<string>();
    let escaped = false;
    let iterations = 0;

    while (queue.length > 0 && iterations < maxIterations) {
        iterations++;
        const current = queue.shift()!;

        if (visited.has(current) || filled.has(current)) continue;

        visited.add(current);

        // Check if this square is owned by the boundary owner
        const tile = claims[current];
        if (tile && tile.ownerId === boundaryOwnerId) {
            // Hit the perimeter, this is a boundary
            continue;
        }

        // Check if this square is already captured by someone (permanent capture wall)
        if (tile && tile.status === 'captured') {
            continue;
        }

        // EXCLUSION ZONE CHECK: Treat excluded zones as BOUNDARIES (Walls)
        // Convert grid key to lat/lng to check
        const { latInt, lngInt } = parseGridKey(current);
        const lat = fromGridInt(latInt);
        const lng = fromGridInt(lngInt);

        const excluded = isPointInExcludedZone(lat, lng);
        // Only treat PERMANENT exclusions as walls (Sacred, Sovereign, Natural)
        if (excluded && (excluded.category === 'sacred' || excluded.category === 'sovereign' || excluded.category === 'natural')) {
            // It's a wall!
            continue;
        }

        // If it's owned by someone else, we effectively "passed through" their territory
        // But for enclosure, we usually only care if we hit OUR tiles.
        // If we hit empty space or other's space, we continue filling.

        filled.add(current);

        // Check if we've gone too far (escaped the potential enclosure)
        // Check if we've gone too far (escaped the potential enclosure)
        if (filled.size > 500) {
            escaped = true;
            break;
        }

        // Add neighbors to queue
        const neighbors = getOrthogonalNeighbors(current);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor) && !filled.has(neighbor)) {
                queue.push(neighbor);
            }
        }
    }

    return { squares: filled, escaped };
}

/**
 * Find all enclosed areas for a given player
 * Returns array of territories (perimeter + enclosed squares)
 */
export function findEnclosedAreas(
    claims: Record<string, { ownerId: string; explorerName: string; color: string; status?: string }>,
    playerId: string,
    newTileKey?: string
): Array<{ perimeterSquares: string[]; enclosedSquares: string[] }> {
    const territories: Array<{ perimeterSquares: string[]; enclosedSquares: string[] }> = [];
    
    let playerSquares: string[];
    if (newTileKey) {
        playerSquares = [newTileKey];
    } else {
        playerSquares = Object.keys(claims).filter(key => claims[key].ownerId === playerId);
    }

    console.log(`[FLOOD] Player squares (first 10):`, playerSquares.slice(0, 10));
    console.log(`[FLOOD] Total player squares checked: ${playerSquares.length}`);

    // Track which empty areas we've already processed
    const processedAreas = new Set<string>();
    const processedPerimeters = new Set<string>();

    // For each player square, check its neighbors for potential enclosed areas
    for (const square of playerSquares) {
        const neighbors = getOrthogonalNeighbors(square);

        for (const neighbor of neighbors) {
            // If this neighbor is unclaimed and we haven't processed it yet
            if (!claims[neighbor] && !processedAreas.has(neighbor)) {
                // Try flood fill from this neighbor
                const visited = new Set<string>();
                const { squares: filled, escaped } = floodFill(neighbor, claims, playerId, visited);

                // Mark all filled squares as processed
                filled.forEach(sq => processedAreas.add(sq));

                // If we didn't escape and found squares, we have an enclosed area
                if (!escaped && filled.size > 0) {
                    // Find all perimeter squares (player squares touching the filled area)
                    const perimeterSet = new Set<string>();

                    for (const enclosedSquare of filled) {
                        const enclosedNeighbors = getOrthogonalNeighbors(enclosedSquare);
                        for (const n of enclosedNeighbors) {
                            if (claims[n]?.ownerId === playerId) {
                                perimeterSet.add(n);
                            }
                        }
                    }

                    // Check if this is a new perimeter (avoid duplicates)
                    const perimeterKey = Array.from(perimeterSet).sort().join('|');

                    if (!processedPerimeters.has(perimeterKey)) {
                        processedPerimeters.add(perimeterKey);

                        territories.push({
                            perimeterSquares: Array.from(perimeterSet),
                            enclosedSquares: Array.from(filled)
                        });
                    }
                }
            }
        }
    }

    return territories;
}

/**
 * Validate if a territory's perimeter is still intact
 */
export function isTerritoryValid(
    territory: Territory,
    claims: Record<string, { ownerId: string }>
): boolean {
    // Check if all perimeter squares are still owned by the territory owner
    for (const square of territory.perimeterSquares) {
        const tile = claims[square];
        if (!tile || tile.ownerId !== territory.ownerId) {
            return false;
        }
    }

    return true;
}
