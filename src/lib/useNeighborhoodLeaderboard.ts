import { useState, useEffect, useRef, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getGeohash } from './geohashUtils';
import type { LeaderboardEntry } from './leaderboardTypes';

interface NeighborhoodResult {
    entries: LeaderboardEntry[];
    myRank: number;
    myScore: number;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

/**
 * Tier 2: Neighborhood Leaderboard (geohash-5, ~1.5km radius)
 * 
 * Calls the `getNeighborhoodLeaderboard` Cloud Function.
 * Caches locally; re-fetches when the user crosses into a new geohash-5 cell.
 */
export function useNeighborhoodLeaderboard(
    userLat?: number,
    userLng?: number,
    myId?: string
): NeighborhoodResult {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [myRank, setMyRank] = useState(0);
    const [myScore, setMyScore] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastGeohash5 = useRef<string | null>(null);
    const fetchInProgress = useRef(false);

    const fetchLeaderboard = useCallback(async (geohash5: string) => {
        if (fetchInProgress.current) return;
        fetchInProgress.current = true;
        setLoading(true);
        setError(null);

        try {
            const functions = getFunctions();
            const getLeaderboard = httpsCallable(functions, 'getNeighborhoodLeaderboard');
            const result = await getLeaderboard({ geohash5, callerId: myId });
            const data = result.data as {
                topPlayers: Array<{
                    playerId: string;
                    explorerName: string;
                    color: string;
                    playerRank: string;
                    score: number;
                }>;
                callerRank: number;
                callerScore: number;
            };

            const leaderboardEntries: LeaderboardEntry[] = data.topPlayers.map((p, i) => ({
                rank: i + 1,
                playerId: p.playerId,
                explorerName: p.explorerName,
                color: p.color,
                playerRank: p.playerRank,
                score: p.score,
                isMe: p.playerId === myId,
            }));

            setEntries(leaderboardEntries);
            setMyRank(data.callerRank);
            setMyScore(data.callerScore);
        } catch (e: any) {
            console.error('[Leaderboard] Neighborhood fetch failed:', e);
            setError('Unable to load neighborhood leaderboard');
        } finally {
            setLoading(false);
            fetchInProgress.current = false;
        }
    }, [myId]);

    // Fetch when user moves to a new geohash-5 cell
    useEffect(() => {
        if (userLat === undefined || userLng === undefined || !myId) return;

        // Geohash precision 6 is what tiles use. Take first 5 chars for geohash-5.
        const fullGeohash = getGeohash(userLat, userLng);
        const geohash5 = fullGeohash.substring(0, 5);

        if (geohash5 !== lastGeohash5.current) {
            lastGeohash5.current = geohash5;
            fetchLeaderboard(geohash5);
        }
    }, [userLat, userLng, myId, fetchLeaderboard]);

    const refresh = useCallback(() => {
        if (lastGeohash5.current) {
            fetchLeaderboard(lastGeohash5.current);
        }
    }, [fetchLeaderboard]);

    return { entries, myRank, myScore, loading, error, refresh };
}
