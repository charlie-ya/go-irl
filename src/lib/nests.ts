import { getFunctions, httpsCallable } from 'firebase/functions';

export interface Nest {
    id: string; // Document ID (which is the ownerId)
    ownerId: string;
    location: {
        latitude: number;
        longitude: number;
    };
    geohash: string;
    title: string;
    establishedAt: number;
    lastMovedAt: number;
    totalUniqueVisitors: number;
    level: 1 | 2 | 3;
}

export interface NestVisit {
    visitorId: string;
    visitorName: string;
    visitedAt: number;
    isFirstVisit: boolean;
}

export async function createOrMoveNest(lat: number, lng: number, geohash: string, title?: string) {
    const functions = getFunctions();
    const call = httpsCallable(functions, 'createOrMoveNest');
    const result = await call({ lat, lng, geohash, title });
    return result.data as { success: boolean; message: string };
}

export async function upgradeNest() {
    const functions = getFunctions();
    const call = httpsCallable(functions, 'upgradeNest');
    const result = await call();
    return result.data as { success: boolean; newLevel: number; cost: number };
}

export async function visitNest(nestId: string, visitorName: string) {
    const functions = getFunctions();
    const call = httpsCallable(functions, 'visitNest');
    const result = await call({ nestId, visitorName });
    return result.data as { success: boolean; visitorReward: number; ownerReward: number; message: string };
}
