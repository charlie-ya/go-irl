import { db } from './firebase';
import {
    collection, doc, setDoc, getDocs, getDoc, updateDoc, query, where, increment
} from 'firebase/firestore';

// --- Types ---

export interface Referral {
    id: string;
    referrerId: string;
    referredId: string;
    referrerCode: string;
    status: 'installed' | 'active';
    createdAt: number;
    milestonesAwarded: string[];
}

export interface ReferralStats {
    friendsJoined: number;
    coinsEarned: number;
}

// --- Milestone Definitions ---

const MILESTONES: Record<string, { label: string; coins: number }> = {
    install: { label: 'Friend signed up', coins: 10 },
    tiles_10: { label: 'Friend claimed 10 tiles', coins: 25 },
    first_capture: { label: 'Friend captured territory', coins: 50 },
};

// --- Code Generation ---

/**
 * Generates a deterministic 6-character alphanumeric referral code from a UID.
 * Uses a simple hash — not cryptographically secure, but unique enough for referrals.
 */
export function generateReferralCode(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0; // Force 32-bit integer
    }

    // Convert to base-36 (alphanumeric), take 6 chars, uppercase
    const code = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
    return code;
}

// --- Share ---

// Platform-aware base URL for referral links.
// On native Capacitor, window.location.origin resolves to https://localhost which is unusable.
const REFERRAL_WEB_URL = 'https://go-irl-443f4.web.app';

// Referral links always use the web URL so the ?ref=CODE query param is preserved.
// App Store / Play Store URLs silently discard all query params — the referral code
// would be lost before the new user reaches onboarding.
function getReferralBaseUrl(): string {
    return REFERRAL_WEB_URL;
}

/**
 * Opens the native share sheet (or clipboard fallback) with the referral link.
 */
export async function shareReferralLink(code: string, appUrl?: string): Promise<void> {
    const baseUrl = appUrl || getReferralBaseUrl();
    const referralUrl = `${baseUrl}/?ref=${code}`;
    const shareData = {
        title: "Roamin' Empire",
        text: `Join me on Roamin' Empire! 🏰 Build your real-world territory. Use my friend code ${code} or tap the link:`,
        url: referralUrl,
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(`${shareData.text} ${referralUrl}`);
            alert('Invite link copied to clipboard! 📋');
        }
    } catch (e: any) {
        // User cancelled share — not an error
        if (e.name !== 'AbortError') {
            console.error('Share failed:', e);
        }
    }
}

// --- Apply Referral Code (on new player creation) ---

/**
 * Looks up the referrer by code, creates a referral doc, and awards the install milestone.
 */
export async function applyReferralCode(referrerCode: string, newPlayerId: string): Promise<void> {
    if (!referrerCode || referrerCode.length < 3) return;

    const code = referrerCode.trim().toUpperCase();

    try {
        // Find the referrer by checking all players' codes
        // Since codes are deterministic from UID, we need to find the matching player.
        // Strategy: query all players and compute code client-side.
        // This is O(N) but only runs ONCE per new player signup, and player count is manageable.
        const playersSnap = await getDocs(collection(db, 'players'));
        let referrerId: string | null = null;

        playersSnap.forEach((playerDoc) => {
            if (generateReferralCode(playerDoc.id) === code) {
                referrerId = playerDoc.id;
            }
        });

        if (!referrerId) {
            console.warn(`[Referral] No player found for code: ${code}`);
            return;
        }

        // Don't allow self-referral
        if (referrerId === newPlayerId) {
            console.warn('[Referral] Self-referral blocked');
            return;
        }

        // Check for duplicate referral
        const existingQ = query(
            collection(db, 'referrals'),
            where('referredId', '==', newPlayerId)
        );
        const existingSnap = await getDocs(existingQ);
        if (!existingSnap.empty) {
            console.warn('[Referral] Player already has a referrer');
            return;
        }

        // Create referral doc
        const referralRef = doc(collection(db, 'referrals'));
        const referral: Referral = {
            id: referralRef.id,
            referrerId,
            referredId: newPlayerId,
            referrerCode: code,
            status: 'installed',
            createdAt: Date.now(),
            milestonesAwarded: ['install'],
        };

        await setDoc(referralRef, referral);

        // Award install milestone (10 coins to referrer)
        const referrerRef = doc(db, 'players', referrerId);
        await updateDoc(referrerRef, {
            balance: increment(MILESTONES.install.coins),
        });

        console.log(`[Referral] Created referral: ${referrerId} -> ${newPlayerId} (+${MILESTONES.install.coins} coins to referrer)`);

    } catch (e) {
        console.error('[Referral] Failed to apply referral code:', e);
        // Non-blocking — don't prevent player creation
    }
}

// --- Milestone Checker (called after each claim) ---

/**
 * Checks if the current player has triggered any referral milestones,
 * and awards coins to their referrer. Fire-and-forget.
 */
export async function checkAndAwardReferralMilestones(playerId: string): Promise<void> {
    try {
        // Find the referral doc where this player is the referred
        const q = query(
            collection(db, 'referrals'),
            where('referredId', '==', playerId)
        );
        const snap = await getDocs(q);
        if (snap.empty) return; // Not a referred player

        const referralDoc = snap.docs[0];
        const referral = referralDoc.data() as Referral;

        // Check what's already awarded
        const awarded = new Set(referral.milestonesAwarded);
        const newMilestones: string[] = [];

        // Get referred player's stats
        const playerSnap = await getDoc(doc(db, 'players', playerId));
        if (!playerSnap.exists()) return;
        const playerData = playerSnap.data();

        // tiles_10 milestone
        if (!awarded.has('tiles_10') && (playerData.totalClaims || 0) >= 10) {
            newMilestones.push('tiles_10');
        }

        // first_capture milestone
        if (!awarded.has('first_capture') && (playerData.totalCaptured || 0) >= 1) {
            newMilestones.push('first_capture');
        }

        if (newMilestones.length === 0) return;

        // Award coins and update milestones
        const totalCoins = newMilestones.reduce((sum, m) => sum + (MILESTONES[m]?.coins || 0), 0);

        // Credit referrer
        const referrerRef = doc(db, 'players', referral.referrerId);
        await updateDoc(referrerRef, {
            balance: increment(totalCoins),
        });

        // Update referral doc
        await updateDoc(referralDoc.ref, {
            milestonesAwarded: [...referral.milestonesAwarded, ...newMilestones],
            status: 'active', // Upgrade status once milestones are hit
        });

        console.log(`[Referral] Milestones awarded: ${newMilestones.join(', ')} (+${totalCoins} coins to ${referral.referrerId})`);

    } catch (e) {
        console.error('[Referral] Milestone check failed:', e);
        // Non-blocking
    }
}

// --- Referral Stats ---

/**
 * Fetches referral stats for the current user (as referrer).
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
    try {
        const q = query(
            collection(db, 'referrals'),
            where('referrerId', '==', userId)
        );
        const snap = await getDocs(q);

        let friendsJoined = 0;
        let coinsEarned = 0;

        snap.forEach((d) => {
            friendsJoined++;
            const data = d.data() as Referral;
            const awarded = data.milestonesAwarded || [];
            coinsEarned += awarded.reduce((sum, m) => sum + (MILESTONES[m]?.coins || 0), 0);
        });

        return { friendsJoined, coinsEarned };
    } catch (e) {
        console.error('[Referral] Failed to get stats:', e);
        return { friendsJoined: 0, coinsEarned: 0 };
    }
}

/**
 * Extracts referral code from URL query params (?ref=CODE).
 */
export function getReferralCodeFromURL(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
}
