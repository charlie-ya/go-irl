import { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment, getDocs, deleteDoc, query, where, getCountFromServer, runTransaction } from 'firebase/firestore';


import { findEnclosedAreas, type Territory } from './captureLogic';
import { getGeohash, getGeohashWithNeighbors, calculateDistance, TILE_LOAD_RADIUS_METERS, LOCATION_UPDATE_THRESHOLD } from './geohashUtils';
import { parseGridKey, getGridKey } from './gridSystem';

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
    totalClaims?: number;       // Global scoreboard count
    officialFlower?: string;
    officialBird?: string;
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

                // Self-Healing: Backfill totalClaims if missing
                if (data.totalClaims === undefined) {
                    try {
                        console.log("Backfilling totalClaims...");
                        // Use accurate count from server (cost: 1 read per 1000 index items essentially)
                        const q = query(collection(db, "tiles"), where("ownerId", "==", uid));
                        const snapshot = await getCountFromServer(q);
                        const count = snapshot.data().count;
                        await updateDoc(playerRef, { totalClaims: count });
                    } catch (e) {
                        console.error("Failed to backfill totalClaims", e);
                    }
                }
            } else {
                // Player doesn't exist - onboarding needed
                setPlayer(null);
            }
        });
        return () => unsub();
    }, [auth.currentUser]);

    // Listen to Territories
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "territories"), (snapshot) => {
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
                    alert(`🚫 ${limitType} speed exceeded! (${Math.round(speedKmh)} km/h). Slow down to claim.`);
                    return;
                }
            }
        }

        // --- Optimistic Update Start ---
        const previousPlayer = { ...player };
        const previousClaims = { ...claims };

        // 1. Optimistic Coin Deduct
        setPlayer(p => p ? ({ ...p, balance: p.balance - 1 }) : null);

        // 2. Optimistic Tile Claim
        // lat/lng already parsed above for Anti-Cheat
        const newTile: Tile = {
            ownerId: player.id,
            explorerName: player.explorerName,
            color: player.color,
            timestamp: Date.now(),
            geohash: getGeohash(lat, lng),
            lat,
            lng,
            officialFlower: player.officialFlower,
            officialBird: player.officialBird,
        };
        setClaims(prev => ({ ...prev, [gridKey]: newTile }));
        // --- Optimistic Update End ---

        try {

            const tileRef = doc(db, "tiles", gridKey);
            const playerRef = doc(db, "players", auth.currentUser.uid);

            await Promise.all([
                updateDoc(playerRef, {
                    balance: increment(-1),
                    lastClaimTimestamp: Date.now(),
                    lastClaimLat: lat,
                    lastClaimLng: lng
                }),
                setDoc(tileRef, newTile)
            ]);

            // UPDATE LOCALLY for next check
            setPlayer(prev => prev ? ({
                ...prev,
                lastClaimTimestamp: Date.now(),
                lastClaimLat: lat,
                lastClaimLng: lng
            }) : null);

            // Client-side territory detection using already-loaded tiles
            const enclosedAreas = findEnclosedAreas(claims, player.id);

            // Delete old territories for this player before creating new ones
            // This prevents duplication since we recalculate all territories each time
            const oldTerritoriesQuery = query(
                collection(db, "territories"),
                where("ownerId", "==", player.id)
            );
            const oldTerritoriesSnapshot = await getDocs(oldTerritoriesQuery);
            const deletePromises = oldTerritoriesSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // Save any new territories found
            for (const area of enclosedAreas) {
                const territoryId = `${player.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const territory: Territory = {
                    id: territoryId,
                    ownerId: player.id,
                    explorerName: player.explorerName,
                    color: player.color,
                    perimeterSquares: area.perimeterSquares,
                    enclosedSquares: area.enclosedSquares,
                    capturedAt: Date.now(),
                    isActive: true
                };
                await setDoc(doc(db, "territories", territoryId), territory);
            }

        } catch (e) {
            console.error("Transaction failed, reverting state", e);
            // Revert on failure
            setPlayer(previousPlayer);
            setClaims(previousClaims);
            alert("Failed to claim square. Check internet connection.");
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
                transaction.set(tileRef, {
                    ownerId: player.id,
                    explorerName: player.explorerName,
                    color: player.color,
                    timestamp: Date.now(),
                    geohash: getGeohash(lat, lng),
                    lat,
                    lng,
                    officialFlower: player.officialFlower,
                    officialBird: player.officialBird,
                });

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

            // Client-side optimistic update for player count
            setPlayer(prev => prev ? ({
                ...prev,
                totalClaims: (prev.totalClaims || 0) + 1
            }) : null);

        } catch (e) {
            console.error("Buy failed", e);
            setClaims(previousClaims); // Revert optimistic map update
            alert("Failed to purchase square.");
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
            officialBird: 'Pigeon'
        };

        try {
            await setDoc(playerRef, newPlayer);
        } catch (e) {
            console.error("Failed to create player", e);
            alert("Failed to create profile. Please try again.");
        }
    };

    const updatePlayerProfile = async (explorerName: string, color: string, officialFlower?: string, officialBird?: string) => {
        if (!player || !auth.currentUser) return;

        const uid = auth.currentUser.uid;
        const playerRef = doc(db, "players", uid);

        try {
            // Update player profile
            await updateDoc(playerRef, {
                explorerName,
                color,
                officialFlower: officialFlower || 'Dandelion',
                officialBird: officialBird || 'Pigeon'
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
                        officialBird
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
