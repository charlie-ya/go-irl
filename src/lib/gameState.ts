import { useState, useEffect, useRef, useMemo } from 'react';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment, getDocs, deleteDoc, query, where, getCountFromServer, runTransaction, writeBatch } from 'firebase/firestore';


import { findEnclosedAreas, type Territory } from './captureLogic';
import { calculateCaptureBonus } from './captureBonus';
import { getGeohash, getGeohashWithNeighbors, calculateDistance, TILE_LOAD_RADIUS_METERS, LOCATION_UPDATE_THRESHOLD } from './geohashUtils';
import { parseGridKey, getGridKey, getGridFloats, fromGridInt } from './gridSystem';
import { TileStorage } from './tileStorage';
import { applyReferralCode, checkAndAwardReferralMilestones } from './referralService';

import { isPointInExcludedZone, type ExclusionZone } from './exclusionZones';


export interface Tile {
    ownerId: string;
    explorerName: string; // Display name for the owner
    color: string;
    timestamp: number;
    geohash: string;      // Geohash for spatial queries
    latInt: number;       // Integer latitude (matches grid key)
    lngInt: number;       // Integer longitude (matches grid key)
    officialFlower?: string;
    officialBird?: string;
    ownerRank?: string;
    capturedBy?: string;    // Player ID who captured this tile via enclosure
}

export type GameState = Record<string, Tile>;

export interface PlayerState {
    id: string;
    explorerName: string; // User-chosen display name
    color: string;
    balance: number;
    hasCompletedOnboarding: boolean;
    rank: 'Lowly Vassal' | 'Minion' | 'Centurion';
    lastClaimTimestamp?: number; // Anti-Cheat
    lastClaimLat?: number;      // Anti-Cheat
    lastClaimLng?: number;      // Anti-Cheat
    totalClaims?: number;       // Global scoreboard count (Atomic)
    totalCaptured?: number;     // Total territories captured (Atomic)
    officialFlower?: string;
    officialBird?: string;
    isDevMode?: boolean;
    referralCode?: string;
}

export interface PromotionCeremony {
    id: string; // gridKey
    ownerId: string;
    ownerName: string;
    startedAt: number;
    affirmations: string[]; // List of userIds who affirmed
}

export interface Offer {
    id: string; // auto-generated
    tileKey: string;
    sellerId: string; // current owner
    buyerId: string; // person making offer
    amount: number; // offer amount in coins
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: number;
}

export { type Territory };

