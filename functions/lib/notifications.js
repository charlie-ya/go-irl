"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOfferCreated = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.onOfferCreated = functions.firestore
    .document('offers/{offerId}')
    .onCreate(async (snap, context) => {
    var _a;
    const offer = snap.data();
    if (!offer)
        return;
    const sellerId = offer.sellerId;
    const buyerId = offer.buyerId;
    const amount = offer.amount;
    if (!sellerId || !buyerId)
        return;
    try {
        // Get seller data to check for FCM tokens
        const sellerRef = db.collection('players').doc(sellerId);
        const sellerSnap = await sellerRef.get();
        if (!sellerSnap.exists)
            return;
        const sellerData = sellerSnap.data();
        const fcmTokens = sellerData === null || sellerData === void 0 ? void 0 : sellerData.fcmTokens;
        // If the seller hasn't opted in / has no tokens, we do nothing
        if (!fcmTokens || fcmTokens.length === 0) {
            console.log(`Seller ${sellerId} has no FCM tokens. Skipping push notification.`);
            return;
        }
        // Get buyer data for their name
        const buyerSnap = await db.collection('players').doc(buyerId).get();
        const buyerName = ((_a = buyerSnap.data()) === null || _a === void 0 ? void 0 : _a.explorerName) || 'Another explorer';
        // Construct the push notification payload
        const payload = {
            notification: {
                title: "Incoming Offer! 🤝",
                body: `${buyerName} offered you ${amount} coins for your square.`,
            },
            data: {
                type: "new_offer",
                offerId: context.params.offerId,
                tileKey: offer.tileKey
            },
            tokens: fcmTokens
        };
        // Send to all registered devices for this user
        const response = await admin.messaging().sendEachForMulticast(payload);
        // Cleanup stale tokens if any failed
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                var _a;
                if (!resp.success) {
                    const errorCode = (_a = resp.error) === null || _a === void 0 ? void 0 : _a.code;
                    // Token might be invalid, unregistered, etc.
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        failedTokens.push(fcmTokens[idx]);
                    }
                }
            });
            if (failedTokens.length > 0) {
                console.log(`Cleaning up ${failedTokens.length} stale FCM tokens for user ${sellerId}`);
                await sellerRef.update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
                });
            }
        }
        console.log(`Successfully sent offer notification to seller ${sellerId}`);
    }
    catch (error) {
        console.error(`Error sending push notification for offer ${context.params.offerId}:`, error);
    }
});
//# sourceMappingURL=notifications.js.map