import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const enactUnansweredOffers = functions.pubsub.schedule("every 1 hours").onRun(async (context) => {
    const now = Date.now();
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    const thresholdDate = now - FIVE_DAYS_MS;

    const offersRef = db.collection('offers');
    
    // Create query for pending offers older than 5 days
    // Because createdAt is a number (timestamp in ms) in our frontend `makeOffer`,
    // we query where it's less than our threshold date.
    const q = offersRef
        .where('status', '==', 'pending')
        .where('createdAt', '<', thresholdDate);

    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log("No unanswered offers found.");
        return null;
    }

    console.log(`Found ${snapshot.size} unanswered offers to process.`);

    // (Used below for cleanup)
    let processedCount = 0;
    let failedCount = 0;

    for (const offerDoc of snapshot.docs) {
        const offer = offerDoc.data();
        const offerId = offerDoc.id;
        
        try {
            await db.runTransaction(async (transaction) => {
                // Re-read offer to ensure it hasn't changed
                const freshOfferSnap = await transaction.get(offerDoc.ref);
                if (!freshOfferSnap.exists) throw new Error("Offer no longer exists");
                
                const freshOffer = freshOfferSnap.data();
                if (freshOffer?.status !== 'pending') throw new Error("Offer is no longer pending");
                
                const tileRef = db.collection('tiles').doc(freshOffer.tileKey);
                const tileSnap = await transaction.get(tileRef);
                
                if (!tileSnap.exists) {
                    // Tile deleted - just clean up offer
                    transaction.delete(offerDoc.ref);
                    return;
                }
                
                const tile = tileSnap.data();
                if (tile?.ownerId !== freshOffer.sellerId) {
                    // Seller no longer owns the tile - clean up offer
                    transaction.delete(offerDoc.ref);
                    return;
                }

                const buyerRef = db.collection('players').doc(freshOffer.buyerId);
                const buyerSnap = await transaction.get(buyerRef);
                
                if (!buyerSnap.exists) {
                    // Buyer deleted account - clean up offer
                    transaction.delete(offerDoc.ref);
                    return;
                }
                
                const buyer = buyerSnap.data();
                const halvedAmount = Math.floor(freshOffer.amount / 2);
                
                if (buyer!.balance < halvedAmount) {
                    // Buyer doesn't have enough balance even for the discounted amount. 
                    // Reject offer since they can't pay.
                    transaction.delete(offerDoc.ref);
                    return;
                }

                const sellerRef = db.collection('players').doc(freshOffer.sellerId);

                // --- ALL CHECKS PASSED, EXECUTE TRANSACTION ---
                
                // 1. Transfer Tile
                transaction.update(tileRef, {
                    ownerId: freshOffer.buyerId,
                    explorerName: buyer!.explorerName,
                    color: buyer!.color,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });

                const sellerSnap = await transaction.get(sellerRef);
                const seller = sellerSnap.data();
                
                // Track forfeiture inactivity
                const newForfeitCount = (seller?.unansweredForfeitCount || 0) + 1;
                const becomesInactive = newForfeitCount >= 3 && !seller?.isInactive;

                // 2. Adjust Balances
                transaction.update(buyerRef, {
                    balance: admin.firestore.FieldValue.increment(-halvedAmount),
                    totalClaims: admin.firestore.FieldValue.increment(1)
                });
                
                transaction.update(sellerRef, {
                    balance: admin.firestore.FieldValue.increment(halvedAmount),
                    totalClaims: admin.firestore.FieldValue.increment(-1),
                    unansweredForfeitCount: admin.firestore.FieldValue.increment(1),
                    ...(becomesInactive ? { isInactive: true } : {})
                });

                // 3. Delete the enacted offer
                transaction.delete(offerDoc.ref);
            });
            
            processedCount++;
            
            // Clean up any OTHER pending offers on the same tile since ownership changed
            // We do this outside the transaction to keep the transaction scoped to the core entities
            const otherOffersQ = offersRef
                .where('tileKey', '==', offer.tileKey)
                .where('status', '==', 'pending');
            const otherOffersSnap = await otherOffersQ.get();
            
            if (!otherOffersSnap.empty) {
                const cleanupBatch = db.batch();
                otherOffersSnap.docs.forEach(doc => {
                    // Don't delete the one we just processed (though it should already be gone)
                    if (doc.id !== offerId) {
                        cleanupBatch.delete(doc.ref);
                    }
                });
                await cleanupBatch.commit();
            }

        } catch (error) {
            console.error(`Error processing offer ${offerId}:`, error);
            failedCount++;
        }
    }

    console.log(`Unanswered offers task complete. Processed: ${processedCount}. Failed: ${failedCount}.`);
    return null;
});
