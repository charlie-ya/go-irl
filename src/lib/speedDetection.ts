import { calculateDistance } from './geohashUtils';

// Configuration constants
export const SPEED_THRESHOLD_KMH = 5;           // Walking speed threshold
export const CONSISTENCY_WINDOW_MS = 25000;     // 25 seconds for consistency check
export const MIN_POSITIONS_FOR_CHECK = 5;       // Need 5+ positions for reliable check
export const MIN_TIME_BETWEEN_POSITIONS = 2000; // Min 2s between position samples
export const MIN_DISTANCE_FOR_SPEED = 3;        // Min 3m movement to calculate speed

export interface PositionRecord {
    lat: number;
    lng: number;
    timestamp: number;
}

/**
 * Calculate speed between two positions
 * Returns speed in km/h
 */
export function calculateSpeedBetweenPoints(
    pos1: PositionRecord,
    pos2: PositionRecord
): number | null {
    const timeDiff = pos2.timestamp - pos1.timestamp;

    // Need at least 1 second between positions
    if (timeDiff < 1000) {
        return null;
    }

    const distance = calculateDistance(pos1.lat, pos1.lng, pos2.lat, pos2.lng);

    // Ignore very small movements (GPS noise)
    if (distance < MIN_DISTANCE_FOR_SPEED) {
        return null;
    }

    // Calculate speed: (meters / milliseconds) * 3600 * 1000 / 1000 = km/h
    const speedKmh = (distance / timeDiff) * 3600;

    return speedKmh;
}

/**
 * Calculate average speed from position history
 * Returns average speed in km/h or null if insufficient data
 */
export function calculateAverageSpeed(positions: PositionRecord[]): number | null {
    if (positions.length < 2) {
        return null;
    }

    const speeds: number[] = [];

    // Calculate speed between consecutive positions
    for (let i = 1; i < positions.length; i++) {
        const speed = calculateSpeedBetweenPoints(positions[i - 1], positions[i]);
        if (speed !== null) {
            speeds.push(speed);
        }
    }

    if (speeds.length === 0) {
        return null;
    }

    // Return average speed
    const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    return avgSpeed;
}

/**
 * Check if user is consistently moving too fast
 * Requires sustained high speed over CONSISTENCY_WINDOW_MS to avoid GPS glitches
 */
export function isConsistentlyMovingTooFast(positions: PositionRecord[]): boolean {
    if (positions.length < MIN_POSITIONS_FOR_CHECK) {
        // Not enough data for consistency check
        return false;
    }

    const now = Date.now();
    const windowStart = now - CONSISTENCY_WINDOW_MS;

    // Filter to positions within the consistency window
    const recentPositions = positions.filter(p => p.timestamp >= windowStart);

    if (recentPositions.length < MIN_POSITIONS_FOR_CHECK) {
        // Not enough recent positions
        return false;
    }

    // Calculate speeds for each consecutive pair in the window
    const speeds: number[] = [];
    for (let i = 1; i < recentPositions.length; i++) {
        const speed = calculateSpeedBetweenPoints(recentPositions[i - 1], recentPositions[i]);
        if (speed !== null) {
            speeds.push(speed);
        }
    }

    if (speeds.length < 3) {
        // Need at least 3 speed measurements for consistency
        return false;
    }

    // Check if majority of speeds exceed threshold
    const speedsAboveThreshold = speeds.filter(s => s > SPEED_THRESHOLD_KMH);
    const percentageAbove = speedsAboveThreshold.length / speeds.length;

    // If 70%+ of recent speeds are above threshold, user is consistently moving too fast
    return percentageAbove >= 0.7;
}

/**
 * Add a new position to the history, maintaining a reasonable size
 * Keeps positions from the last CONSISTENCY_WINDOW_MS * 1.5
 */
export function addPositionToHistory(
    history: PositionRecord[],
    newPosition: PositionRecord
): PositionRecord[] {
    // Don't add if too close in time to last position
    if (history.length > 0) {
        const lastPos = history[history.length - 1];
        if (newPosition.timestamp - lastPos.timestamp < MIN_TIME_BETWEEN_POSITIONS) {
            return history;
        }
    }

    const updatedHistory = [...history, newPosition];

    // Keep only positions within 1.5x the consistency window
    const cutoffTime = newPosition.timestamp - (CONSISTENCY_WINDOW_MS * 1.5);
    const filteredHistory = updatedHistory.filter(p => p.timestamp >= cutoffTime);

    return filteredHistory;
}
