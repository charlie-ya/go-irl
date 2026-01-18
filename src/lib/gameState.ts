import { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment, getDocs, query, where } from 'firebase/firestore';
import { findEnclosedAreas, type Territory } from './captureLogic';
import { getGeohash, getGeohashWithNeighbors, calculateDistance, TILE_LOAD_RADIUS_METERS, LOCATION_UPDATE_THRESHOLD } from './geohashUtils';
import { parseGridKey } from './gridSystem';

export interface Tile {
    ownerId: string;
    explorerName: string; // Display name for the owner
    color: string;
    timestamp: number;
    geohash: string;      // Geohash for spatial queries
    lat: number;          // Latitude for distance calculations
    lng: number;          // Longitude for distance calculations
}

export type GameState = Record<string, Tile>;

export interface PlayerState {
    id: string;
    explorerName: string; // User-chosen display name
    color: string;
    balance: number;
    hasCompletedOnboarding: boolean;
}

export { type Territory };

export function useGameState(userLat?: number, userLng?: number) {
    const [claims, setClaims] = useState<GameState>({});
    const [player, setPlayer] = useState<PlayerState | null>(null);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const lastQueryLocation = useRef<{ lat: number; lng: number } | null>(null);

    // Listen to Nearby Tiles (200m radius)
    useEffect(() => {
        if (userLat === undefined || userLng === undefined) {
            // No location yet, don't load tiles
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
    }, [userLat, userLng]);

    // Listen to My Player Data
    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const playerRef = doc(db, "players", uid);

        const unsub = onSnapshot(playerRef, (docSnap) => {
            if (docSnap.exists()) {
                setPlayer(docSnap.data() as PlayerState);
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

        // --- Optimistic Update Start ---
        const previousPlayer = { ...player };
        const previousClaims = { ...claims };

        // 1. Optimistic Coin Deduct
        setPlayer(p => p ? ({ ...p, balance: p.balance - 1 }) : null);

        // 2. Optimistic Tile Claim
        const { lat, lng } = parseGridKey(gridKey);
        const newTile: Tile = {
            ownerId: player.id,
            explorerName: player.explorerName,
            color: player.color,
            timestamp: Date.now(),
            geohash: getGeohash(lat, lng),
            lat,
            lng,
        };
        setClaims(prev => ({ ...prev, [gridKey]: newTile }));
        // --- Optimistic Update End ---

        try {
            const tileRef = doc(db, "tiles", gridKey);
            const playerRef = doc(db, "players", auth.currentUser.uid);

            await Promise.all([
                updateDoc(playerRef, {
                    balance: increment(-1)
                }),
                setDoc(tileRef, newTile)
            ]);

            // Client-side territory detection using already-loaded tiles
            const enclosedAreas = findEnclosedAreas(claims, player.id);

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
            const { lat, lng } = parseGridKey(gridKey);

            // Transfer to me
            await setDoc(tileRef, {
                ownerId: player.id,
                explorerName: player.explorerName,
                color: player.color,
                timestamp: Date.now(),
                geohash: getGeohash(lat, lng),
                lat,
                lng,
            });

            if (tile.ownerId && tile.ownerId !== player.id) {
                const prevOwnerRef = doc(db, "players", tile.ownerId);
                updateDoc(prevOwnerRef, { balance: increment(20) }).catch(() => { });
            }

        } catch (e) {
            console.error("Buy failed", e);
            setClaims(previousClaims);
            alert("Failed to purchase square.");
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
            hasCompletedOnboarding: true
        };

        try {
            await setDoc(playerRef, newPlayer);
        } catch (e) {
            console.error("Failed to create player", e);
            alert("Failed to create profile. Please try again.");
        }
    };

    const updatePlayerProfile = async (explorerName: string, color: string) => {
        if (!player || !auth.currentUser) return;

        const uid = auth.currentUser.uid;
        const playerRef = doc(db, "players", uid);

        try {
            // Update player profile
            await updateDoc(playerRef, {
                explorerName,
                color
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
                        color
                    })
                );
            });

            await Promise.all(updatePromises);
        } catch (e) {
            console.error("Failed to update profile", e);
            alert("Failed to update profile. Please try again.");
        }
    };

    return {
        claims,
        player,
        territories,
        claimSquare,
        buySquare,
        createPlayer,
        updatePlayerProfile
    };
}
