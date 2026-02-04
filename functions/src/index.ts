import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Type definition for Rank
type Rank = 'Lowly Vassal' | 'Minion' | 'Centurion';

// Checks for v2 signature where first argument is the Request object
export const requestPromotion = functions.https.onCall(async (request) => {
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
