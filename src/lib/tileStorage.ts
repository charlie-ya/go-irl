import { openDB, type DBSchema } from 'idb';
import type { Tile, GameState } from './gameState';

interface GoIRLDB extends DBSchema {
    tiles: {
        key: string;
        value: Tile;
    };
    meta: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'goirl-db';
const DB_VERSION = 1;

export const TileStorage = {
    async getDB() {
        return openDB<GoIRLDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('tiles')) {
                    db.createObjectStore('tiles'); // No keyPath, using out-of-line keys
                }
                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta');
                }
            },
        });
    },

    async init() {
        await this.getDB();
    },

    async addTile(gridKey: string, tile: Tile) {
        const db = await this.getDB();
        await db.put('tiles', tile, gridKey);
    },

    async removeTile(gridKey: string) {
        const db = await this.getDB();
        await db.delete('tiles', gridKey);
    },

    async getAllMyTiles(): Promise<GameState> {
        const db = await this.getDB();
        const keys = await db.getAllKeys('tiles');
        const values = await db.getAll('tiles');

        const gameState: GameState = {};
        keys.forEach((key, index) => {
            if (typeof key === 'string') {
                gameState[key] = values[index];
            }
        });
        return gameState;
    },

    async getTileCount(): Promise<number> {
        const db = await this.getDB();
        return db.count('tiles');
    },

    async clearAll() {
        const db = await this.getDB();
        await db.clear('tiles');
        await db.clear('meta');
    },

    /**
     * Efficiently syncs remote tiles with local cache.
     * Overwrites local cache with remote source of truth.
     */
    async syncTiles(remoteTiles: GameState) {
        const db = await this.getDB();
        const tx = db.transaction('tiles', 'readwrite');
        const store = tx.objectStore('tiles');

        await store.clear();
        for (const [key, value] of Object.entries(remoteTiles)) {
            await store.put(value, key);
        }
        await tx.done;
    }
};
