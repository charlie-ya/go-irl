/**
 * IAP Service — cordova-plugin-purchase integration.
 *
 * Flow:
 *   approved -> POST receipt to verifyPurchase Cloud Function -> server validates
 *              with Apple/Google API and credits coins -> verified -> finish()
 */

import { Capacitor } from '@capacitor/core';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Import local assets for CoinShop
import imgStarter from '../assets/images/coins_starter_roamin_empire.png';
import imgExplorer from '../assets/images/coins_explorer_roamin_empire.png';
import imgAdventurer from '../assets/images/coins_adventurer_roamin_empire.png';
import imgExpedition from '../assets/images/coins_expedition_roamin_empire.png';

// Tell TypeScript the CdvPurchase global will be injected dynamically by Capacitor
declare var CdvPurchase: any;

// --- Dev-only logging (stripped in production builds) ---
const log = import.meta.env.PROD ? () => {} : console.log.bind(console, '[IAP]');

// --- Types ---

export interface CoinPack {
    productId: string;
    label: string;
    coins: number;
    bonusLabel?: string;
    badge?: string;
    image: string;
}

// --- Product Definitions ---

export const COIN_PACKS: CoinPack[] = [
    {
        productId: 'coins_starter',
        label: 'Starter Pack',
        coins: 100,
        image: imgStarter,
    },
    {
        productId: 'coins_explorer',
        label: 'Explorer Pack',
        coins: 500,
        bonusLabel: '+50 bonus',
        badge: 'Most Popular',
        image: imgExplorer,
    },
    {
        productId: 'coins_adventurer',
        label: 'Adventurer Pack',
        coins: 1200,
        bonusLabel: '+200 bonus',
        image: imgAdventurer,
    },
    {
        productId: 'coins_expedition',
        label: 'Expedition Pack',
        coins: 3000,
        bonusLabel: '+600 bonus',
        badge: 'Best Value',
        image: imgExpedition,
    },
];

// --- Platform Check ---

/**
 * Returns true only on native platform where IAP plugin is expected.
 * Does NOT check if the plugin is actually installed (that happens at purchase time).
 */
export function isIAPAvailable(): boolean {
    return Capacitor.isNativePlatform();
}

// --- Live price lookup ---

/**
 * Returns the localized price string for a product from the CdvPurchase store,
 * e.g. "$0.99", "€3.49". Falls back to undefined if the store is not yet loaded
 * or the product is not registered.
 */
export function getStorePrice(productId: string): string | undefined {
    try {
        if (typeof CdvPurchase === 'undefined') return undefined;
        const product = CdvPurchase.store.get(productId);
        // CdvPurchase v13 pricing — first offer's first pricingPhase
        return product?.offers?.[0]?.pricingPhases?.[0]?.price ?? undefined;
    } catch {
        return undefined;
    }
}

// --- Initialize ---

export function initializeIAP(): void {
    if (!isIAPAvailable()) {
        log('Web platform — IAP disabled');
        return;
    }

    if (typeof CdvPurchase === 'undefined') {
        console.warn('[IAP] CdvPurchase global not found. Ensure running on physical device.');
        return;
    }

    const store = CdvPurchase.store;
    const { ProductType, Platform } = CdvPurchase;

    // Register all configured products against both native stores
    COIN_PACKS.forEach(pack => {
        store.register({
            id: pack.productId,
            type: ProductType.CONSUMABLE,
            platform: Platform.APPLE_APPSTORE
        });
        store.register({
            id: pack.productId,
            type: ProductType.CONSUMABLE,
            platform: Platform.GOOGLE_PLAY
        });
    });

    store.error((err: any) => console.error('[IAP] Store Error:', err));
    store.ready(() => log('Native store fully initialized.'));

    // --- Validator: CdvPurchase calls this when transaction.verify() is triggered ---
    // Using store.validator ensures CdvPurchase provides the FULL base64 app receipt
    // (from NSBundle.main.appStoreReceiptURL on iOS), not just the transaction token.
    // Sending just a token causes Apple status 21002 "malformed receipt data".
    store.validator = async (receipt: any, callback: any) => {
        log('Validating receipt for product:', receipt.id);
        try {
            const fns = getFunctions();
            const verifyFn = httpsCallable<
                { receipt: string; productId: string; platform: string },
                { success: boolean; coinsAwarded: number; message?: string }
            >(fns, 'verifyPurchase');

            // CdvPurchase provides the full app receipt for iOS here:
            const receiptData: string =
                receipt.transaction?.appStoreReceipt   // iOS full base64 receipt
                ?? receipt.transaction?.purchaseToken  // Android purchase token
                ?? receipt.transaction?.id             // fallback
                ?? '';

            const result = await verifyFn({
                receipt: receiptData,
                productId: receipt.id ?? '',
                platform: Capacitor.getPlatform(),
            });

            if (result.data.success) {
                callback({ ok: true, data: receipt });
            } else {
                const msg = result.data.message ?? '';
                callback({ ok: false, status: 'receipt-invalid', message: msg });
                if (msg !== 'Already credited.') {
                    alert('Purchase could not be verified. Please contact support if coins are missing.');
                }
            }
        } catch (e: any) {
            console.error('[IAP] Validator error:', e);
            callback({ ok: false, status: 'server-error', message: e.message });
            alert('Purchase verification failed. Your payment was not charged. Please try again.');
        }
    };

    // --- Approved: trigger the validator via transaction.verify() ---
    store.when().approved((transaction: any) => {
        log('Transaction approved — triggering verification:', transaction.transactionId);
        transaction.verify();
    });

    // --- Verified: coins credited on server, finish the transaction ---
    store.when().verified((receipt: any) => {
        log('Receipt verified — finishing transaction.');
        receipt.finish();
        // Coins credited by Cloud Function; Firestore onSnapshot updates balance in real-time.
        alert('Purchase successful! Your coins have been credited. 🪙');

    });

    store.initialize([Platform.APPLE_APPSTORE, Platform.GOOGLE_PLAY]);
    log('Initiating native store boot sequence...');
}

// --- Get Products ---

export function getProducts(): CoinPack[] {
    return COIN_PACKS;
}

// --- Purchase ---

export async function purchasePack(productId: string): Promise<boolean> {
    const pack = COIN_PACKS.find(p => p.productId === productId);
    if (!pack) {
        console.error(`[IAP] Unknown product: ${productId}`);
        return false;
    }

    if (!isIAPAvailable()) {
        log(`Purchase not available on web: ${productId}`);
        alert('In-app purchases are only available in the mobile app.');
        return false;
    }

    if (typeof CdvPurchase === 'undefined') {
        alert('Billing subsystem not available at the moment. Please try again later.');
        return false;
    }

    const product = CdvPurchase.store.get(productId);
    if (!product) {
        console.error(`[IAP] Failed to load product definition from store for ${productId}`);
        alert('The store is still loading. Please wait a moment and try again.');
        return false;
    }

    // CdvPurchase v13: order via the product's first offer
    const offer = product.getOffer();
    if (!offer) {
        console.error(`[IAP] No offer found for product ${productId}`);
        alert('This product has no purchasable offer configured. Please try again later.');
        return false;
    }

    // Trigger the actual native OS billing sheet
    await offer.order();
    log(`Triggering native OS billing sheet for ${productId} (${pack.coins} coins)`);
    return true;
}

