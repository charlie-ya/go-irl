import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment } from 'firebase/firestore';

export interface Tile {
    ownerId: string;
    color: string;
    timestamp: number;
}

export type GameState = Record<string, Tile>;

export interface PlayerState {
    id: string;
    color: string;
    balance: number;
}

export function useGameState() {
    const [claims, setClaims] = useState<GameState>({});
    const [player, setPlayer] = useState<PlayerState | null>(null);

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
                // Initialize new player if not exists
                const newPlayer: PlayerState = {
                    id: uid,
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
                    balance: 100
                };
                setDoc(playerRef, newPlayer);
            }
        });
        return () => unsub();
    }, [auth.currentUser]);

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
                color: player.color,
                timestamp: Date.now()
            }
        }));

        try {
            const tileRef = doc(db, "tiles", gridKey);

            // Transfer to me
            await setDoc(tileRef, {
                ownerId: player.id,
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

    return {
        claims,
        player,
        claimSquare,
        buySquare
    };
}
