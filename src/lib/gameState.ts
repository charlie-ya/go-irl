import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment, getDocs } from 'firebase/firestore';
import { findEnclosedAreas, type Territory } from './captureLogic';

export interface Tile {
    ownerId: string;
    explorerName: string; // Display name for the owner
    color: string;
    timestamp: number;
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

export function useGameState() {
    const [claims, setClaims] = useState<GameState>({});
    const [player, setPlayer] = useState<PlayerState | null>(null);
    const [territories, setTerritories] = useState<Territory[]>([]);

    // Listen to Global Tiles
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "tiles"), (snapshot) => {
            const newClaims: GameState = {};
            snapshot.forEach(doc => {
                newClaims[doc.id] = doc.data() as Tile;
            });
            // Merge with existing to prevent flicker if local state is ahead
            setClaims(prev => ({ ...prev, ...newClaims }));
        });
        return () => unsub();
    }, []);

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
        const newTile: Tile = {
            ownerId: player.id,
            explorerName: player.explorerName,
            color: player.color, // Use optimistic color
            timestamp: Date.now(),
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

            // Check for new territories after claiming
            await detectAndSaveTerritories(player.id, player.explorerName, player.color);

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

            // Transfer to me
            await setDoc(tileRef, {
                ownerId: player.id,
                explorerName: player.explorerName,
                color: player.color,
                timestamp: Date.now()
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

    const detectAndSaveTerritories = async (playerId: string, explorerName: string, color: string) => {
        try {
            // Get current claims
            const tilesSnapshot = await getDocs(collection(db, "tiles"));
            const currentClaims: Record<string, Tile> = {};
            tilesSnapshot.forEach(doc => {
                currentClaims[doc.id] = doc.data() as Tile;
            });

            // Find enclosed areas
            const enclosedAreas = findEnclosedAreas(currentClaims, playerId);

            // Save new territories
            for (const area of enclosedAreas) {
                const territoryId = `${playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const territory: Territory = {
                    id: territoryId,
                    ownerId: playerId,
                    explorerName,
                    color,
                    perimeterSquares: area.perimeterSquares,
                    enclosedSquares: area.enclosedSquares,
                    capturedAt: Date.now(),
                    isActive: true
                };

                await setDoc(doc(db, "territories", territoryId), territory);
            }
        } catch (e) {
            console.error("Failed to detect territories", e);
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

            // Update all tiles owned by this player
            const tilesSnapshot = await getDocs(collection(db, "tiles"));
            const updatePromises: Promise<void>[] = [];

            tilesSnapshot.forEach((tileDoc) => {
                const tile = tileDoc.data() as Tile;
                if (tile.ownerId === uid) {
                    updatePromises.push(
                        updateDoc(doc(db, "tiles", tileDoc.id), {
                            explorerName,
                            color
                        })
                    );
                }
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
