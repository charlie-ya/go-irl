"use strict";
/**
 * verifyPurchase — Server-side IAP receipt verification.
 *
 * Flow:
 *   Client (iapService.ts) sends { receipt, productId, platform } after the
 *   native store marks a transaction "approved".
 *
 *   This function:
 *   1. Validates the receipt with Apple App Store or Google Play Developer API
 *   2. Checks for replay attacks (receipt already consumed in Firestore)
 *   3. Credits the correct coin amount to the player's balance atomically
 *   4. Logs the transaction for audit purposes
 *   5. Returns { success, coinsAwarded } to the client
 *
 * Environment variables required (set via Secret Manager):
 *   APPLE_SHARED_SECRET  — from App Store Connect > App > In-App Purchases > Shared Secret
 *   GOOGLE_SERVICE_ACCOUNT_KEY_JSON — Base64-encoded service account JSON
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPurchase = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const https = require("https");
const params_1 = require("firebase-functions/params");
const appleSecret = (0, params_1.defineSecret)("APPLE_SHARED_SECRET");
const googleKey = (0, params_1.defineSecret)("GOOGLE_SERVICE_ACCOUNT_KEY_JSON");
const db = admin.firestore();
// --- Coin amounts per product ---
const COIN_AMOUNTS = {
    coins_starter: 100,
    coins_explorer: 550, // 500 + 50 bonus
    coins_adventurer: 1400, // 1200 + 200 bonus
    coins_expedition: 3600, // 3000 + 600 bonus
};
// --- Apple App Store verification ---
async function verifyAppleReceipt(receipt) {
    const appleSharedSecret = appleSecret.value();
    if (!appleSharedSecret) {
        console.error("[verifyPurchase] APPLE_SHARED_SECRET not configured.");
        throw new functions.https.HttpsError("internal", "Apple IAP not configured.");
    }
    const body = JSON.stringify({
        "receipt-data": receipt,
        "password": appleSharedSecret,
        "exclude-old-transactions": true,
    });
    // Try production first, fall back to sandbox on status 21007
    const verifyWithEnvironment = async (isSandbox) => {
        const host = isSandbox
            ? "sandbox.itunes.apple.com"
            : "buy.itunes.apple.com";
        return new Promise((resolve, reject) => {
            const req = https.request({ hostname: host, path: "/verifyReceipt", method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch (e) {
                        reject(new Error("Invalid Apple response"));
                    }
                });
            });
            req.on("error", reject);
            req.write(body);
            req.end();
        });
    };
    let response = await verifyWithEnvironment(false);
    // Status 21007 means the receipt is from sandbox — retry against sandbox
    if (response.status === 21007) {
        response = await verifyWithEnvironment(true);
    }
    if (response.status !== 0) {
        console.warn("[verifyPurchase] Apple returned status:", response.status);
        return { valid: false };
    }
    // Get the most recent in-app purchase
    const latestReceipts = response.latest_receipt_info || [];
    const latest = latestReceipts[latestReceipts.length - 1];
    if (!latest)
        return { valid: false };
    return {
        valid: true,
        productId: latest.product_id,
        transactionId: latest.transaction_id,
    };
}
// --- Google Play verification ---
async function verifyGoogleReceipt(receipt, productId) {
    var _a;
    // The Google Play Developer API requires OAuth2 service account credentials.
    const keyJson = googleKey.value();
    if (!keyJson || keyJson === 'NOT_CONFIGURED') {
        console.warn("[verifyPurchase] GOOGLE_SERVICE_ACCOUNT_KEY_JSON not configured — Android billing not yet enabled.");
        return { valid: false };
    }
    // Dynamically import googleapis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { google } = require("googleapis");
    const serviceAccount = JSON.parse(Buffer.from(keyJson, "base64").toString("utf8"));
    const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const androidPublisher = google.androidpublisher({ version: "v3", auth });
    const packageName = "com.goirl.app";
    try {
        const res = await androidPublisher.purchases.products.get({
            packageName,
            productId,
            token: receipt,
        });
        const purchase = res.data;
        // purchaseState: 0 = Purchased, 1 = Cancelled, 2 = Pending
        if (purchase.purchaseState !== 0) {
            return { valid: false };
        }
        return {
            valid: true,
            productId: (_a = purchase.productId) !== null && _a !== void 0 ? _a : productId,
            transactionId: purchase.orderId,
        };
    }
    catch (e) {
        console.error("[verifyPurchase] Google Play API error:", e.message);
        return { valid: false };
    }
}
// --- Main Cloud Function ---
// Google key is optional — can be added later when Android billing is ready.
// When absent or set to NOT_CONFIGURED, Android purchases return a graceful error.
exports.verifyPurchase = functions.runWith({
    secrets: [appleSecret, googleKey]
}).https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    // 1. Authenticate
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to verify a purchase.");
    }
    const uid = context.auth.uid;
    const { receipt, productId, platform } = data;
    // Diagnostic log — shows exactly what the client sent
    console.log('[verifyPurchase] Received data:', JSON.stringify({
        hasReceipt: !!receipt,
        receiptLength: (_a = receipt === null || receipt === void 0 ? void 0 : receipt.length) !== null && _a !== void 0 ? _a : 0,
        receiptPreview: receipt ? receipt.substring(0, 80) : 'EMPTY',
        clientProductId: productId || 'EMPTY',
        platform: platform || 'EMPTY',
        uid,
    }));
    if (!receipt || !platform) {
        throw new functions.https.HttpsError("invalid-argument", "receipt and platform are required.");
    }
    // 2. Verify receipt with the appropriate store FIRST.
    // We get the authoritative productId from Apple/Google's response,
    // not from the client (more secure, and fixes bundle-ID vs product-ID mismatch).
    let verificationResult;
    if (platform === "ios") {
        verificationResult = await verifyAppleReceipt(receipt);
    }
    else if (platform === "android") {
        verificationResult = await verifyGoogleReceipt(receipt, productId);
    }
    else {
        throw new functions.https.HttpsError("invalid-argument", "Unknown platform.");
    }
    if (!verificationResult.valid) {
        console.warn(`[verifyPurchase] Invalid receipt for uid=${uid}`);
        return { success: false, coinsAwarded: 0, message: "Receipt validation failed." };
    }
    // Use the verified productId from Apple/Google — not the client-sent value
    const verifiedProductId = (_b = verificationResult.productId) !== null && _b !== void 0 ? _b : productId;
    console.log(`[verifyPurchase] Verified productId from store: ${verifiedProductId}`);
    const coinsToAward = COIN_AMOUNTS[verifiedProductId];
    if (coinsToAward === undefined) {
        console.warn(`[verifyPurchase] Unknown productId after verification: ${verifiedProductId}`);
        return { success: false, coinsAwarded: 0, message: `Unknown product: ${verifiedProductId}` };
    }
    const transactionId = (_c = verificationResult.transactionId) !== null && _c !== void 0 ? _c : receipt.substring(0, 64);
    // 3. Replay attack check — has this transaction been credited already?
    const txRef = db.collection("iap_transactions").doc(transactionId);
    try {
        await db.runTransaction(async (tx) => {
            const txDoc = await tx.get(txRef);
            if (txDoc.exists) {
                throw new functions.https.HttpsError("already-exists", "This transaction has already been processed.");
            }
            // 4. Credit coins atomically
            const playerRef = db.collection("players").doc(uid);
            tx.update(playerRef, {
                balance: admin.firestore.FieldValue.increment(coinsToAward),
            });
            // 5. Record transaction to prevent replay
            tx.set(txRef, {
                uid,
                productId,
                platform,
                coinsAwarded: coinsToAward,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
    }
    catch (e) {
        if (e.code === "already-exists" || ((_d = e.message) === null || _d === void 0 ? void 0 : _d.includes("already been processed"))) {
            // Idempotent — the client may retry after a network hiccup
            console.log(`[verifyPurchase] Duplicate transaction for uid=${uid}: ${transactionId}`);
            return { success: true, coinsAwarded: 0, message: "Already credited." };
        }
        console.error("[verifyPurchase] Transaction failed:", e);
        throw new functions.https.HttpsError("internal", "Failed to credit coins.");
    }
    console.log(`[verifyPurchase] Credited ${coinsToAward} coins to uid=${uid} for ${productId} (txId=${transactionId})`);
    return { success: true, coinsAwarded: coinsToAward };
});
//# sourceMappingURL=verifyPurchase.js.map