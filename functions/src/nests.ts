import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// 5 days in milliseconds
const MOVE_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Creates or moves a nest.
 * Costs 0 coins. Limits moves to once every 5 days.
 */
export const createOrMoveNest = functions.https.onCall(async (request: any) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const uid = request.auth.uid;
    const { lat, lng, geohash, title } = request.data;

    if (!lat || !lng || !geohash) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing location data.');
    }

    const nestRef = db.collection('nests').doc(uid);
    const nestDoc = await nestRef.get();

    if (nestDoc.exists) {
        const data = nestDoc.data();
        const lastMoved = data?.lastMovedAt || data?.establishedAt || 0;
        if (Date.now() - lastMoved < MOVE_COOLDOWN_MS) {
            throw new functions.https.HttpsError(
                'failed-precondition', 
                'You can only move your nest once every 5 days.'
            );
        }

        // Delete all visits when moving nest
        const visitsSnap = await nestRef.collection('visits').get();
        const batch = db.batch();
        visitsSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Move existing nest
        await nestRef.update({
            location: new admin.firestore.GeoPoint(lat, lng),
            geohash,
            title: title || data?.title || "Nest",
            lastMovedAt: Date.now(),
            totalUniqueVisitors: 0 // Reset visitors count
        });
        return { success: true, message: "Nest moved successfully!" };
    } else {
        // Create new nest
        await nestRef.set({
            ownerId: uid,
            location: new admin.firestore.GeoPoint(lat, lng),
            geohash,
            title: title || "Nest",
            establishedAt: Date.now(),
            lastMovedAt: Date.now(),
            level: 1,
            totalUniqueVisitors: 0
        });
        return { success: true, message: "Nest established!" };
    }
});

/**
 * Upgrades a nest.
 * Level 2 costs 500 coins. Level 3 costs 1000 coins.
 */
export const upgradeNest = functions.https.onCall(async (request: any) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const uid = request.auth.uid;

    const nestRef = db.collection('nests').doc(uid);
    const playerRef = db.collection('players').doc(uid);

    return db.runTransaction(async (transaction) => {
        const nestDoc = await transaction.get(nestRef);
        const playerDoc = await transaction.get(playerRef);

        if (!nestDoc.exists) throw new functions.https.HttpsError('not-found', 'Nest not found.');
        if (!playerDoc.exists) throw new functions.https.HttpsError('not-found', 'Player not found.');

        const currentLevel = nestDoc.data()?.level || 1;
        const currentCoins = playerDoc.data()?.coins || 0;

        let cost = 0;
        let newLevel = currentLevel;

        if (currentLevel === 1) {
            cost = 500;
            newLevel = 2;
        } else if (currentLevel === 2) {
            cost = 1000;
            newLevel = 3;
        } else {
            throw new functions.https.HttpsError('failed-precondition', 'Nest is already max level.');
        }

        if (currentCoins < cost) {
            throw new functions.https.HttpsError('failed-precondition', 'Not enough coins.');
        }

        transaction.update(playerRef, { coins: admin.firestore.FieldValue.increment(-cost) });
        transaction.update(nestRef, { level: newLevel });

        return { success: true, newLevel, cost };
    });
});

/**
 * Logs a visit to a nest.
 * Rewards both visitor and owner based on the nest level.
 * Cooldown: 1 visit per nest per day.
 */
export const visitNest = functions.https.onCall(async (request: any) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const visitorId = request.auth.uid;
    const { nestId, visitorName } = request.data;

    if (!nestId) throw new functions.https.HttpsError('invalid-argument', 'Missing nestId.');
    if (visitorId === nestId) throw new functions.https.HttpsError('invalid-argument', 'You cannot visit your own nest.');

    const nestRef = db.collection('nests').doc(nestId);
    const visitRef = nestRef.collection('visits').doc(visitorId);
    
    const ownerRef = db.collection('players').doc(nestId);
    const visitorRef = db.collection('players').doc(visitorId);

    return db.runTransaction(async (transaction) => {
        const nestDoc = await transaction.get(nestRef);
        if (!nestDoc.exists) throw new functions.https.HttpsError('not-found', 'Nest not found.');

        const visitDoc = await transaction.get(visitRef);
        const now = Date.now();

        // Check 24-hour cooldown
        if (visitDoc.exists) {
            const lastVisited = visitDoc.data()?.visitedAt || 0;
            if (now - lastVisited < 24 * 60 * 60 * 1000) {
                throw new functions.https.HttpsError('failed-precondition', 'You can only visit a nest once every 24 hours.');
            }
        }

        const isFirstVisit = !visitDoc.exists;
        const nestLevel = nestDoc.data()?.level || 1;

        let visitorReward = 0;
        let ownerReward = 0;

        if (nestLevel === 1) {
            visitorReward = 5;
            ownerReward = 0;
        } else if (nestLevel === 2) {
            visitorReward = 10;
            ownerReward = 5;
        } else if (nestLevel === 3) {
            visitorReward = 20;
            ownerReward = 10;
        }

        // Update visitor guestbook entry
        transaction.set(visitRef, {
            visitorId,
            visitorName: visitorName || 'Unknown Explorer',
            visitedAt: now,
            isFirstVisit
        });

        // Update nest stats
        if (isFirstVisit) {
            transaction.update(nestRef, { totalUniqueVisitors: admin.firestore.FieldValue.increment(1) });
        }

        // Give coins
        if (visitorReward > 0) {
            transaction.update(visitorRef, { coins: admin.firestore.FieldValue.increment(visitorReward) });
        }
        if (ownerReward > 0) {
            transaction.update(ownerRef, { coins: admin.firestore.FieldValue.increment(ownerReward) });
        }

        return { 
            success: true, 
            visitorReward, 
            ownerReward, 
            message: `You signed the guestbook and earned ${visitorReward} coins!` 
        };
    });
});
