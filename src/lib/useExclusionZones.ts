import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { ExclusionZone } from './exclusionZones';

export function useExclusionZones() {
    const [zones, setZones] = useState<ExclusionZone[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const zonesRef = collection(db, 'zones');
        // Fetch all zones for now. optimization: fetch by viewport or city later.
        // For launch with ~200 zones, fetching all is fine.
        const q = query(zonesRef, where('isActive', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedZones: ExclusionZone[] = [];
            snapshot.forEach((doc) => {
                fetchedZones.push({ id: doc.id, ...doc.data() } as ExclusionZone);
            });
            setZones(fetchedZones);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching exclusion zones:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { zones, loading };
}
