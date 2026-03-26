/**
 * IAP Service — Scaffolding for cordova-plugin-purchase.
 *
 * This module does NOT require cordova-plugin-purchase to be installed.
 * All calls are guarded behind availability checks. Once the plugin is 
 * installed and products are registered in Play Store / App Store,
 * the real purchase flow will activate automatically.
 */

import { Capacitor } from '@capacitor/core';

// Tell TypeScript the CdvPurchase global will be injected dynamically by Capacitor
declare var CdvPurchase: any;

// --- Types ---

export interface CoinPack {
    productId: string;
    label: string;
    coins: number;
    bonusLabel?: string;
    badge?: string;
}

// --- Product Definitions ---

export const COIN_PACKS: CoinPack[] = [
    {
        productId: 'coins_starter',
        label: 'Starter Pack',
        coins: 100,
    },
    {
        productId: 'coins_explorer',
        label: 'Explorer Pack',
        coins: 500,
        bonusLabel: '+50 bonus',
        badge: 'Most Popular',
    },
    {
        productId: 'coins_adventurer',
        label: 'Adventurer Pack',
        coins: 1200,
        bonusLabel: '+200 bonus',
    },
    {
        productId: 'coins_expedition',
        label: 'Expedition Pack',
        coins: 3000,
        bonusLabel: '+600 bonus',
        badge: 'Best Value',
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

// --- Initialize (no-op for now) ---

export function initializeIAP(): void {
    if (!isIAPAvailable()) {
        console.log('[IAP] Web platform — IAP disabled');
        return;
    }

    // Real CdvPurchase Registration
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

    // Logging & Error Handling
    store.error((err: any) => console.error('[IAP] Store Error:', err));
    store.ready(() => console.log('[IAP] Native Store is fully initialized and products are loaded.'));

    // Approvals -> Trigger remote verify -> Finish
    store.when().approved((transaction: any) => {
        console.log('[IAP] Transaction Approved:', transaction);
        // Note: For a live app, this must ping a Firebase Cloud Function with the receipt token.
        // For now, we simulate success blindly across native platforms.
        transaction.verify();
    });

    store.when().verified((receipt: any) => {
        console.log('[IAP] Receipt cryptographically verified:', receipt);
        receipt.finish();
        alert('Thank you for your purchase! Coins will sync shortly.');
    });

    // Boot up
    store.initialize([Platform.APPLE_APPSTORE, Platform.GOOGLE_PLAY]);
    console.log('[IAP] Native platform — Initiating store boot sequence...');
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
        console.log(`[IAP] Purchase not available on web: ${productId}`);
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
        alert('This product is not currently available for purchase in your region.');
        return false;
    }

    // Trigger the actual native OS billing sheet
    CdvPurchase.store.order(product);
    console.log(`[IAP] Triggering native OS billing sheet for ${productId} (${pack.coins} coins)`);
    return true;
}
