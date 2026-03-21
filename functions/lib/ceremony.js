"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeCeremony = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
/**
 * completeCeremony — callable Cloud Function
 * Validates the ceremony has 9+ affirmations, then promotes the owner.
 */
exports.completeCeremony = functions.https.onCall(async (request) => {
    var _a;
    // 1. Auth check
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }
    const uid = request.auth.uid;
    const gridKey = request.data.gridKey;
    if (!gridKey || typeof gridKey !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Must provide a valid "gridKey" argument.');
    }
    try {
        const ceremonyRef = db.collection('ceremonies').doc(gridKey);
        const ceremonyDoc = await ceremonyRef.get();
        if (!ceremonyDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'No active ceremony found for this location.');
        }
        const ceremony = ceremonyDoc.data();
        // 2. Verify caller is the ceremony owner
        if (ceremony.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only the ceremony owner can complete the promotion.');
        }
        // 3. Verify ceremony is still active
        if (ceremony.status !== 'active') {
            throw new functions.https.HttpsError('failed-precondition', 'This ceremony is no longer active.');
        }
        // 4. Verify 9+ affirmations (owner is auto-counted as #1, so 9 others = 10 total)
        const affirmations = ceremony.affirmations || [];
        if (affirmations.length < 9) {
            throw new functions.https.HttpsError('failed-precondition', `Need ${9 - affirmations.length} more affirmations (${affirmations.length}/9).`);
        }
        // 5. Determine the new rank based on current rank
        const playerRef = db.collection('players').doc(uid);
        const playerDoc = await playerRef.get();
        if (!playerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Player profile not found.');
        }
        const currentRank = ((_a = playerDoc.data()) === null || _a === void 0 ? void 0 : _a.rank) || 'Lowly Vassal';
        const getRankValue = (r) => {
            if (r === 'Centurion')
                return 3;
            if (r === 'Minion')
                return 2;
            return 1;
        };
        // Promote to the next rank
        let newRank;
        if (currentRank === 'Lowly Vassal') {
            newRank = 'Minion';
        }
        else if (currentRank === 'Minion') {
            newRank = 'Centurion';
        }
        else {
            throw new functions.https.HttpsError('failed-precondition', 'You are already at the highest rank!');
        }
        // Safety: only promote if this actually increases your rank
        if (getRankValue(newRank) <= getRankValue(currentRank)) {
            throw new functions.https.HttpsError('failed-precondition', `Cannot promote from ${currentRank} to ${newRank}.`);
        }
        // 6. Execute the promotion
        // Use a batch to atomically update both documents
        const batch = db.batch();
        // Update player rank
        batch.update(playerRef, { rank: newRank });
        // Mark ceremony as completed
        batch.update(ceremonyRef, {
            status: 'completed',
            completedAt: Date.now(),
            newRank,
        });
        await batch.commit();
        return {
            success: true,
            newRank,
            participantCount: affirmations.length + 1, // +1 for owner
            message: `🎉 Congratulations! You have ascended to ${newRank}!`,
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error("completeCeremony failed:", error);
        throw new functions.https.HttpsError('internal', 'Failed to complete the ceremony.', error);
    }
});
//# sourceMappingURL=ceremony.js.map