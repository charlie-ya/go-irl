import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Type definition for Rank
type Rank = 'Lowly Vassal' | 'Minion' | 'Centurion';

// Checks for v2 signature where first argument is the Request object
export const requestPromotion = functions.https.onCall(async (request: any) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    const uid = request.auth.uid;
    const gridKey = request.data.gridKey;

    if (!gridKey || typeof gridKey !== 'string') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with a valid "gridKey" argument.'
        );
    }

    try {
        // 2. Query Active Players at Location
        // Active means lastSeen within 5 minutes
        const activeThreshold = Date.now() - (5 * 60 * 1000);

        const playersRef = db.collection('players');
        const q = playersRef
            .where('currentGridKey', '==', gridKey)
            .where('lastSeen', '>', activeThreshold);

        const snapshot = await q.get();
        const playerCount = snapshot.size;

        // 3. Determine New Rank
        let newRank: Rank | null = null;
        if (playerCount >= 100) {
            newRank = 'Centurion';
        } else if (playerCount >= 10) {
            newRank = 'Minion';
        }

        // 4. Update Rank if Improved
        if (newRank) {
            const playerRef = playersRef.doc(uid);
            const playerDoc = await playerRef.get();
            const currentRank = playerDoc.data()?.rank as Rank || 'Lowly Vassal';

            const getRankValue = (r: Rank) => {
                if (r === 'Centurion') return 3;
                if (r === 'Minion') return 2;
                return 1;
            };

            if (getRankValue(newRank) > getRankValue(currentRank)) {
                await playerRef.update({ rank: newRank });
                return {
                    success: true,
                    promoted: true,
                    newRank: newRank,
                    playerCount: playerCount,
                    message: `Congratulations! You have been promoted to ${newRank}!`
                };
            }
        }

        return {
            success: true,
            promoted: false,
            currentRank: newRank, // The rank they *would* have, or null
            playerCount: playerCount,
            message: `You have ${playerCount} explorers here. Gather more to rise in rank!`
        };

    } catch (error) {
        console.error("Promotion check failed", error);
        throw new functions.https.HttpsError(
            'internal',
            'Unable to verify promotion requirements',
            error
        );
    }
});

// ============================================================
// NEIGHBORHOOD LEADERBOARD (Geohash-5, ~1.5km radius)
// ============================================================
const LEADERBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getNeighborhoodLeaderboard = functions.https.onCall(async (request: any) => {
    if (!request.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated.'
        );
    }

    const geohash5 = request.data.geohash5;
    const callerId = request.data.callerId || request.auth.uid;

    if (!geohash5 || typeof geohash5 !== 'string' || geohash5.length !== 5) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Must provide a valid 5-character geohash.'
        );
    }

    try {
        // 1. Check cache
        const cacheRef = db.collection('leaderboards').doc(geohash5);
        const cacheDoc = await cacheRef.get();

        if (cacheDoc.exists) {
            const cached = cacheDoc.data();
            if (cached && cached.updatedAt && (Date.now() - cached.updatedAt) < LEADERBOARD_CACHE_TTL_MS) {
                // Cache hit — find caller's position
                const callerEntry = cached.topPlayers?.find(
                    (p: { playerId: string }) => p.playerId === callerId
                );
                const allScores = cached.allScores || {};
                const callerScore = allScores[callerId] || callerEntry?.score || 0;
                const callerRank = callerEntry
                    ? cached.topPlayers.indexOf(callerEntry) + 1
                    : Object.values(allScores).filter((s: unknown) => (s as number) > callerScore).length + 1;

                return {
                    topPlayers: cached.topPlayers,
                    callerRank,
                    callerScore,
                };
            }
        }

        // 2. Cache miss or stale — compute from tiles
        // Query tiles whose geohash starts with the 5-char prefix
        // Firestore range query: geohash >= "xxxxx" AND geohash < "xxxxy"
        const geohashEnd = geohash5.slice(0, 4) + String.fromCharCode(geohash5.charCodeAt(4) + 1);

        const tilesSnap = await db.collection('tiles')
            .where('geohash', '>=', geohash5)
            .where('geohash', '<', geohashEnd)
            .get();

        // Aggregate tiles per owner
        const ownerMap: Record<string, {
            tileCount: number;
            explorerName: string;
            color: string;
            playerRank: string;
        }> = {};

        tilesSnap.forEach(doc => {
            const tile = doc.data();
            if (!tile.ownerId) return;

            if (!ownerMap[tile.ownerId]) {
                ownerMap[tile.ownerId] = {
                    tileCount: 0,
                    explorerName: tile.explorerName || 'Unknown',
                    color: tile.color || '#808080',
                    playerRank: tile.ownerRank || 'Lowly Vassal',
                };
            }
            ownerMap[tile.ownerId].tileCount++;
        });

        // 3. Check captured territories in this area
        // Query captured territories and count enclosed squares that fall in this geohash-5
        const capturedSnap = await db.collection('captured')
            .where('isActive', '==', true)
            .get();

        // For each captured territory, count enclosed squares whose geohash starts with geohash5
        // We don't have geohash on enclosed squares directly, so we check if the territory owner
        // has tiles in this geohash area (simpler heuristic: use the tile count from the owner)
        const capturedCounts: Record<string, number> = {};
        capturedSnap.forEach(doc => {
            const territory = doc.data();
            if (!territory.ownerId) return;
            // Only count if this owner has presence in this geohash area
            if (ownerMap[territory.ownerId]) {
                capturedCounts[territory.ownerId] =
                    (capturedCounts[territory.ownerId] || 0) +
                    (territory.enclosedSquares?.length || 0);
            }
        });

        // 4. Compute scores: tiles + (captured × 2)
        const allScores: Record<string, number> = {};
        const scoredPlayers = Object.entries(ownerMap).map(([playerId, data]) => {
            const capturedArea = capturedCounts[playerId] || 0;
            const score = data.tileCount + (capturedArea * 2);
            allScores[playerId] = score;
            return {
                playerId,
                explorerName: data.explorerName,
                color: data.color,
                playerRank: data.playerRank,
                score,
            };
        });

        // Sort descending by score
        scoredPlayers.sort((a, b) => b.score - a.score);

        // Top 10
        const topPlayers = scoredPlayers.slice(0, 10);

        // 5. Write cache
        await cacheRef.set({
            topPlayers,
            allScores,
            updatedAt: Date.now(),
        });

        // 6. Find caller's rank
        const callerScore = allScores[callerId] || 0;
        const callerInTop = topPlayers.find(p => p.playerId === callerId);
        const callerRank = callerInTop
            ? topPlayers.indexOf(callerInTop) + 1
            : scoredPlayers.findIndex(p => p.playerId === callerId) + 1 || scoredPlayers.length + 1;

        return {
            topPlayers,
            callerRank: callerRank || scoredPlayers.length + 1,
            callerScore,
        };

    } catch (error) {
        console.error("Neighborhood leaderboard failed", error);
        throw new functions.https.HttpsError(
            'internal',
            'Unable to compute neighborhood leaderboard',
            error
        );
    }
});
export * from './unansweredOffers';
export * from './ceremony';
export * from './notifications';
export * from './playerActivity';
export * from './sacredZones';
export * from './deleteGameInformation';
export * from './verifyPurchase';
