import { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment, getDocs, deleteDoc, query, where, getCountFromServer, runTransaction } from 'firebase/firestore';


import { findEnclosedAreas, type Territory } from './captureLogic';
import { getGeohash, getGeohashWithNeighbors, calculateDistance, TILE_LOAD_RADIUS_METERS, LOCATION_UPDATE_THRESHOLD } from './geohashUtils';
import { parseGridKey, getGridKey } from './gridSystem';
import { TileStorage } from './tileStorage';

export interface Tile {
    ownerId: string;
    explorerName: string; // Display name for the owner
    color: string;
    timestamp: number;
    geohash: string;      // Geohash for spatial queries
    lat: number;          // Latitude for distance calculations
    lng: number;          // Longitude for distance calculations
    officialFlower?: string;
    officialBird?: string;
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
}

export interface PromotionCeremony {
    id: string; // gridKey
    ownerId: string;
    ownerName: string;
    startedAt: number;
    affirmations: string[]; // List of userIds who affirmed
}

export { type Territory };

export function useGameState(userLat?: number, userLng?: number, isMovingTooFast?: boolean) {
    const [claims, setClaims] = useState<GameState>({});
    const [player, setPlayer] = useState<PlayerState | null>(null);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [activeCeremony] = useState<PromotionCeremony | null>(null);
    const lastQueryLocation = useRef<{ lat: number; lng: number } | null>(null);

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
                    // Filter to exact radius
                    const distance = calculateDistance(userLat, userLng, tile.lat, tile.lng);
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
                            alert(`[FIXING STATS] Found ${actualClaims} tiles but profile says ${data.totalClaims}. Updating...`);
                            console.log(`Fixing totalClaims: ${data.totalClaims} -> ${actualClaims}`);
                            updates.totalClaims = actualClaims;
                        }

                        // 2. Verify Captured Area
                        // Need keys for length, area calculation requires doc reads or a cloud function (using client read for now)
                        // If we had a 'stats' subcollection or aggregation, it'd be cheaper.
                        // For now, reading all captured docs for a user is okay (usually < 100 docs).
                        const qCaptured = query(collection(db, "captured"), where("ownerId", "==", uid));
                        const snapshotCaptured = await getDocs(qCaptured);

                        let actualCapturedArea = 0;
                        snapshotCaptured.forEach(doc => {
                            const t = doc.data() as Territory;
                            actualCapturedArea += (t.perimeterSquares?.length || 0) + (t.enclosedSquares?.length || 0);
                        });

                        if (data.totalCaptured !== actualCapturedArea) {
                            console.log(`Fixing totalCaptured: ${data.totalCaptured} -> ${actualCapturedArea}`);
                            updates.totalCaptured = actualCapturedArea;
                        }

                        if (Object.keys(updates).length > 0) {
                            await updateDoc(playerRef, updates);
                        }
                    } catch (e) {
                        console.error("Failed to verify/fix stats", e);
                    }
                };

                // Run verification (debounced or strictly once per mounting isn't needed as effect runs on auth change)
                verifyStats();

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
        return () => unsub();
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

    // Listen to Captured Territories
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "captured"), (snapshot) => {
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
    }, []);

    const claimSquare = async (gridKey: string) => {
        if (!player || !auth.currentUser) return;
        if (player.balance < 1) {
            alert("Not enough coins!");
            return;
        }

        // Check if already owned by someone else
        if (claims[gridKey] && claims[gridKey].ownerId !== player.id) {
            alert(`This square is already owned by ${claims[gridKey].explorerName}!`);
            return;
        }

        // --- Anti-Cheat: Teleportation Guard ---
        // Calculate distance/speed from last claim
        const { lat, lng } = parseGridKey(gridKey); // Parse early for check
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
                        return;
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
        const newTile: Tile = {
            ownerId: player.id,
            explorerName: player.explorerName || 'Anonymous', // Fallback
            color: player.color || '#808080',                // Fallback
            timestamp: Date.now(),
            geohash: getGeohash(lat, lng),
            lat,
            lng,
            officialFlower: player.officialFlower || 'Dandelion',
            officialBird: player.officialBird || 'Pigeon',
        };
        setClaims(prev => ({ ...prev, [gridKey]: newTile }));
        // --- Optimistic Update End ---

        try {

            const tileRef = doc(db, "tiles", gridKey);
            const playerRef = doc(db, "players", auth.currentUser.uid);

            // Client-side territory detection using OPTIMISTIC claims
            // This predicts what territories WILL exist after this transaction

            // FLAW FIX: 'claims' only contains tiles within 200m. 
            // We MUST fetch ALL tiles owned by the player to detect territories properly.
            // OPTIMIZATION: Use Local TileStorage instead of Firestore Read

            // Old Firestore way:
            // const userTilesQuery = query(collection(db, "tiles"), where("ownerId", "==", player.id));
            // const userTilesSnapshot = await getDocs(userTilesQuery);
            // const allUserClaims: GameState = {};
            // userTilesSnapshot.forEach(doc => {
            //     allUserClaims[doc.id] = doc.data() as Tile;
            // });

            // New Local Cache way:
            const allUserClaims = await TileStorage.getAllMyTiles();

            // Add optimistic new tile
            allUserClaims[gridKey] = newTile;

            const enclosedAreas = findEnclosedAreas(allUserClaims, player.id);
            console.log(`[DEBUG] Territory Calc: Found ${enclosedAreas.length} enclosed areas (Scanned ${Object.keys(allUserClaims).length} tiles).`);

            // Calculate Territory Changes (Optimistic & for Transaction)
            const newTerritoryCount = enclosedAreas.length;
            const previousTerritoryCount = territories.length;
            const capturedDiff = newTerritoryCount - previousTerritoryCount;

            await runTransaction(db, async (transaction) => {
                // 1. Safety Check: Ensure tile is still unclaimed
                const tileDoc = await transaction.get(tileRef);
                if (tileDoc.exists()) {
                    throw new Error("Tile already claimed by another explorer!");
                }

                // 2. Create/Update Tile
                // Ensure no undefined values are passed to Firestore
                const safeTile = {
                    ...newTile,
                    officialFlower: newTile.officialFlower || 'Dandelion',
                    officialBird: newTile.officialBird || 'Pigeon',
                    capturedAt: null // Explicit null instead of undefined if needed, though Tile interface doesn't have it.
                };

                // Remove undefined keys just in case (e.g. if interface changes)
                Object.keys(safeTile).forEach(key => (safeTile as any)[key] === undefined && delete (safeTile as any)[key]);

                transaction.set(tileRef, safeTile);

                // 3. Update Player (Balance, Anti-Cheat, Stats)
                const playerUpdates: any = {
                    balance: increment(-1),
                    lastClaimTimestamp: Date.now(),
                    lastClaimLat: lat,
                    lastClaimLng: lng,
                    totalClaims: increment(1)
                };

                if (capturedDiff !== 0) {
                    playerUpdates.totalCaptured = increment(capturedDiff);
                }

                transaction.update(playerRef, playerUpdates);
            });


            // Post-Transaction Territory Sync (Document Management)
            // Ideally part of transaction, but unmanaged deletions via query are hard inside transactions.
            // We rely on the atomic STATS update above for the scoreboard.

            // Delete old territories
            const oldTerritoriesQuery = query(
                collection(db, "captured"),
                where("ownerId", "==", player.id)
            );
            const oldTerritoriesSnapshot = await getDocs(oldTerritoriesQuery);
            const deletePromises = oldTerritoriesSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // Save new territories
            for (const area of enclosedAreas) {
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

            // 4. Update Local TileStorage
            await TileStorage.addTile(gridKey, newTile);


            // UPDATE LOCALLY for next check
            setPlayer(prev => prev ? ({
                ...prev,
                lastClaimTimestamp: Date.now(),
                lastClaimLat: lat,
                lastClaimLng: lng,
                // Stats updated optimistically already, but sync captured if diff
                totalCaptured: (prev.totalCaptured || 0) + capturedDiff
            }) : null);

        } catch (e: any) {
            console.error("Transaction failed, reverting state", e);
            // Revert on failure
            setPlayer(previousPlayer);
            setClaims(previousClaims);

            // Show actual error message if available
            const errorMessage = e?.message || "Unknown error (check connection?)";
            alert(`Unable to Claim Square: ${errorMessage}`);
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
            const { lat, lng } = parseGridKey(gridKey);

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



    const createPlayer = async (explorerName: string, color: string) => {
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
            totalCaptured: 0
        };

        try {
            await setDoc(playerRef, newPlayer);
        } catch (e) {
            console.error("Failed to create player", e);
            alert("Failed to create profile. Please try again.");
        }
    };

    const updatePlayerProfile = async (
        explorerName: string,
        color: string,
        officialFlower?: string,
        officialBird?: string,
        isDevMode?: boolean
    ) => {
        if (!player || !auth.currentUser) return;

        const uid = auth.currentUser.uid;
        const playerRef = doc(db, "players", uid);

        try {
            // Update player profile
            await updateDoc(playerRef, {
                explorerName,
                color,
                officialFlower: officialFlower || 'Dandelion',
                officialBird: officialBird || 'Pigeon',
                isDevMode: isDevMode || false
            });

            // Update all tiles owned by this player using indexed query
            const userTilesQuery = query(
                collection(db, "tiles"),
                where("ownerId", "==", uid)
            );
            const tilesSnapshot = await getDocs(userTilesQuery);
            const updatePromises: Promise<void>[] = [];

            tilesSnapshot.forEach((tileDoc) => {
                updatePromises.push(
                    updateDoc(doc(db, "tiles", tileDoc.id), {
                        explorerName,
                        color,
                        officialFlower,
                        officialBird,
                        isDevMode
                    })
                );
            });

            await Promise.all(updatePromises);
        } catch (e) {
            console.error("Failed to update profile", e);
            alert("Failed to update profile. Please try again.");
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
        claims,
        player,
        territories,
        claimSquare,
        buySquare,
        createPlayer,
        updatePlayerProfile,
        startPromotionCeremony,
        affirmPromotion,
        completePromotion,
        activeCeremony,
        checkRankPromotion
    };
}
