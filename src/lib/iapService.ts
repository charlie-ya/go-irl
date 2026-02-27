/**
 * IAP Service — Scaffolding for cordova-plugin-purchase.
 *
 * This module does NOT require cordova-plugin-purchase to be installed.
 * All calls are guarded behind availability checks. Once the plugin is 
 * installed and products are registered in Play Store / App Store,
 * the real purchase flow will activate automatically.
 */

import { Capacitor } from '@capacitor/core';

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

    // TODO: When cordova-plugin-purchase is installed:
    // CdvPurchase.store.register([...products]);
    // CdvPurchase.store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
    console.log('[IAP] Native platform — IAP scaffold ready (plugin not yet installed)');
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

    // TODO: When cordova-plugin-purchase is installed:
    // const product = CdvPurchase.store.get(productId);
    // if (product) { CdvPurchase.store.order(product); }
    // Handle receipt validation via Firebase Cloud Function
    // On success: increment player balance in Firestore

    console.log(`[IAP] Purchase initiated for ${productId} (${pack.coins} coins) — plugin not yet installed`);
    alert('Store products are not yet configured. IAP will be available in a future update.');
    return false;
}