export function useGameState(userLat?: number, userLng?: number, isMovingTooFast?: boolean, activeZones: ExclusionZone[] = []) {
    const [claims, setClaims] = useState<GameState>({});
    const [player, setPlayer] = useState<PlayerState | null>(null);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [activeCeremony] = useState<PromotionCeremony | null>(null);
    const lastQueryLocation = useRef<{ lat: number; lng: number } | null>(null);
    const hasVerifiedStats = useRef<boolean>(false);

    // Listen to Nearby Tiles (200m radius)
    useEffect(() => {
        if (userLat === undefined || userLng === undefined) {
            // No location yet, don't load tiles
            return;
        }

        // Skip tile loading if moving too fast (in vehicle)
        if (isMovingTooFast) {
            console.log('⚠️ Pausing tile loading - user moving too fast (likely in vehicle)');
            return;
        }

        // Check if we need to update (user moved >50m)
        if (lastQueryLocation.current) {
            const distance = calculateDistance(
                lastQueryLocation.current.lat,
                lastQueryLocation.current.lng,
                userLat,
                userLng
            );
            if (distance < LOCATION_UPDATE_THRESHOLD) {
                // User hasn't moved enough, keep existing listener
                return;
            }
        }

        // Update last query location
        lastQueryLocation.current = { lat: userLat, lng: userLng };

        // Get geohashes for user location + neighbors
        const geohashes = getGeohashWithNeighbors(userLat, userLng);

        // Create listeners for each geohash
        const unsubscribers = geohashes.map(geohash => {
            const q = query(collection(db, "tiles"), where("geohash", "==", geohash));
            return onSnapshot(q, (snapshot) => {
                const newClaims: GameState = {};
                snapshot.forEach(doc => {
                    const tile = doc.data() as Tile;
                    // Filter to exact radius - convert integer coords to float
                    const tileLat = fromGridInt(tile.latInt);
                    const tileLng = fromGridInt(tile.lngInt);
                    const distance = calculateDistance(userLat, userLng, tileLat, tileLng);
                    if (distance <= TILE_LOAD_RADIUS_METERS) {
                        newClaims[doc.id] = tile;
                    }
                });
                // Merge with existing to prevent flicker
                setClaims(prev => ({ ...prev, ...newClaims }));
            });
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [userLat, userLng, isMovingTooFast]);

    // Listen to My Player Data
    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const playerRef = doc(db, "players", uid);

        const unsub = onSnapshot(playerRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as PlayerState;
                setPlayer(data);

                // Self-Healing: Backfill totalClaims & totalCaptured if missing
                // Now checks for both fields and backfills optimally
                // Self-Healing: Verify totalClaims & totalCaptured against source of truth
                // We verify this periodically (or on load) to correct any drift/bugs.
                // This is cheap (aggregation queries) and ensures 100% accuracy.
                const verifyStats = async () => {
                    try {
                        const updates: any = {};

                        // 1. Verify Claims Count
                        const qTiles = query(collection(db, "tiles"), where("ownerId", "==", uid));
                        const snapshotTiles = await getCountFromServer(qTiles);
                        const actualClaims = snapshotTiles.data().count;

                        console.log(`[DEBUG] VerifyStats: User ${uid} has ${actualClaims} tiles (Actual) vs ${data.totalClaims} (Profile)`);

                        if (data.totalClaims !== actualClaims) {
                            console.log(`Fixing totalClaims: ${data.totalClaims} -> ${actualClaims}`);
                            updates.totalClaims = actualClaims;
                        }

                        // 2. Verify Captured Area
                        // Need keys for length, area calculation requires doc reads or a cloud function (using client read for now)
                        // If we had a 'stats' subcollection or aggregation, it'd be cheaper.
                        // For now, reading all captured docs for a user is okay (usually < 100 docs).
                        const qCaptured = query(collection(db, "captured"), where("ownerId", "==", uid));
                        const snapshotCaptured = await getDocs(qCaptured);
                        let actualCapturedTiles = 0;
                        snapshotCaptured.forEach(capturedDoc => {
                            const capturedData = capturedDoc.data();
                            actualCapturedTiles += (capturedData.enclosedSquares?.length || 0);
                        });

                        if (data.totalCaptured !== actualCapturedTiles) {
                            console.log(`Fixing totalCaptured: ${data.totalCaptured} -> ${actualCapturedTiles}`);
                            updates.totalCaptured = actualCapturedTiles;
                        }

                        if (Object.keys(updates).length > 0) {
                            await updateDoc(playerRef, updates);
                        }
                    } catch (e) {
                        console.error("Failed to verify/fix stats", e);
                    }
                };

                // Run verification ONLY ONCE per mount to avoid infinite loop
                // (updateDoc triggers onSnapshot, which would call verifyStats again)
                if (!hasVerifiedStats.current) {
                    hasVerifiedStats.current = true;
                    verifyStats();
                }

                // Self-Healing: Backfill missing cosmetics & rank (Fixes "Undefined" error on legacy apps)
                if (!data.officialFlower || !data.officialBird || !data.rank) {
                    try {
                        console.log("Backfilling missing profile data...");
                        await updateDoc(playerRef, {
                            officialFlower: data.officialFlower || 'Dandelion',
                            officialBird: data.officialBird || 'Pigeon',
                            rank: data.rank || 'Lowly Vassal'
                        });
                    } catch (e) {
                        console.error("Failed to backfill profile data", e);
                    }
                }
            } else {
                // Player doesn't exist - onboarding needed
                setPlayer(null);
            }
        });
        return () => {
            hasVerifiedStats.current = false; // Reset for next mount
            unsub();
        };
    }, [auth.currentUser]);

    // Initialize & Sync Tile Storage
    useEffect(() => {
        if (!auth.currentUser || !player) return;

        const syncLocalTiles = async () => {
            // 1. Load from cache
            const localCount = await TileStorage.getTileCount();

            // 2. Check if sync needed (Naive check: count mismatch)
            // Note: player.totalClaims is the source of truth for "how many I own"
            if (player.totalClaims !== undefined && localCount !== player.totalClaims) {
                console.log(`[TileStorage] Syncing... Local: ${localCount}, Remote: ${player.totalClaims}`);

                // Fetch ALL my tiles from Firestore (Expensive but rare)
                const q = query(collection(db, "tiles"), where("ownerId", "==", auth.currentUser!.uid));
                const snapshot = await getDocs(q);
                const remoteTiles: GameState = {};
                snapshot.forEach(doc => {
                    remoteTiles[doc.id] = doc.data() as Tile;
                });

                // Update Cache
                await TileStorage.syncTiles(remoteTiles);
                console.log(`[TileStorage] Synced ${Object.keys(remoteTiles).length} tiles.`);
            } else {
                console.log(`[TileStorage] Cache is up to date (${localCount} tiles).`);
            }
        };

        syncLocalTiles();
    }, [auth.currentUser, player?.totalClaims]); // Re-run if player stats change (e.g. bought/sold on another device)

    // Listen to Captured Territories (Only for current user)
    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(
            collection(db, "captured"),
            where("ownerId", "==", auth.currentUser.uid)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const newTerritories: Territory[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                newTerritories.push({
                    id: doc.id,
                    ...data
                } as Territory);
            });
            setTerritories(newTerritories);
        });
        return () => unsub();
    }, [auth.currentUser]);

    // Derive capturedBy from territory data (client-side only, no Firestore writes)
    const enrichedClaims = useMemo(() => {
        const result: GameState = { ...claims };
        for (const territory of territories) {
            if (!territory.isActive) continue;
            for (const enclosedKey of territory.enclosedSquares) {
                if (result[enclosedKey]) {
                    // Tile exists — add capturedBy
                    result[enclosedKey] = { ...result[enclosedKey], capturedBy: territory.ownerId };
                } else {
                    // Enclosed tile with no claim doc — create a virtual entry
                    // Use the territory owner's color so it renders as a
                    // transparent version of their chosen color on the map
                    result[enclosedKey] = {
                        ownerId: '',
                        explorerName: territory.explorerName || '',
                        color: territory.color || '',
                        timestamp: 0,
                        geohash: '',
                        latInt: 0,
                        lngInt: 0,
                        capturedBy: territory.ownerId,
                    };
                }
            }
        }
        return result;
    }, [claims, territories]);

    const claimSquare = async (gridKey: string): Promise<{ bonus: number; capturedCount: number }> => {
        if (!player || !auth.currentUser) return { bonus: 0, capturedCount: 0 };
        if (player.balance < 1) {
            alert("Not enough coins!");
            return { bonus: 0, capturedCount: 0 };
        }

        // Check if already owned by someone else
        if (claims[gridKey] && claims[gridKey].ownerId !== player.id) {
            alert(`This square is already owned by ${claims[gridKey].explorerName}!`);
            return { bonus: 0, capturedCount: 0 };
        }

        // Check if tile is captured by another player (permanent capture protection)
        if (enrichedClaims[gridKey]?.capturedBy && enrichedClaims[gridKey].capturedBy !== player.id) {
            alert(`This area is captured territory belonging to another explorer!`);
            return { bonus: 0, capturedCount: 0 };
        }

        // --- Anti-Cheat: Teleportation Guard ---
        // Calculate distance/speed from last claim
        const { lat, lng } = getGridFloats(gridKey); // Get float coords for distance calc
        if (player.lastClaimTimestamp && player.lastClaimLat && player.lastClaimLng) {
            const distance = calculateDistance(player.lastClaimLat, player.lastClaimLng, lat, lng);
            const timeDiff = (Date.now() - player.lastClaimTimestamp) / 1000; // seconds

            if (timeDiff > 0) {
                const speedKmh = (distance / timeDiff) * 3.6;

                // ADAPTIVE THRESHOLDS:
                // 1. Short Distance (< 1km): Strict walking/running limit (20km/h)
                // 2. Long Distance (> 1km): Travel limit (200km/h)
                const maxSpeed = distance < 1000 ? 20 : 200;

                if (speedKmh > maxSpeed) {
                    const limitType = distance < 1000 ? "Walking/Running" : "Travel";

                    if (distance < 1000) {
                        // Strict enforcement for short distance (Walking/Running > 20km/h)
                        alert(`🚫 ${limitType} speed exceeded! (${Math.round(speedKmh)} km/h). Slow down to claim.`);
                        return { bonus: 0, capturedCount: 0 };
                    } else {
                        // DISABLED FOR TESTING: Long distance travel limit (200km/h)
                        console.log(`[TESTING] Travel speed limit bypassed: ${Math.round(speedKmh)} km/h (Limit: ${maxSpeed})`);
                    }
                }
            }
        }

        // --- Optimistic Update Start ---
        const previousPlayer = { ...player };
        const previousClaims = { ...claims };

        // 1. Optimistic Coin Deduct & Stat Increment
        setPlayer(p => p ? ({
            ...p,
            balance: p.balance - 1,
            totalClaims: (p.totalClaims || 0) + 1
        }) : null);

        // 2. Optimistic Tile Claim
        // Store INTEGER coordinates that exactly match the gridKey
        const { latInt, lngInt } = parseGridKey(gridKey);
        const { lat: floatLat, lng: floatLng } = getGridFloats(gridKey); // For geohash only

        const newTile: Tile = {
            ownerId: player.id,
            explorerName: player.explorerName || 'Anonymous',
            color: player.color || '#808080',
            timestamp: Date.now(),
            geohash: getGeohash(floatLat, floatLng),
            latInt,  // Integer coordinates match grid key exactly
            lngInt,
            officialFlower: player.officialFlower || 'Dandelion',
            officialBird: player.officialBird || 'Pigeon',
            ownerRank: player.rank || 'Vassal',
        };
        setClaims(prev => ({ ...prev, [gridKey]: newTile }));
        // --- Optimistic Update End ---

        try {

            const tileRef = doc(db, "tiles", gridKey);
            const playerRef = doc(db, "players", auth.currentUser.uid);

            // Client-side territory detection using OPTIMISTIC claims
            // OPTIMIZATION: Use Local TileStorage instead of Firestore Read
            const allUserClaims = await TileStorage.getAllMyTiles();

            // Add optimistic new tile
            allUserClaims[gridKey] = newTile;

            const enclosedAreas = findEnclosedAreas(allUserClaims, player.id);
            console.log(`[DEBUG] Territory Calc: Found ${enclosedAreas.length} enclosed areas (Scanned ${Object.keys(allUserClaims).length} tiles).`);

            // --- PERMANENT CAPTURE: Diff against existing territories ---
            // Build fingerprints of existing territories (from React state / Firestore listener)
            const existingSignatures = new Set<string>();
            for (const t of territories) {
                const sig = [...t.enclosedSquares].sort().join('|');
                existingSignatures.add(sig);
            }

            // Filter to only genuinely NEW territories
            const newTerritories = enclosedAreas.filter(area => {
                const sig = [...area.enclosedSquares].sort().join('|');
                return !existingSignatures.has(sig);
            });

            const newCapturedTileCount = newTerritories.reduce(
                (sum, area) => sum + area.enclosedSquares.length, 0
            );

            // --- CAPTURE BONUS: ΔX + ΔY formula ---
            const captureBonus = newTerritories.reduce(
                (sum, area) => sum + calculateCaptureBonus(area.enclosedSquares), 0
            );

            console.log(`[DEBUG] Permanent Capture: ${newTerritories.length} new territories (${newCapturedTileCount} new tiles, +${captureBonus} bonus coins). ${territories.length} existing territories unchanged.`);

            await runTransaction(db, async (transaction) => {
                // 1. Safety Check: Ensure tile is still unclaimed
                const tileDoc = await transaction.get(tileRef);
                if (tileDoc.exists()) {
                    throw new Error("Tile already claimed by another explorer!");
                }

                // 1b. Safety Check: Ensure tile is not in an EXCLUDED ZONE
                const excludedZone = isPointInExcludedZone(lat, lng, activeZones);
                if (excludedZone) {
                    if (excludedZone.category === 'sacred') {
                        throw new Error(`Sacred Ground: ${excludedZone.name} cannot be claimed.`);
                    } else if (excludedZone.category === 'sovereign') {
                        throw new Error(`Restricted Zone: ${excludedZone.name} is off-limits.`);
                    } else if (excludedZone.category === 'natural') {
                        throw new Error(`Protected Nature Reserve: ${excludedZone.name}.`);
                    } else {
                        throw new Error(`Restricted Area: ${excludedZone.name} is reserved.`);
                    }
                }

                // 2. Create Tile
                const safeTile = {
                    ...newTile,
                    officialFlower: newTile.officialFlower || 'Dandelion',
                    officialBird: newTile.officialBird || 'Pigeon',
                };

                // Remove undefined keys
                Object.keys(safeTile).forEach(key => (safeTile as any)[key] === undefined && delete (safeTile as any)[key]);

                transaction.set(tileRef, safeTile);

                // 3. Update Player (Balance, Anti-Cheat, Stats, Capture Bonus)
                const playerUpdates: any = {
                    balance: increment(-1 + captureBonus),
                    lastClaimTimestamp: Date.now(),
                    lastClaimLat: lat,
                    lastClaimLng: lng,
                    totalClaims: increment(1)
                };

                // Only increment totalCaptured for genuinely new captures
                if (newCapturedTileCount > 0) {
                    playerUpdates.totalCaptured = increment(newCapturedTileCount);
                }

                transaction.update(playerRef, playerUpdates);
            });

            // Post-transaction: Write ONLY new territories (no delete step!)
            for (const area of newTerritories) {
                const territoryId = `${player.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const territory: Territory = {
                    id: territoryId,
                    ownerId: player.id,
                    explorerName: player.explorerName || 'Anonymous',
                    color: player.color || '#808080',
                    perimeterSquares: area.perimeterSquares,
                    enclosedSquares: area.enclosedSquares,
                    capturedAt: Date.now(),
                    isActive: true
                };
                await setDoc(doc(db, "captured", territoryId), territory);
            }

            // Update Local TileStorage
            await TileStorage.addTile(gridKey, newTile);

            // UPDATE LOCALLY for next check
            setPlayer(prev => prev ? ({
                ...prev,
                balance: prev.balance + captureBonus,  // Add capture bonus to optimistic balance
                lastClaimTimestamp: Date.now(),
                lastClaimLat: lat,
                lastClaimLng: lng,
                totalCaptured: (prev.totalCaptured || 0) + newCapturedTileCount
            }) : null);

            // Check referral milestones (fire-and-forget)
            checkAndAwardReferralMilestones(player.id).catch(e =>
                console.error('[Referral] Milestone check failed:', e)
            );

            return { bonus: captureBonus, capturedCount: newCapturedTileCount };

        } catch (e: any) {
            console.error("Transaction failed, reverting state", e);
            // Revert on failure
            setPlayer(previousPlayer);
            setClaims(previousClaims);

            // Show actual error message if available
            const errorMessage = e?.message || "Unknown error (check connection?)";
            alert(`Unable to Claim Square: ${errorMessage}`);
            return { bonus: 0, capturedCount: 0 };
        }
    };

    const buySquare = async (gridKey: string) => {
        if (!player || !auth.currentUser) return;

        const tile = claims[gridKey];
        if (!tile) return;

        // --- Optimistic Update ---
        const previousClaims = { ...claims };

        setClaims(prev => ({
            ...prev,
            [gridKey]: {
                ...tile,
                ownerId: player.id,
                explorerName: player.explorerName,
                color: player.color,
                timestamp: Date.now()
            }
        }));

        try {
            const tileRef = doc(db, "tiles", gridKey);
            const playerRef = doc(db, "players", player.id);
            const { lat, lng } = getGridFloats(gridKey); // Get floats for lastClaimLat/Lng

            // Using transaction to ensure counters stay in sync
            await runTransaction(db, async (transaction) => {
                // 1. Update Tile
                const safeTile = {
                    ownerId: player.id,
                    explorerName: player.explorerName || 'Anonymous',
                    color: player.color || '#808080',
                    timestamp: Date.now(),
                    geohash: getGeohash(lat, lng),
                    lat,
                    lng,
                    officialFlower: player.officialFlower || 'Dandelion',
                    officialBird: player.officialBird || 'Pigeon',
                    ownerRank: player.rank || 'Vassal',
                };

                // Remove undefined keys
                Object.keys(safeTile).forEach(key => (safeTile as any)[key] === undefined && delete (safeTile as any)[key]);

                transaction.set(tileRef, safeTile);

                // 2. Update Buyer (Me) - Increment totalClaims
                transaction.update(playerRef, {
                    totalClaims: increment(1)
                });

                // 3. Update Seller (if exists) - Decrement totalClaims & Give Coins
                if (tile.ownerId && tile.ownerId !== player.id) {
                    const prevOwnerRef = doc(db, "players", tile.ownerId);
                    transaction.update(prevOwnerRef, {
                        balance: increment(20),
                        totalClaims: increment(-1)
                    });
                }
            });

            // Update Local Storage
            await TileStorage.addTile(gridKey, {
                ...tile,
                ownerId: player.id,
                explorerName: player.explorerName || 'Anonymous',
                color: player.color || '#808080',
                timestamp: Date.now()
            });

            // Client-side optimistic update for player count
            setPlayer(prev => prev ? ({
                ...prev,
                totalClaims: (prev.totalClaims || 0) + 1
            }) : null);

        } catch (e: any) {
            console.error("Buy failed", e);
            setClaims(previousClaims); // Revert optimistic map update

            const errorMessage = e?.message || "Unknown error (check connection?)";
            alert(`Unable to Purchase Square: ${errorMessage}`);
        }
    };



    // Sync Location for Presence
    useEffect(() => {
        if (!auth.currentUser || !userLat || !userLng || isMovingTooFast) return;

        const now = Date.now();
        // Throttle updates: only if moved significantly (handled by parent props)
        // or if it's been > 30s since last update (heartbeat)
        // For now, relies on parent passing updated userLat/userLng

        const currentGridKey = getGridKey(userLat, userLng);
        const playerRef = doc(db, "players", auth.currentUser.uid);

        // Simple fire-and-forget update
        updateDoc(playerRef, {
            currentGridKey,
            lastSeen: now
        }).catch(e => console.error("Presence update failed", e));

    }, [userLat, userLng, isMovingTooFast]);

    const checkRankPromotion = async (gridKey: string) => {
        if (!player || !auth.currentUser) return;

        try {
            // Import dynamically or assume it's available in scope if added to imports
            // For this snippet, I will use the modular SDK pattern
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const requestPromotion = httpsCallable(functions, 'requestPromotion');

            const result = await requestPromotion({ gridKey });
            const data = result.data as any;

            if (data.promoted) {
                alert(data.message);
                // Local state update happens automatically via onSnapshot listener
            } else {
                alert(data.message);
            }

        } catch (e: any) {
            console.error("Rank check failed", e);
            alert(`Failed to verify rank: ${e.message || 'Unknown error'}`);
        }
    };



    const createPlayer = async (explorerName: string, color: string, referralCode?: string) => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const playerRef = doc(db, "players", uid);

        const newPlayer: PlayerState = {
            id: uid,
            explorerName,
            color,
            balance: 100,
            hasCompletedOnboarding: true,
            rank: 'Lowly Vassal',
            officialFlower: 'Dandelion',
            officialBird: 'Pigeon',
            totalClaims: 0,
            totalCaptured: 0,
            ...(referralCode ? { referralCode } : {})
        };

        try {
            await setDoc(playerRef, newPlayer);

            // Apply referral code (fire-and-forget, non-blocking)
            if (referralCode) {
                applyReferralCode(referralCode, uid).catch(e =>
                    console.error('[Referral] Failed to apply code during signup:', e)
                );
            }
        } catch (e) {
            console.error("Failed to create player", e);
            alert("Failed to create profile. Please try again.");
        }
    };

    const updatePlayerProfile = async (
        explorerName: string,
        officialFlower?: string,
        officialBird?: string,
        isDevMode?: boolean
    ) => {
        if (!player || !auth.currentUser) return;

        const uid = auth.currentUser.uid;
        const playerRef = doc(db, "players", uid);

        try {
            // Update player profile only (color is immutable after creation)
            await updateDoc(playerRef, {
                explorerName,
                officialFlower: officialFlower || 'Dandelion',
                officialBird: officialBird || 'Pigeon',
                isDevMode: isDevMode || false
            });
        } catch (e) {
            console.error("Failed to update profile", e);
            alert("Failed to update profile. Please try again.");
        }
    };

    // --- Make Offer Function ---
    const makeOffer = async (tileKey: string, amount: number) => {
        const user = auth.currentUser;
        if (!user || !player) return;

        const tile = claims[tileKey];
        if (!tile) {
            alert("This square is not claimed");
            return;
        }

        if (tile.ownerId === user.uid) {
            alert("You already own this square");
            return;
        }

        if (amount > player.balance) {
            alert(`You only have ${player.balance} coins`);
            return;
        }

        if (amount < 2) {
            alert("Minimum offer is 2 coins");
            return;
        }

        try {
            const offerRef = doc(collection(db, "offers"));
            const offer: Offer = {
                id: offerRef.id,
                tileKey,
                sellerId: tile.ownerId,
                buyerId: user.uid,
                amount,
                status: 'pending',
                createdAt: Date.now()
            };

            await setDoc(offerRef, offer);
            alert(`Offer of ${amount} coins sent to ${tile.explorerName}! 🤝`);
        } catch (e: any) {
            console.error("Failed to make offer", e);
            alert(`Failed to make offer: ${e.message}`);
        }
    };

    // --- Accept Offer ---
    const acceptOffer = async (offerId: string) => {
        const user = auth.currentUser;
        if (!user || !player) return;

        try {
            let acceptedAmount = 0;
            await runTransaction(db, async (transaction) => {
                // 1. Read the offer
                const offerRef = doc(db, 'offers', offerId);
                const offerSnap = await transaction.get(offerRef);
                if (!offerSnap.exists()) throw new Error('Offer not found');
                const offer = offerSnap.data() as Offer;

                if (offer.status !== 'pending') throw new Error('Offer is no longer pending');
                if (offer.sellerId !== user.uid) throw new Error('You are not the seller');
                acceptedAmount = offer.amount;

                // 2. Read tile
                const tileRef = doc(db, 'tiles', offer.tileKey);
                const tileSnap = await transaction.get(tileRef);
                if (!tileSnap.exists()) throw new Error('Tile no longer exists');
                const tile = tileSnap.data() as import('./gameState').Tile;
                if (tile.ownerId !== user.uid) throw new Error('You no longer own this tile');

                // 3. Read buyer
                const buyerRef = doc(db, 'players', offer.buyerId);
                const buyerSnap = await transaction.get(buyerRef);
                if (!buyerSnap.exists()) throw new Error('Buyer account not found');
                const buyer = buyerSnap.data() as import('./gameState').PlayerState;
                if (buyer.balance < offer.amount) throw new Error(`Buyer only has ${buyer.balance} coins now`);

                // 4. Transfer tile ownership
                transaction.update(tileRef, {
                    ownerId: offer.buyerId,
                    explorerName: buyer.explorerName,
                    color: buyer.color,
                    timestamp: Date.now(),
                });

                // 5. Move coins
                transaction.update(buyerRef, {
                    balance: increment(-offer.amount),
                    totalClaims: increment(1),
                });
                transaction.update(doc(db, 'players', user.uid), {
                    balance: increment(offer.amount),
                    totalClaims: increment(-1),
                });

                // 6. Mark this offer accepted
                transaction.update(offerRef, { status: 'accepted' });
            });

            // 7. Batch-reject all other pending offers on the same tile
            const offerDocSnap = await getDocs(query(collection(db, 'offers'), where('id', '==', offerId)));
            const tileKey = offerDocSnap.docs[0]?.data()?.tileKey;
            if (tileKey) {
                const pendingQ = query(collection(db, 'offers'), where('tileKey', '==', tileKey), where('status', '==', 'pending'));
                const pendingSnap = await getDocs(pendingQ);
                const batch = writeBatch(db);
                pendingSnap.docs.forEach(d => batch.update(d.ref, { status: 'rejected' }));
                await batch.commit();
            }

            alert(`✅ Deal done! You received ${acceptedAmount} coins.`);

            // --- Territory Invalidation ---
            // If the sold tile was part of any territory's perimeter, that territory collapses
            if (tileKey) {
                const myTerritoriesQuery = query(
                    collection(db, "captured"),
                    where("ownerId", "==", user.uid)
                );
                const myTerritoriesSnap = await getDocs(myTerritoriesQuery);

                for (const territoryDoc of myTerritoriesSnap.docs) {
                    const territory = territoryDoc.data() as Territory;
                    if (territory.perimeterSquares.includes(tileKey)) {
                        console.log(`[Territory Invalidation] Perimeter tile ${tileKey} sold — collapsing territory ${territoryDoc.id} (${territory.enclosedSquares.length} tiles released)`);

                        // Delete territory doc (capturedBy is derived client-side, no tile cleanup needed)
                        await deleteDoc(territoryDoc.ref);

                        // Decrement totalCaptured
                        await updateDoc(doc(db, "players", user.uid), {
                            totalCaptured: increment(-territory.enclosedSquares.length)
                        });
                    }
                }
            }
        } catch (e: any) {
            console.error('acceptOffer failed', e);
            alert(`Failed to accept offer: ${e.message}`);
        }
    };

    // --- Reject Offer ---
    const rejectOffer = async (offerId: string) => {
        try {
            await updateDoc(doc(db, 'offers', offerId), { status: 'rejected' });
        } catch (e: any) {
            console.error('rejectOffer failed', e);
            alert(`Failed to reject offer: ${e.message}`);
        }
    };

    // --- Promotion Ceremony Stubs (Impl later) ---
    const startPromotionCeremony = async () => {
        console.log("Promotion Ceremony not implemented yet");
    };
    const affirmPromotion = async (_ceremonyId: string) => {
        console.log("Affirmation not implemented yet");
    };
    const completePromotion = async (_ceremonyId: string) => {
        console.log("Completion not implemented yet");
    };

    return {
        claims: enrichedClaims,
        player,
        territories,
        claimSquare,
        buySquare,
        makeOffer,
        acceptOffer,
        rejectOffer,
        createPlayer,
        updatePlayerProfile,
        startPromotionCeremony,
        affirmPromotion,
        completePromotion,
        activeCeremony,
        checkRankPromotion
    };
}
