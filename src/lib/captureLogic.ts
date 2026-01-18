import type { GridKey } from './gridSystem';
import { parseGridKey, STEP } from './gridSystem';

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
 */
export function getOrthogonalNeighbors(gridKey: GridKey): GridKey[] {
    const { lat, lng } = parseGridKey(gridKey);

    return [
        `${(lat + STEP).toFixed(4)},${lng.toFixed(4)}`, // North
        `${(lat - STEP).toFixed(4)},${lng.toFixed(4)}`, // South
        `${lat.toFixed(4)},${(lng + STEP).toFixed(4)}`, // East
        `${lat.toFixed(4)},${(lng - STEP).toFixed(4)}`, // West
    ];
}

/**
 * Flood fill algorithm to find all connected squares
 * Used to detect enclosed areas
 */
function floodFill(
    startKey: GridKey,
    claims: Record<string, { ownerId: string }>,
    boundaryOwnerId: string,
    visited: Set<string>,
    maxIterations: number = 1000
): { squares: Set<string>; hitBoundary: boolean } {
    const queue: GridKey[] = [startKey];
    const filled = new Set<string>();
    let hitBoundary = false;
    let iterations = 0;

    while (queue.length > 0 && iterations < maxIterations) {
        iterations++;
        const current = queue.shift()!;

        if (visited.has(current) || filled.has(current)) continue;

        visited.add(current);
        filled.add(current);

        // Check if this square is owned by the boundary owner
        const tile = claims[current];
        if (tile && tile.ownerId === boundaryOwnerId) {
            // Hit the perimeter, this is a boundary
            continue;
        }

        // Check if we've gone too far (escaped the potential enclosure)
        if (filled.size > 100) {
            hitBoundary = true;
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

    return { squares: filled, hitBoundary };
}

/**
 * Check if a set of squares forms a valid perimeter
 * A valid perimeter must be orthogonally connected
 */
function isConnectedPerimeter(squares: Set<string>): boolean {
    if (squares.size === 0) return false;

    const visited = new Set<string>();
    const queue = [Array.from(squares)[0]];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        const neighbors = getOrthogonalNeighbors(current);
        for (const neighbor of neighbors) {
            if (squares.has(neighbor) && !visited.has(neighbor)) {
                queue.push(neighbor);
            }
        }
    }

    return visited.size === squares.size;
}

/**
 * Find all enclosed areas for a given player
 * Returns array of territories (perimeter + enclosed squares)
 */
export function findEnclosedAreas(
    claims: Record<string, { ownerId: string; explorerName: string; color: string }>,
    playerId: string
): Array<{ perimeterSquares: string[]; enclosedSquares: string[] }> {
    const territories: Array<{ perimeterSquares: string[]; enclosedSquares: string[] }> = [];
    const playerSquares = Object.keys(claims).filter(key => claims[key].ownerId === playerId);

    // For each player square, check if it's part of an enclosing perimeter
    const processedPerimeters = new Set<string>();

    for (const square of playerSquares) {
        // Get all neighbors of this square
        const neighbors = getOrthogonalNeighbors(square);

        for (const neighbor of neighbors) {
            // Skip if this neighbor is owned by the player
            if (claims[neighbor]?.ownerId === playerId) continue;

            // Try flood fill from this neighbor
            const visited = new Set<string>();
            const { squares: filled, hitBoundary } = floodFill(neighbor, claims, playerId, visited);

            // If we didn't hit a boundary, we found an enclosed area
            if (!hitBoundary && filled.size > 0) {
                // Find all perimeter squares
                const perimeterSet = new Set<string>();

                for (const enclosedSquare of filled) {
                    const enclosedNeighbors = getOrthogonalNeighbors(enclosedSquare);
                    for (const n of enclosedNeighbors) {
                        if (claims[n]?.ownerId === playerId) {
                            perimeterSet.add(n);
                        }
                    }
                }

                // Check if this is a new perimeter
                const perimeterKey = Array.from(perimeterSet).sort().join('|');
                if (!processedPerimeters.has(perimeterKey) && isConnectedPerimeter(perimeterSet)) {
                    processedPerimeters.add(perimeterKey);

                    territories.push({
                        perimeterSquares: Array.from(perimeterSet),
                        enclosedSquares: Array.from(filled)
                    });
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
