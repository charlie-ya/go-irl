import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Nest, NestVisit } from './nests';

export function useNests() {
    const [nests, setNests] = useState<Nest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const nestsRef = collection(db, 'nests');
        const q = query(nestsRef); // For now, streaming all nests. In production, we should filter by bounds/geohash.

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNests: Nest[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedNests.push({
                    id: doc.id,
                    ownerId: data.ownerId,
                    location: {
                        latitude: typeof data.location.latitude === 'number' ? data.location.latitude : data.location._latitude,
                        longitude: typeof data.location.longitude === 'number' ? data.location.longitude : data.location._longitude
                    },
                    geohash: data.geohash,
                    title: data.title,
                    establishedAt: data.establishedAt,
                    lastMovedAt: data.lastMovedAt,
                    totalUniqueVisitors: data.totalUniqueVisitors || 0,
                    level: data.level || 1
                });
            });
            setNests(fetchedNests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching nests:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { nests, loading };
}

export async function fetchNestVisits(nestId: string): Promise<NestVisit[]> {
    const visitsRef = collection(db, `nests/${nestId}/visits`);
    const snap = await getDocs(visitsRef);
    const visits: NestVisit[] = [];
    snap.forEach(doc => {
        visits.push(doc.data() as NestVisit);
    });
    return visits.sort((a, b) => b.visitedAt - a.visitedAt);
}
