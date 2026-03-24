"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlayerActivityChange = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.onPlayerActivityChange = functions.firestore
    .document('players/{userId}')
    .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const before = change.before.data();
    const after = change.after.data();
    // Only trigger if isInactive field actually changed
    if (before.isInactive === after.isInactive) {
        return null;
    }
    console.log(`Player ${userId} isInactive changed from ${before.isInactive} to ${after.isInactive}`);
    try {
        // Find all claimed (or moribund) tiles owned by this player
        // We ignore captured tiles inherently by checking equality, but Firestore doesn't easily let us query "where field does not exist".
        // However, we CAN query all tiles completely, and filter them locally.
        // Since this happens very rarely, scanning a user's tiles is relatively cheap (e.g. 1000 reads = $0.0003).
        const tilesRef = db.collection('tiles');
        const q = tilesRef.where('ownerId', '==', userId);
        const snapshot = await q.get();
        let batch = db.batch();
        let operationCount = 0;
        let totalUpdated = 0;
        for (const doc of snapshot.docs) {
            const tileData = doc.data();
            // NEVER touch purely captured territories. They remain captured forever.
            if (tileData.status === 'captured') {
                continue;
            }
            if (after.isInactive === true) {
                // Becoming Moribund
                batch.update(doc.ref, { status: 'moribund' });
            }
            else {
                // Rejuvenation: remove moribund status to revert to standard "claimed"
                batch.update(doc.ref, { status: admin.firestore.FieldValue.delete() });
            }
            operationCount++;
            totalUpdated++;
            // Commit batch every 490 operations
            if (operationCount >= 490) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        }
        // Commit any lingering writes
        if (operationCount > 0) {
            await batch.commit();
        }
        console.log(`Successfully updated ${totalUpdated} tiles for player ${userId}.`);
        // If they just became inactive, send a push notification warning them!
        if (after.isInactive === true && after.fcmTokens && after.fcmTokens.length > 0) {
            const message = {
                notification: {
                    title: "You've gone dormant! 🏚️",
                    body: "Your squares have faded to Moribund. Open the app to rejuvenate your empire!"
                },
                data: {
                    type: "moribund_alert"
                },
                tokens: after.fcmTokens
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`Moribund alert sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
        }
    }
    catch (error) {
        console.error(`Error processing isInactive change for player ${userId}:`, error);
    }
    return null;
});
//# sourceMappingURL=playerActivity.js.map