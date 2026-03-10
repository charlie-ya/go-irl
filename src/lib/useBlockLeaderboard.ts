import { useMemo } from 'react';
import type { GameState } from './gameState';
import type { LeaderboardEntry } from './leaderboardTypes';

/**
 * Tier 1: Block Leaderboard (~500m radius)
 * 
 * Pure client-side — zero extra Firestore reads.
 * Aggregates tile counts per owner from the already-loaded `claims` object.
 * Re-derives whenever claims change.
 */
export function useBlockLeaderboard(
    claims: GameState,
    myId?: string
): { entries: LeaderboardEntry[]; myRank: number; myScore: number } {
    return useMemo(() => {
        if (!myId) return { entries: [], myRank: 0, myScore: 0 };

        // Aggregate tiles per owner
        const ownerMap = new Map<string, {
            count: number;
            explorerName: string;
            color: string;
            playerRank: string;
        }>();

        for (const tile of Object.values(claims)) {
            if (!tile.ownerId) continue; // skip virtual captured-only entries

            const existing = ownerMap.get(tile.ownerId);
            if (existing) {
                existing.count++;
            } else {
                ownerMap.set(tile.ownerId, {
                    count: 1,
                    explorerName: tile.explorerName || 'Unknown',
                    color: tile.color || '#808080',
                    playerRank: tile.ownerRank || 'Lowly Vassal',
                });
            }
        }

        // Sort by tile count descending
        const sorted = Array.from(ownerMap.entries())
            .sort((a, b) => b[1].count - a[1].count);

        // Build entries (top 10)
        const entries: LeaderboardEntry[] = sorted.slice(0, 10).map(([playerId, data], index) => ({
            rank: index + 1,
            playerId,
            explorerName: data.explorerName,
            color: data.color,
            playerRank: data.playerRank,
            score: data.count,
            isMe: playerId === myId,
        }));

        // Find my rank (could be beyond top 10)
        const myIndex = sorted.findIndex(([id]) => id === myId);
        const myRank = myIndex >= 0 ? myIndex + 1 : 0;
        const myScore = myIndex >= 0 ? sorted[myIndex][1].count : 0;

        return { entries, myRank, myScore };
    }, [claims, myId]);
}
