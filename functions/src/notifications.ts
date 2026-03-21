import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onOfferCreated = functions.firestore
    .document('offers/{offerId}')
    .onCreate(async (snap, context) => {
        const offer = snap.data();
        if (!offer) return;

        const sellerId = offer.sellerId;
        const buyerId = offer.buyerId;
        const amount = offer.amount;

        if (!sellerId || !buyerId) return;

        try {
            // Get seller data to check for FCM tokens
            const sellerRef = db.collection('players').doc(sellerId);
            const sellerSnap = await sellerRef.get();
            
            if (!sellerSnap.exists) return;
            const sellerData = sellerSnap.data();
            
            const fcmTokens = sellerData?.fcmTokens as string[] | undefined;
            
            // If the seller hasn't opted in / has no tokens, we do nothing
            if (!fcmTokens || fcmTokens.length === 0) {
                console.log(`Seller ${sellerId} has no FCM tokens. Skipping push notification.`);
                return;
            }

            // Get buyer data for their name
            const buyerSnap = await db.collection('players').doc(buyerId).get();
            const buyerName = buyerSnap.data()?.explorerName || 'Another explorer';

            // Construct the push notification payload
            const payload: admin.messaging.MulticastMessage = {
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
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        // Token might be invalid, unregistered, etc.
                        if (
                            errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered'
                        ) {
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
        } catch (error) {
            console.error(`Error sending push notification for offer ${context.params.offerId}:`, error);
        }
    });
