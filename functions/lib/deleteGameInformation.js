"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGameInformation = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.deleteGameInformation = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }
    const uid = context.auth.uid;
    const bulkWriter = db.bulkWriter();
    try {
        // 1. Delete all user tiles
        const tilesSnap = await db.collection('tiles').where('ownerId', '==', uid).get();
        tilesSnap.forEach(doc => bulkWriter.delete(doc.ref));
        // 2. Delete all user captures
        const capturesSnap = await db.collection('captured').where('ownerId', '==', uid).get();
        capturesSnap.forEach(doc => bulkWriter.delete(doc.ref));
        // 3. Delete offers where user is buyer or seller
        const buyerOffersSnap = await db.collection('offers').where('buyerId', '==', uid).get();
        buyerOffersSnap.forEach(doc => bulkWriter.delete(doc.ref));
        const sellerOffersSnap = await db.collection('offers').where('sellerId', '==', uid).get();
        sellerOffersSnap.forEach(doc => bulkWriter.delete(doc.ref));
        // 4. Delete ceremonies
        const ceremoniesSnap = await db.collection('ceremonies').where('ownerId', '==', uid).get();
        ceremoniesSnap.forEach(doc => bulkWriter.delete(doc.ref));
        // 5. Reset Player Doc (keeping referral data, name, color unharmed)
        const playerRef = db.collection('players').doc(uid);
        bulkWriter.set(playerRef, {
            rank: 'Lowly Vassal',
            balance: 100,
            totalClaims: 0,
            totalCaptured: 0,
            unansweredForfeitCount: 0,
            isInactive: false
        }, { merge: true });
        // Await completion of all bulk operations
        await bulkWriter.close();
        return { success: true, message: 'Game information successfully deleted.' };
    }
    catch (error) {
        console.error(`[DeleteGameInformation] Failed for user ${uid}:`, error);
        throw new functions.https.HttpsError('internal', 'Failed to delete game information.', error.message);
    }
});
//# sourceMappingURL=deleteGameInformation.js.map